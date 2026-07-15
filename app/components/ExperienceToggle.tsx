import {useExperience} from '~/components/ExperienceProvider';
import {EXPERIENCES, type ExperienceMode} from '~/lib/experience';

const LABELS: Record<ExperienceMode, string> = {
  classic: 'Classic',
  deluxe: 'Deluxe',
};

/**
 * Compact segmented control switching Classic ⇄ Deluxe. Labels are exactly
 * "Classic" / "Deluxe" (never Standard/Luxury/Dark). Accessible: a labelled
 * radio-style group with a visible active state and ≥44px targets on mobile.
 *
 * Switching is a deliberate, clean reset (Part 4): it writes the new experience
 * cookie, then performs a full navigation to the home page ("/"). A hard load
 * — not a soft SPA transition — is what guarantees the production requirements:
 *   • every loader re-runs under the new cookie → a fully re-themed storefront
 *     (header, footer, nav, banners) with zero stale content from the prior one;
 *   • all URL filter/search params are dropped (incompatible filters cleared);
 *   • transient UI (open drawers, menus, quick-view) is torn down;
 *   • the shopper lands on the correct experience home, scrolled to the top.
 * The cart is untouched (server-side session survives the reload).
 */
export function ExperienceToggle({className}: {className?: string}) {
  const {experience, setExperience} = useExperience();

  function switchTo(mode: ExperienceMode) {
    if (mode === experience) return;
    // Persist the choice (cookie + <html data-experience>) before reloading so
    // the home request renders in the new experience immediately.
    setExperience(mode);
    if (typeof window !== 'undefined') {
      try {
        // React Router's <ScrollRestoration> persists per-page scroll in
        // sessionStorage and re-applies it on load. Clear it (and disable
        // browser restoration) so the new experience home opens at the very
        // top — Part 4: "begin at the top of the page".
        window.sessionStorage.removeItem('react-router-scroll-positions');
        window.history.scrollRestoration = 'manual';
      } catch {
        // sessionStorage can throw in privacy modes — non-fatal.
      }
      window.scrollTo(0, 0);
      // Full navigation to home: clears filters/scroll/UI and re-runs every
      // loader under the new cookie. Assign (not replace) so Back still works.
      window.location.assign('/');
    }
  }

  return (
    <div
      className={`ng-exp-toggle${className ? ` ${className}` : ''}`}
      role="group"
      aria-label="Shopping experience"
    >
      <span
        className="ng-exp-toggle-thumb"
        data-active={experience}
        aria-hidden="true"
      />
      {EXPERIENCES.map((mode) => {
        const active = experience === mode;
        return (
          <button
            key={mode}
            type="button"
            className={`ng-exp-toggle-btn${active ? ' is-active' : ''}`}
            aria-pressed={active}
            onClick={() => switchTo(mode)}
          >
            {LABELS[mode]}
          </button>
        );
      })}
    </div>
  );
}
