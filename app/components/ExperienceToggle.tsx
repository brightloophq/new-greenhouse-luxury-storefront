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
 */
export function ExperienceToggle({className}: {className?: string}) {
  const {experience, setExperience} = useExperience();

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
            onClick={() => setExperience(mode)}
          >
            {LABELS[mode]}
          </button>
        );
      })}
    </div>
  );
}
