import {useEffect, useId, useRef, type ComponentProps} from 'react';
import {Image, Money} from '@shopify/hydrogen';
import {ButtonLink, Heading, Icon, PriceBlock, Text} from '~/components/ui';
import type {CatalogMoney, CatalogProduct} from '~/components/catalog/types';

/** CatalogMoney is structurally compatible with Hydrogen's MoneyV2 view-model. */
const asMoney = (money: CatalogMoney) =>
  money as ComponentProps<typeof Money>['data'];

export type QuickViewProps = {
  product: CatalogProduct | null;
  open: boolean;
  onClose: () => void;
};

function truncate(text: string, max = 160) {
  const clean = text.trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max).replace(/\s+\S*$/, '') + '…';
}

/**
 * Accessible, READ-ONLY product preview modal. No cart logic — the primary
 * action links to the full product page. Closes on Esc, scrim click, and the
 * close button; locks body scroll and focuses the close button on open.
 */
export function QuickView({product, open, onClose}: QuickViewProps) {
  const titleId = useId();
  const descId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const isOpen = open && !!product;

  // Esc to close.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  // Body scroll lock while open.
  useEffect(() => {
    if (!isOpen) return;
    const {overflow} = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [isOpen]);

  // Move focus to the close button when the modal opens.
  useEffect(() => {
    if (isOpen) closeRef.current?.focus();
  }, [isOpen]);

  if (!isOpen || !product) return null;

  const {
    handle,
    title,
    vendor,
    featuredImage,
    priceRange,
    compareAtPriceRange,
    availableForSale,
    description,
  } = product;

  const min = priceRange.minVariantPrice;
  const max = priceRange.maxVariantPrice;
  const isRange = min.amount !== max.amount;
  const compareAt = compareAtPriceRange?.minVariantPrice;
  const showCompare =
    compareAt && Number(compareAt.amount) > Number(min.amount);
  const snippet = description ? truncate(description) : '';

  return (
    <div className="ng-catalog-quickview" data-open="true">
      <div
        className="ng-catalog-quickview-scrim"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="ng-catalog-quickview-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={snippet ? descId : undefined}
      >
        <button
          ref={closeRef}
          type="button"
          className="ng-icon-button ng-catalog-quickview-close"
          onClick={onClose}
          aria-label="Close quick view"
        >
          <Icon name="close" />
        </button>

        <div className="ng-catalog-quickview-media">
          {featuredImage ? (
            <Image
              className="ng-catalog-quickview-img"
              data={featuredImage}
              alt={featuredImage.altText ?? title}
              aspectRatio="4/5"
              sizes="(min-width: 768px) 40vw, 90vw"
              loading="eager"
            />
          ) : (
            <span
              className="ng-catalog-quickview-img ng-catalog-card-noimg"
              aria-hidden="true"
            />
          )}
        </div>

        <div className="ng-catalog-quickview-body">
          {vendor ? (
            <span className="ng-label ng-catalog-quickview-vendor">
              {vendor}
            </span>
          ) : null}

          <Heading as={2} size="h3" id={titleId} className="ng-catalog-quickview-title">
            {title}
          </Heading>

          <PriceBlock
            className="ng-catalog-quickview-price"
            size="lg"
            price={
              <>
                {isRange ? (
                  <span className="ng-catalog-price-from">From </span>
                ) : null}
                <Money data={asMoney(min)} />
              </>
            }
            compareAt={showCompare ? <Money data={asMoney(compareAt)} /> : undefined}
          />

          <p
            className={
              'ng-catalog-quickview-availability' +
              (availableForSale === false ? ' is-soldout' : '')
            }
          >
            {availableForSale === false ? 'Currently sold out' : 'In stock'}
          </p>

          {snippet ? (
            <Text
              id={descId}
              tone="secondary"
              className="ng-catalog-quickview-desc"
            >
              {snippet}
            </Text>
          ) : null}

          <ButtonLink
            to={`/products/${handle}`}
            variant="primary"
            onClick={onClose}
            className="ng-catalog-quickview-cta"
          >
            View full details
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
