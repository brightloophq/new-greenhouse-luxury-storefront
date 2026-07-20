import {Link} from 'react-router';
import {cardImage} from '~/lib/catalogues';

export interface Pathway {
  label: string;
  to: string;
  /** image basename under /public with 400/600/800 webp widths */
  img?: string;
  blurb?: string;
}

/**
 * Image-led pathway cards — the one shared selector used by Home, Wholesale,
 * Retail, Arrangements, Premium/Deluxe, Occasion and Supplies. Concise labels,
 * no marketing paragraphs. Theme-agnostic (green or premium via the route).
 */
export function PathwaySelector({
  id,
  eyebrow,
  title,
  back,
  items,
  columns = 4,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  back?: {to: string; label: string};
  items: Pathway[];
  columns?: 2 | 3 | 4;
}) {
  const headingId = `${id ?? 'pathways'}-title`;
  return (
    <section id={id} className="ng-chooser" aria-labelledby={headingId}>
      <div className="ng-chooser-head">
        {back ? (
          <Link className="ng-shopcat-back" to={back.to} prefetch="intent">
            <span aria-hidden="true">←</span> {back.label}
          </Link>
        ) : null}
        {eyebrow ? <p className="ng-chooser-eyebrow">{eyebrow}</p> : null}
        <h1 id={headingId}>{title}</h1>
      </div>

      <ul
        className={`ng-chooser-grid${columns === 3 ? ' ng-chooser-grid--three' : ''}${columns === 2 ? ' ng-chooser-grid--two' : ''}`}
      >
        {items.map((item) => {
          const media = item.img ? cardImage(item.img) : null;
          return (
            <li key={item.label}>
              <Link className="ng-chooser-card" to={item.to} prefetch="intent">
                <span className="ng-chooser-card-media">
                  {media ? (
                    <img
                      src={media.src}
                      srcSet={media.srcSet}
                      sizes="(min-width: 64em) 24vw, (min-width: 45em) 45vw, 90vw"
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  ) : null}
                </span>
                <span className="ng-chooser-card-body">
                  <span className="ng-chooser-card-title">{item.label}</span>
                  {item.blurb ? (
                    <span className="ng-chooser-card-blurb">{item.blurb}</span>
                  ) : null}
                  <span className="ng-chooser-card-cta" aria-hidden="true">
                    Explore <span className="ng-chooser-card-arrow">→</span>
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
