// src/metafields.js — load metafield definitions (from metafield-definitions.md)
// and per-product values (from build/metafields-payload.jsonl).
import {readFileSync} from 'node:fs';
import {catalogPath, loadMetafieldDefs} from './catalog-files.js';

/** 20 product metafield definitions, ownerType PRODUCT, namespace custom. */
export function definitions() {
  return loadMetafieldDefs().map((d) => ({...d, ownerType: 'PRODUCT'}));
}

/** Per-product metafield values: [{handle, metafields:[{namespace,key,type,value}]}]. */
export function values() {
  const raw = readFileSync(catalogPath('build', 'metafields-payload.jsonl'), 'utf8');
  return raw
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}
