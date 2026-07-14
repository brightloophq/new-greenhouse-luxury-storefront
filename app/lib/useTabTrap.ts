import {useEffect, type RefObject} from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Traps Tab / Shift+Tab focus within `panelRef` while `active`. Mirrors the
 * trap already built into <Aside>; use it on modal surfaces that manage their
 * own open state (QuickView, FilterDrawer) so focus can't escape to the page
 * behind an `aria-modal` dialog. Escape/scroll-lock/focus-restore are handled
 * by each modal separately.
 */
export function useTabTrap(
  panelRef: RefObject<HTMLElement | null>,
  active: boolean,
) {
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    document.addEventListener(
      'keydown',
      (event: KeyboardEvent) => {
        if (event.key !== 'Tab') return;
        const panel = panelRef.current;
        if (!panel) return;
        const focusables = panel.querySelectorAll<HTMLElement>(FOCUSABLE);
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
      {signal: controller.signal},
    );
    return () => controller.abort();
  }, [active, panelRef]);
}
