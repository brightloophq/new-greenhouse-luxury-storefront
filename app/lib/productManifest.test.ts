import {describe, expect, it} from 'vitest';
// The generator's pure helpers live with the script; import them directly.
// The .mjs module is untyped, so annotate the manifest rows here.
import {
  parseManifest,
  selectRows,
  targetPath,
  publicImageUrl,
  CANONICAL_HOST,
} from '../../scripts/images/productManifest.mjs';

type Row = Record<string, string>;

describe('productManifest helpers', () => {
  it('parses a manifest with quoted, comma-bearing prompts', () => {
    const csv =
      'Handle,Title,Filename,Status,Generation Prompt\n' +
      'long-stem-red-roses,Long-Stem Red Roses,products/long-stem-red-roses-1200x1500.jpg,REQUIRED,"Studio photo, warm ivory background, no text"\n';
    const rows = parseManifest(csv) as Row[];
    expect(rows).toHaveLength(1);
    expect(rows[0].Handle).toBe('long-stem-red-roses');
    expect(rows[0].Filename).toBe('products/long-stem-red-roses-1200x1500.jpg');
    // the comma inside the quoted prompt must not split into extra columns
    expect(rows[0]['Generation Prompt']).toBe(
      'Studio photo, warm ivory background, no text',
    );
  });

  it('targets public/images/<Filename> and a canonical-host URL', () => {
    const f = 'products/glass-cylinder-vase-1200x1500.jpg';
    expect(targetPath(f)).toBe('public/images/products/glass-cylinder-vase-1200x1500.jpg');
    expect(publicImageUrl(f)).toBe(
      `https://${CANONICAL_HOST}/images/products/glass-cylinder-vase-1200x1500.jpg`,
    );
  });

  it('selects REQUIRED rows that are not already on disk', () => {
    const rows: Row[] = [
      {Filename: 'products/a.jpg', Status: 'REQUIRED'},
      {Filename: 'products/b.jpg', Status: 'REQUIRED'},
      {Filename: 'products/c.jpg', Status: 'DONE'},
    ];
    const exists = (f: string) => f === 'products/b.jpg'; // b already generated
    const todo = selectRows(rows, {exists}) as Row[];
    expect(todo.map((r: Row) => r.Filename)).toEqual(['products/a.jpg']); // not b (exists), not c (done)
  });

  it('re-generates existing images only with force', () => {
    const rows: Row[] = [{Filename: 'products/a.jpg', Status: 'REQUIRED'}];
    const exists = () => true;
    expect(selectRows(rows, {exists})).toHaveLength(0);
    expect(selectRows(rows, {force: true, exists})).toHaveLength(1);
  });
});
