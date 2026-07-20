/**
 * Brand hero — editorial florist style (2026 redesign, owner-directed).
 * Soft warm-cream ground, the wordmark set large in an elegant serif, a heritage
 * line, and a single "Explore More" CTA that smooth-scrolls to the shopping
 * chooser. The arrangement sits on a matching seamless cream ground so it melts
 * into the section. Calm, bright and premium — never dark or dramatic.
 */
export function BrandHero() {
  return (
    <section className="ng-brandhero" aria-labelledby="ng-brandhero-title">
      <div className="ng-brandhero-inner">
        <p className="ng-brandhero-eyebrow">
          <span className="ng-brandhero-rule" aria-hidden="true" />
          Est. 1984 · Kingston, Jamaica
          <span className="ng-brandhero-rule" aria-hidden="true" />
        </p>
        <h1 id="ng-brandhero-title" className="ng-brandhero-wordmark">
          The New Greenhouse
        </h1>
        <p className="ng-brandhero-tagline">
          Fresh flowers, handcrafted arrangements &amp; florist supplies —
          delivered across Kingston, every day.
        </p>
        <a className="ng-brandhero-cta" href="#choose-experience">
          Explore More
          <span className="ng-brandhero-cta-arrow" aria-hidden="true">↓</span>
        </a>
      </div>

      <div className="ng-brandhero-bloom">
        <img
          src="/images/homepage/hero-editorial-1440.webp"
          srcSet="/images/homepage/hero-editorial-768.webp 768w, /images/homepage/hero-editorial-1024.webp 1024w, /images/homepage/hero-editorial-1440.webp 1440w"
          sizes="(min-width: 64em) 64rem, 100vw"
          alt="A lush New Greenhouse arrangement of garden roses, dahlias and hydrangea in soft blush, coral, cream and green"
          width={1440}
          height={960}
          loading="eager"
          decoding="async"
        />
      </div>
    </section>
  );
}
