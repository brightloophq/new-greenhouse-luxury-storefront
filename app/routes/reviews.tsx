import type {MetaFunction} from 'react-router';
import {HOME_CONTENT} from '~/lib/homeContent';

export const meta: MetaFunction = () => [
  {title: 'Reviews | The New Greenhouse'},
  {name: 'description', content: 'What our customers say about The New Greenhouse.'},
];

/** The ONLY place reviews/testimonials appear. */
export default function Reviews() {
  const t = HOME_CONTENT.classic.testimonials;
  return (
    <div className="home--general">
      <section className="ng-page">
        <p className="ng-page-eyebrow">Reviews</p>
        <h1 className="ng-page-title">{t.title}</h1>
        {t.rating ? (
          <a
            className="greenhouse-rating-badge"
            href={t.rating.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="greenhouse-rating-star" aria-hidden="true">★</span>
            <strong>{t.rating.score}</strong>
            <span>from {t.rating.count} Google reviews</span>
          </a>
        ) : null}
        <div className="greenhouse-testimonial-grid">
          {t.items.map((item) => (
            <figure key={item.name}>
              <blockquote>&ldquo;{item.quote}&rdquo;</blockquote>
              <figcaption>
                <strong>{item.name}</strong>
                <span>{item.context}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
    </div>
  );
}
