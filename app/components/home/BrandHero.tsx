/**
 * Brand hero for the general (bright, botanical) storefront — 2026 redesign.
 * Full-bleed fresh-florist photograph, the wordmark set large and minimal, and
 * a single "Explore More" call-to-action that smoothly scrolls to the shopping
 * chooser below. Deliberately light and welcoming — no dark luxury aesthetic.
 */
export function BrandHero() {
  return (
    <section className="ng-brandhero" aria-labelledby="ng-brandhero-title">
      <div className="ng-brandhero-media">
        <img
          src="/images/homepage/hero-1280.webp"
          srcSet="/images/homepage/hero-768.webp 768w, /images/homepage/hero-1280.webp 1280w"
          sizes="100vw"
          alt="Fresh premium flower arrangements and lush greenery in the bright New Greenhouse florist studio"
          width={1280}
          height={720}
          loading="eager"
          decoding="async"
        />
        <span className="ng-brandhero-scrim" aria-hidden="true" />
      </div>

      <div className="ng-brandhero-inner">
        <p className="ng-brandhero-eyebrow">Fresh flowers, every day · Kingston since 1984</p>
        <h1 id="ng-brandhero-title" className="ng-brandhero-wordmark">
          The New Greenhouse
        </h1>
        <a className="ng-brandhero-cta" href="#choose-experience">
          Explore More
          <span className="ng-brandhero-cta-arrow" aria-hidden="true">↓</span>
        </a>
      </div>
    </section>
  );
}
