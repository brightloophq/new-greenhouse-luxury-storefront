// scripts/images/productManifest.mjs — pure helpers for the product-image
// manifest (catalog/product-image-manifest.csv). No IO or network here so they
// can be unit-tested; the generator (products.mjs) does the side effects.

/** Canonical storefront host — product Image Src URLs must be fetchable by Shopify. */
export const CANONICAL_HOST = 'shop.thenewgreenhouseja.com';

/** Minimal RFC4180 parser → array of row objects keyed by the header row. */
export function parseManifest(text) {
  const rows = [];
  let row = [];
  let field = '';
  let i = 0;
  let q = false;
  const t = text;
  while (i < t.length) {
    const c = t[i];
    if (q) {
      if (c === '"') {
        if (t[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        q = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      q = true;
      i++;
      continue;
    }
    if (c === ',') {
      row.push(field);
      field = '';
      i++;
      continue;
    }
    if (c === '\r') {
      i++;
      continue;
    }
    if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i++;
      continue;
    }
    field += c;
    i++;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  if (!rows.length) return [];
  const header = rows[0];
  return rows.slice(1).map((r) => {
    const o = {};
    header.forEach((h, idx) => (o[h] = r[idx] ?? ''));
    return o;
  });
}

/** Where a manifest Filename ("products/foo-1200x1500.jpg") is written on disk. */
export function targetPath(filename) {
  return `public/images/${filename}`;
}

/** The absolute URL Shopify fetches on import — the file served from the canonical host. */
export function publicImageUrl(filename, host = CANONICAL_HOST) {
  return `https://${host}/images/${filename}`;
}

/**
 * The manifest rows that still need generating: Status REQUIRED and not already
 * on disk (unless `force`). `exists(filename)` reports whether the target file is
 * present, so a re-run never regenerates or overwrites finished images.
 */
export function selectRows(rows, {force = false, exists}) {
  return rows.filter(
    (r) =>
      String(r.Status || '').toUpperCase() === 'REQUIRED' &&
      (force || !exists(r.Filename)),
  );
}
