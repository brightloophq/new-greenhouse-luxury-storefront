import type {ReactNode} from 'react';
import {Image} from '@shopify/hydrogen';
import {
  Breadcrumbs,
  EditorialBlock,
  Heading,
  SectionHeading,
  cx,
  type BreadcrumbItem,
} from '~/components/ui';
import type {CatalogImage} from './types';

/**
 * M4 — Collection hero & merchandising bands.
 *
 * Built on the M2 design system (Banner / EditorialBlock / SectionHeading
 * vocabulary) but authored as first-class catalog components so the collection
 * hero can own a single semantic <h1>. Class prefix: `ng-catalog-*`, defined in
 * `app/styles/catalog/hero.css`. Tokens only — no hardcoded color/space.
 */

/** Runtime guard: a plain Shopify-style image ({url, ...}) vs an arbitrary node. */
function isCatalogImage(value: unknown): value is CatalogImage {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as {url?: unknown}).url === 'string'
  );
}

/** Render either a Hydrogen <Image> (from image data) or a caller-supplied node. */
function renderMedia(
  image: CatalogImage | ReactNode,
  imgClassName: string,
): ReactNode {
  if (isCatalogImage(image)) {
    return (
      <Image
        data={image}
        sizes="100vw"
        className={imgClassName}
        loading="eager"
      />
    );
  }
  return image;
}

/* ==========================================================================
   CollectionHero
   ========================================================================== */

export interface CollectionHeroProps {
  /** Gold overline above the title. */
  eyebrow?: ReactNode;
  /** Collection name — rendered as the page's single <h1>. */
  title: ReactNode;
  /** Short editorial blurb beneath the title. */
  description?: ReactNode;
  /**
   * Optional hero image. Pass Shopify-style `{url, altText}` data (rendered via
   * Hydrogen <Image>) or a ready-made ReactNode. When omitted, a clean,
   * intentional text hero is rendered on the ivory page.
   */
  image?: CatalogImage | ReactNode;
  /** Breadcrumb trail rendered above the hero. */
  breadcrumbs?: BreadcrumbItem[];
  className?: string;
}

/**
 * The hero band for a single collection page. With an image it renders a
 * refined dark-overlaid banner; without one it renders a centered, generously
 * spaced text hero. Either way the title is the page's single <h1>.
 */
export function CollectionHero({
  eyebrow,
  title,
  description,
  image,
  breadcrumbs,
  className,
}: CollectionHeroProps) {
  const hasImage = image != null && image !== false;

  return (
    <div className={cx('ng-catalog-hero-wrap', className)}>
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <Breadcrumbs
          items={breadcrumbs}
          className="ng-catalog-hero-breadcrumbs"
        />
      ) : null}

      {hasImage ? (
        <section className="ng-catalog-hero ng-catalog-hero--media">
          <div className="ng-catalog-hero-media">
            {renderMedia(image, 'ng-catalog-hero-img')}
          </div>
          <div className="ng-catalog-hero-scrim" aria-hidden="true" />
          <div className="ng-catalog-hero-content">
            {eyebrow ? (
              <span className="ng-catalog-hero-eyebrow">{eyebrow}</span>
            ) : null}
            <h1 className="ng-catalog-hero-title">{title}</h1>
            {description ? (
              <p className="ng-catalog-hero-description">{description}</p>
            ) : null}
          </div>
        </section>
      ) : (
        <section className="ng-catalog-hero ng-catalog-hero--text">
          <SectionHeading
            className="ng-catalog-hero-heading"
            eyebrow={eyebrow}
            title={title}
            description={description}
            align="center"
            as={1}
            size="display-l"
          />
        </section>
      )}
    </div>
  );
}

/* ==========================================================================
   MerchandisingBlock
   ========================================================================== */

export interface MerchandisingBlockProps {
  /** Gold overline above the title. */
  eyebrow?: ReactNode;
  /** Band title (rendered as an <h2> — never competes with the hero <h1>). */
  title: ReactNode;
  /** Supporting editorial copy. */
  description?: ReactNode;
  /** Primary/secondary CTAs (pass M2 <Button>/<ButtonLink> nodes). */
  actions?: ReactNode;
  /** Optional media — Shopify `{url, altText}` data or a ReactNode. */
  image?: CatalogImage | ReactNode;
  /** Flip the media/text order (only meaningful when an image is present). */
  reverse?: boolean;
  className?: string;
}

/**
 * A reusable in-catalog editorial/promo band used to break up long product
 * grids (e.g. a "Wholesale by the box" promo). With an image it composes the M2
 * EditorialBlock split; without one it renders a tasteful centered text band on
 * a muted surface. Deliberately restrained — never oversized.
 */
export function MerchandisingBlock({
  eyebrow,
  title,
  description,
  actions,
  image,
  reverse = false,
  className,
}: MerchandisingBlockProps) {
  const hasImage = image != null && image !== false;

  if (hasImage) {
    return (
      <EditorialBlock
        className={cx('ng-catalog-merch', className)}
        media={renderMedia(image, 'ng-catalog-merch-img')}
        eyebrow={eyebrow}
        title={title}
        actions={actions}
        reverse={reverse}
        tone="muted"
        as={2}
      >
        {description}
      </EditorialBlock>
    );
  }

  return (
    <section
      className={cx('ng-catalog-merch', 'ng-catalog-merch--plain', className)}
    >
      <div className="ng-catalog-merch-inner">
        {eyebrow ? (
          <span className="ng-catalog-merch-eyebrow">{eyebrow}</span>
        ) : null}
        <Heading as={2} size="h2" className="ng-catalog-merch-title">
          {title}
        </Heading>
        {description ? (
          <p className="ng-catalog-merch-description">{description}</p>
        ) : null}
        {actions ? (
          <div className="ng-catalog-merch-actions">{actions}</div>
        ) : null}
      </div>
    </section>
  );
}

/* ==========================================================================
   CollectionsGridHeader — hero for the collections INDEX page
   ========================================================================== */

export interface CollectionsGridHeaderProps {
  /** Index page title — rendered as the page's single <h1>. */
  title: ReactNode;
  /** Short editorial blurb. */
  description?: ReactNode;
  /** Overline; defaults to "Browse". */
  eyebrow?: ReactNode;
  className?: string;
}

/**
 * Compact hero for the collections index (listing of collections). Reuses the
 * M2 SectionHeading with a gold "Browse" eyebrow and the page <h1>.
 */
export function CollectionsGridHeader({
  title,
  description,
  eyebrow = 'Browse',
  className,
}: CollectionsGridHeaderProps) {
  return (
    <SectionHeading
      className={cx('ng-catalog-index-header', className)}
      eyebrow={eyebrow}
      title={title}
      description={description}
      align="center"
      as={1}
      size="display-l"
    />
  );
}
