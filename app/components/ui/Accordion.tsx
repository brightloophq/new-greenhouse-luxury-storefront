import {
  createContext,
  useCallback,
  useContext,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {cx} from './utils';

type AccordionContextValue = {
  register: (node: HTMLButtonElement | null) => void;
  onHeaderKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
};

const AccordionContext = createContext<AccordionContextValue | null>(null);

export type AccordionProps = React.HTMLAttributes<HTMLDivElement>;

export function Accordion({className, children, ...props}: AccordionProps) {
  const headers = useRef<HTMLButtonElement[]>([]);

  const register = useCallback((node: HTMLButtonElement | null) => {
    if (node && !headers.current.includes(node)) {
      headers.current.push(node);
    }
  }, []);

  const onHeaderKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      const items = headers.current.filter((node) => node.isConnected);
      const current = items.indexOf(event.currentTarget);
      if (current === -1) return;

      let next = -1;
      switch (event.key) {
        case 'ArrowDown':
          next = (current + 1) % items.length;
          break;
        case 'ArrowUp':
          next = (current - 1 + items.length) % items.length;
          break;
        case 'Home':
          next = 0;
          break;
        case 'End':
          next = items.length - 1;
          break;
        default:
          return;
      }
      event.preventDefault();
      items[next]?.focus();
    },
    [],
  );

  return (
    <AccordionContext.Provider value={{register, onHeaderKeyDown}}>
      <div className={cx('ng-accordion', className)} {...props}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

export type AccordionItemProps = Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'title'
> & {
  title: ReactNode;
  defaultOpen?: boolean;
  headingLevel?: 2 | 3 | 4;
};

export function AccordionItem({
  className,
  title,
  children,
  defaultOpen = false,
  headingLevel = 3,
  ...props
}: AccordionItemProps) {
  const context = useContext(AccordionContext);
  const [open, setOpen] = useState(defaultOpen);
  const baseId = useId();
  const buttonId = `${baseId}-trigger`;
  const panelId = `${baseId}-panel`;
  const Heading = `h${headingLevel}` as const;

  return (
    <div className={cx('ng-accordion-item', open && 'is-open', className)} {...props}>
      <Heading className="ng-accordion-header">
        <button
          type="button"
          id={buttonId}
          className="ng-accordion-trigger"
          aria-expanded={open}
          aria-controls={panelId}
          ref={context?.register}
          onKeyDown={context?.onHeaderKeyDown}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="ng-accordion-title">{title}</span>
          <span className="ng-accordion-icon" aria-hidden="true" />
        </button>
      </Heading>
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        className="ng-accordion-panel"
        hidden={!open}
      >
        <div className="ng-accordion-panel-inner">{children}</div>
      </div>
    </div>
  );
}
