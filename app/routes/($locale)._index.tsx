import {Link} from 'react-router';
import type {Route} from './+types/_index';
import {BrandHero} from '~/components/home/BrandHero';
import {ExperienceChooser} from '~/components/home/ExperienceChooser';
import type {ExperienceMode} from '~/lib/experience';
import {HOME_CONTENT} from '~/lib/homeContent';

/** Build a responsive srcSet from a local `…-800.webp` asset path (tiles ship
 * 400/600/800 widths). Returns undefined for other srcs so the browser uses `src`. */
function localSrcSet(src?: string): string | undefined {
  if (!src || !src.includes('-800.webp')) return undefined;
  const base = src.replace('-800.webp', '');
  return `${base}-400.webp 400w, ${base}-600.webp 600w, ${base}-800.webp 800w`;
}

export const meta: Route.MetaFunction = ({data}) => {
  const title = 'The New Greenhouse | Not just a flower, whatever it takes.';
  const description =
    'Fresh flowers, hand-crafted arrangements and professional florist supplies in Kingston, Jamaica — for florists, businesses, gifts and every day.';
  const origin = data?.origin ?? '';
  const image = `${origin}/images/homepage/hero-split-1200.webp`;
  return [
    {title},
    {name: 'description', content: description},
    {property: 'og:type', content: 'website'},
    {property: 'og:title', content: title},
    {property: 'og:description', content: description},
    {property: 'og:url', content: `${origin}/`},
    {property: 'og:site_name', content: 'The New Greenhouse'},
    {property: 'og:image', content: image},
    {name: 'twitter:card', content: 'summary_large_image'},
    {name: 'twitter:title', content: title},
    {name: 'twitter:description', content: description},
    {name: 'twitter:image', content: image},
  ];
};

export async function loader({request}: Route.LoaderArgs) {
  // One green brand — the homepage is static content; no per-experience branch.
  return {origin: new URL(request.url).origin};
}

export default function Homepage() {
  const content = HOME_CONTENT.classic;
  return (
    <div className="home home--general">
      <BrandHero />
      <ExperienceChooser />
      <TileSection content={content.flowers} labelledBy="shop-by-flower-title" />
      <HeritageStory content={content.heritage} />
      <Testimonials content={content.testimonials} />
      <Newsletter content={content.newsletter} />
    </div>
  );
}

function TileSection({
  content,
  labelledBy,
}: {
  content: (typeof HOME_CONTENT)[ExperienceMode]['flowers'];
  labelledBy: string;
}) {
  return (
    <section className="greenhouse-occasions" aria-labelledby={labelledBy}>
      <div className="greenhouse-section-heading">
        <p className="greenhouse-kicker">{content.kicker}</p>
        <h2 id={labelledBy}>{content.title}</h2>
        {content.link ? (
          <Link to={content.link.to}>{content.link.label}</Link>
        ) : null}
      </div>
      <div
        className={
          content.tiles.some((tile) => tile.image)
            ? 'greenhouse-occasion-grid greenhouse-occasion-grid--imaged'
            : 'greenhouse-occasion-grid'
        }
      >
        {content.tiles.map((tile) => (
          <Link
            key={tile.label}
            to={tile.to}
            className={tile.image ? 'greenhouse-occasion-tile--imaged' : undefined}
          >
            {tile.image ? (
              <img
                className="greenhouse-occasion-tile-img"
                src={tile.image}
                srcSet={localSrcSet(tile.image)}
                sizes="(min-width: 64em) 25vw, (min-width: 45em) 33vw, 50vw"
                alt=""
                loading="lazy"
                decoding="async"
              />
            ) : null}
            <span>{tile.label}</span>
            <small>Explore</small>
          </Link>
        ))}
      </div>
    </section>
  );
}

function HeritageStory({
  content,
}: {
  content: (typeof HOME_CONTENT)[ExperienceMode]['heritage'];
}) {
  return (
    <section className="greenhouse-heritage" aria-labelledby="heritage-title">
      <div>
        <p className="greenhouse-kicker">{content.kicker}</p>
        <h2 id="heritage-title">{content.title}</h2>
      </div>
      <p>{content.body}</p>
    </section>
  );
}

function Testimonials({
  content,
}: {
  content: (typeof HOME_CONTENT)[ExperienceMode]['testimonials'];
}) {
  return (
    <section
      className="greenhouse-testimonials"
      aria-labelledby="testimonials-title"
    >
      <div className="greenhouse-section-heading">
        <p className="greenhouse-kicker">{content.kicker}</p>
        <h2 id="testimonials-title">{content.title}</h2>
        {content.rating ? (
          <a
            className="greenhouse-rating-badge"
            href={content.rating.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="greenhouse-rating-star" aria-hidden="true">
              ★
            </span>
            <strong>{content.rating.score}</strong>
            <span>from {content.rating.count} Google reviews</span>
          </a>
        ) : null}
      </div>
      <div className="greenhouse-testimonial-grid">
        {content.items.map((testimonial) => (
          <figure key={testimonial.name}>
            <blockquote>&ldquo;{testimonial.quote}&rdquo;</blockquote>
            <figcaption>
              <strong>{testimonial.name}</strong>
              <span>{testimonial.context}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function Newsletter({
  content,
}: {
  content: (typeof HOME_CONTENT)[ExperienceMode]['newsletter'];
}) {
  return (
    <section className="greenhouse-newsletter" aria-labelledby="newsletter-title">
      <p className="greenhouse-kicker">{content.kicker}</p>
      <h2 id="newsletter-title">{content.title}</h2>
      <p>{content.body}</p>
      <form className="greenhouse-newsletter-form">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          name="email"
          type="email"
          placeholder="Email address"
        />
        <button type="button">Join the list</button>
      </form>
    </section>
  );
}
