import type {ComponentProps} from 'react';
import {Link} from 'react-router';
import {Money} from '@shopify/hydrogen';

/** Minimal product shape rendered by an arrangements catalogue. */
export interface ArrangementProduct {
  id: string;
  handle: string;
  title: string;
  featuredImage?: {
    url: string;
    altText?: string | null;
    width?: number | null;
    height?: number | null;
  } | null;
  priceRange: {minVariantPrice: ComponentProps<typeof Money>['data']};
}

/**
 * Catalogue view for an Arrangements pathway. Concise: a back action, a heading,
 * one optional supporting line, then products. The visual theme (green vs
 * elevated) is applied by the route via `<html data-experience>` — this
 * component is theme-agnostic and reused by every arrangements sub-route.
 */
export function ArrangementsCatalogue({
  eyebrow,
  title,
  sub,
  products,
  back = {to: '/arrangements', label: 'Arrangements'},
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
  products: ArrangementProduct[];
  back?: {to: string; label: string} | null;
}) {
  return (
    <div className="ng-arrcat">
      <div className="ng-arrcat-head">
        {back ? (
          <Link className="ng-arrcat-back" to={back.to} prefetch="intent">
            <span aria-hidden="true">←</span> {back.label}
          </Link>
        ) : null}
        {eyebrow ? <p className="ng-arrcat-eyebrow">{eyebrow}</p> : null}
        <h1 className="ng-arrcat-title">{title}</h1>
        {sub ? <p className="ng-arrcat-sub">{sub}</p> : null}
      </div>

      {products.length ? (
        <ul className="ng-arrcat-grid">
          {products.map((p) => (
            <li key={p.id}>
              <Link
                className="ng-arrcat-card"
                to={`/products/${p.handle}`}
                prefetch="intent"
              >
                <span className="ng-arrcat-card-media">
                  {p.featuredImage ? (
                    <img
                      src={p.featuredImage.url}
                      alt={p.featuredImage.altText ?? p.title}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <span className="ng-arrcat-noimg" aria-hidden="true" />
                  )}
                </span>
                <span className="ng-arrcat-card-title">{p.title}</span>
                <span className="ng-arrcat-card-price">
                  <Money data={p.priceRange.minVariantPrice} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="ng-arrcat-empty">
          New arrangements are being composed for this collection.
        </p>
      )}
    </div>
  );
}
