import {useRef} from 'react';
import type {MetaFunction} from 'react-router';
import {HOME_CONTENT, HOMEPAGE_REVIEW_RATING} from '~/lib/homeContent';
import {useReveal} from '~/lib/useReveal';
import {GlasshouseDivider} from '~/components/GlasshouseDivider';
import {EditorialCrossSell} from '~/components/editorial/EditorialCrossSell';

export const meta: MetaFunction = () => [
  {title: 'Reviews | The New Greenhouse'},
  {name: 'description', content: 'What our customers say about The New Greenhouse.'},
];

/**
 * Reviews — the trust archive, in the editorial page language. The testimonials
 * are the page's existing approved set (HOME_CONTENT.classic.testimonials); the
 * aggregate rating is the REAL Google figure already exported and shown on the
 * homepage (HOMEPAGE_REVIEW_RATING = 4.5 from 44), and the badge and "read all"
 * link point at the live Google listing. Nothing is fabricated — only the
 * presentation changes (a feature quote at scale + supporting quotes). The
 * homepage carousel is untouched.
 */
export default function Reviews() {
  const scope = useRef<HTMLElement>(null);
  useReveal(scope);
  const t = HOME_CONTENT.classic.testimonials;
  const rating = HOMEPAGE_REVIEW_RATING;
  const [feature, ...supporting] = t.items;

  return (
    <section ref={scope} className="ng-info" aria-labelledby="ng-reviews-title">
      <div className="ng-info-inner">
        <div className="ng-info-head" data-reveal-heading>
          <p className="ng-info-eyebrow">Reviews</p>
          <h1 id="ng-reviews-title" className="ng-info-title ng-editorial-title">
            {t.title}
          </h1>
          {rating ? (
            <a
              className="ng-reviews-rating"
              href={rating.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="ng-reviews-rating-star" aria-hidden="true">
                ★
              </span>
              <strong>{rating.score}</strong>
              <span>from {rating.count} Google reviews</span>
            </a>
          ) : null}
        </div>

        <GlasshouseDivider className="ng-info-seam" />

        <div className="ng-reviews-wall">
          {feature ? (
            <figure className="ng-reviews-feature" data-reveal-item>
              <blockquote>&ldquo;{feature.quote}&rdquo;</blockquote>
              <figcaption className="ng-reviews-cite">
                <strong>{feature.name}</strong>
                <span>{feature.context}</span>
              </figcaption>
            </figure>
          ) : null}

          {supporting.length ? (
            <div className="ng-reviews-support">
              {supporting.map((item) => (
                <figure key={item.name} data-reveal-item>
                  <blockquote>&ldquo;{item.quote}&rdquo;</blockquote>
                  <figcaption className="ng-reviews-cite">
                    <strong>{item.name}</strong>
                    <span>{item.context}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : null}
        </div>

        {rating ? (
          <a
            className="ng-reviews-more"
            href={rating.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            Read all {rating.count} reviews on Google{' '}
            <span aria-hidden="true">→</span>
          </a>
        ) : null}

        <EditorialCrossSell
          className="ng-info-cta"
          to="/arrangements"
          linkLabel={
            <>
              See the arrangements <span aria-hidden="true">→</span>
            </>
          }
        >
          <b>Join them.</b> Explore our arrangements, or send flowers today.
        </EditorialCrossSell>
      </div>
    </section>
  );
}
