import {Link} from 'react-router';

export interface EditorialFeature {
  title: string;
  body: string;
}

export interface EditorialPageProps {
  eyebrow: string;
  title: string;
  lead: string;
  /** Size-less base path under /images/pages, e.g. "/images/pages/about-hero". */
  heroImage: string;
  heroAlt: string;
  intro: {heading: string; body: string[]};
  featuresTitle: string;
  features: EditorialFeature[];
  cta: {label: string; to: string; note?: string};
}

const PAGE_WIDTHS = [640, 1024] as const;
const heroSrcSet = (base: string) =>
  PAGE_WIDTHS.map((w) => `${base}-${w}.webp ${w}w`).join(', ');

/**
 * Reusable editorial page — hero, story, offerings, and a single CTA. Content
 * is data-driven so Weddings / Corporate / About share one layout and one set
 * of styles.
 */
export function EditorialPage({
  eyebrow,
  title,
  lead,
  heroImage,
  heroAlt,
  intro,
  featuresTitle,
  features,
  cta,
}: EditorialPageProps) {
  return (
    <div className="ng-editorial">
      <section className="ng-editorial-hero">
        <img
          className="ng-editorial-hero-img"
          src={`${heroImage}-1024.webp`}
          srcSet={heroSrcSet(heroImage)}
          sizes="100vw"
          alt={heroAlt}
          width={1600}
          height={900}
          loading="eager"
          decoding="async"
        />
        <div className="ng-editorial-hero-overlay" />
        <div className="ng-editorial-hero-copy">
          <p className="ng-editorial-eyebrow">{eyebrow}</p>
          <h1 className="ng-editorial-title">{title}</h1>
          <p className="ng-editorial-lead">{lead}</p>
          <Link className="ng-editorial-cta" to={cta.to} prefetch="intent">
            {cta.label}
          </Link>
        </div>
      </section>

      <section className="ng-editorial-intro" aria-label={intro.heading}>
        <h2 className="ng-editorial-intro-heading">{intro.heading}</h2>
        <div className="ng-editorial-intro-body">
          {intro.body.map((p) => (
            <p key={p.slice(0, 40)}>{p}</p>
          ))}
        </div>
      </section>

      <section className="ng-editorial-features" aria-label={featuresTitle}>
        <h2 className="ng-editorial-features-title">{featuresTitle}</h2>
        <ul className="ng-editorial-feature-grid">
          {features.map((f) => (
            <li key={f.title} className="ng-editorial-feature">
              <h3 className="ng-editorial-feature-title">{f.title}</h3>
              <p className="ng-editorial-feature-body">{f.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="ng-editorial-band">
        <p className="ng-editorial-band-note">{cta.note}</p>
        <Link className="ng-editorial-cta ng-editorial-cta-light" to={cta.to} prefetch="intent">
          {cta.label}
        </Link>
      </section>
    </div>
  );
}
