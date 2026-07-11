import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {useId} from 'react';
import {IconButton, Icon} from '~/components/ui';

type AsideType = 'search' | 'cart' | 'mobile' | 'closed';
type AsidePosition = 'right' | 'left' | 'top';
type AsideContextValue = {
  type: AsideType;
  open: (mode: AsideType) => void;
  close: () => void;
};

/**
 * A luxury slide-in drawer / overlay with scrim, focus management and body-scroll lock.
 * @example
 * ```jsx
 * <Aside type="cart" heading="Your cart" position="right"> … </Aside>
 * ```
 */
export function Aside({
  children,
  heading,
  type,
  position = 'right',
}: {
  children?: React.ReactNode;
  type: AsideType;
  heading: React.ReactNode;
  position?: AsidePosition;
}) {
  const {type: activeType, close} = useAside();
  const expanded = type === activeType;
  const id = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  // Escape to close + focus trap while open.
  useEffect(() => {
    if (!expanded) return;
    const controller = new AbortController();
    const {signal} = controller;

    document.addEventListener(
      'keydown',
      (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          close();
          return;
        }
        if (event.key !== 'Tab') return;
        const panel = panelRef.current;
        if (!panel) return;
        const focusables = panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      },
      {signal},
    );
    return () => controller.abort();
  }, [close, expanded]);

  // Lock body scroll while any drawer is open; move focus into the panel and back.
  useEffect(() => {
    if (!expanded) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    document.documentElement.classList.add('ng-scroll-locked');
    // Move focus into the dialog once it has painted (a11y: dialogs take focus).
    const timer = setTimeout(() => {
      const panel = panelRef.current;
      const target =
        panel?.querySelector<HTMLElement>('[data-autofocus]') ??
        panel?.querySelector<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ??
        panel;
      target?.focus();
    }, 60);
    return () => {
      clearTimeout(timer);
      document.documentElement.classList.remove('ng-scroll-locked');
      restoreFocusRef.current?.focus?.();
    };
  }, [expanded]);

  return (
    <div
      className={`ng-drawer-overlay ${expanded ? 'is-open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={id}
      aria-hidden={expanded ? undefined : true}
    >
      <button
        className="ng-drawer-scrim"
        tabIndex={-1}
        aria-hidden="true"
        onClick={close}
      />
      <div
        className="ng-drawer"
        data-position={position}
        ref={panelRef}
        tabIndex={-1}
      >
        <header className="ng-drawer-header">
          <h2 id={id} className="ng-drawer-heading">
            {heading}
          </h2>
          <IconButton
            className="ng-drawer-close"
            onClick={close}
            aria-label="Close"
          >
            <Icon name="close" />
          </IconButton>
        </header>
        <div className="ng-drawer-body">{children}</div>
      </div>
    </div>
  );
}

const AsideContext = createContext<AsideContextValue | null>(null);

Aside.Provider = function AsideProvider({children}: {children: ReactNode}) {
  const [type, setType] = useState<AsideType>('closed');

  return (
    <AsideContext.Provider
      value={{
        type,
        open: setType,
        close: () => setType('closed'),
      }}
    >
      {children}
    </AsideContext.Provider>
  );
};

export function useAside() {
  const aside = useContext(AsideContext);
  if (!aside) {
    throw new Error('useAside must be used within an AsideProvider');
  }
  return aside;
}
