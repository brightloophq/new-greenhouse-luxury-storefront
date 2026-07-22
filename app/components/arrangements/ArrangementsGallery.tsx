import {useRef} from 'react';
import type {ReactNode} from 'react';
import {useReveal} from '~/lib/useReveal';
import {focalStyle} from '~/lib/focalPoint';
import {cardImage} from '~/lib/catalogues';
import {EditorialSectionHeader} from '~/components/editorial/EditorialSectionHeader';
import {EditorialPanel} from '~/components/editorial/EditorialPanel';
import {EditorialCrossSell} from '~/components/editorial/EditorialCrossSell';

/**
 * ArrangementsGallery — the signature editorial gallery shared by the three
 * arrangements landing rooms (the hub, the occasion exhibition, the deluxe room).
 * Composed entirely from the existing editorial primitives; the `.ng-arr-*` rules
 * (green by default, elevated under `[data-experience='deluxe']`) carry the look.
 *
 * Presentation only — every destination is passed in; nothing here touches
 * loaders, queries, routing or product logic.
 */
export interface ArrangementItem {
  label: string;
  to: string;
  /** Public image base (…-{400,600,800}.webp on disk). */
  img: string;
  kicker: string;
  blurb: string;
}

export interface ArrangementsGalleryProps {
  eyebrow: string;
  titleId: string;
  title: ReactNode;
  lede: ReactNode;
  back: {to: string; label: string};
  items: ArrangementItem[];
  /** img `sizes` for the panels. */
  sizes: string;
  /** Suppress the panel blurb — an exhibition of labels (e.g. occasions). */
  labelsOnly?: boolean;
  /** The "Explore"/"Enter" cue text. */
  cue?: ReactNode;
  xsell?: {to: string; linkLabel: ReactNode; children: ReactNode};
}

export function ArrangementsGallery({
  eyebrow,
  titleId,
  title,
  lede,
  back,
  items,
  sizes,
  labelsOnly = false,
  cue = 'Explore',
  xsell,
}: ArrangementsGalleryProps) {
  const scope = useRef<HTMLElement>(null);
  useReveal(scope);

  return (
    <section
      ref={scope}
      className={`ng-arr${labelsOnly ? ' ng-arr--labels' : ''}`}
      aria-labelledby={titleId}
    >
      <EditorialSectionHeader
        prefix="ng-arr"
        titleId={titleId}
        back={back}
        eyebrow={eyebrow}
        title={title}
        lede={lede}
      />

      <ol className="ng-arr-depts">
        {items.map((item) => {
          const media = cardImage(item.img);
          return (
            <li key={item.to} className="ng-arr-dept" data-reveal-item>
              <EditorialPanel
                className="ng-arr-panel"
                to={item.to}
                src={media.src}
                srcSet={media.srcSet}
                sizes={sizes}
                style={focalStyle(item.img)}
                kicker={item.kicker}
                title={item.label}
                blurb={item.blurb}
                cue={cue}
              />
            </li>
          );
        })}
      </ol>

      {xsell ? (
        <EditorialCrossSell
          className="ng-arr-xsell"
          to={xsell.to}
          linkLabel={xsell.linkLabel}
        >
          {xsell.children}
        </EditorialCrossSell>
      ) : null}
    </section>
  );
}
