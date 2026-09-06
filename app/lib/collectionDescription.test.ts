import {describe, it, expect} from 'vitest';
import {splitCollectionDescription} from './collectionDescription';

// Proves the concise-hero / rich-body separation the Priority Collection sprint
// depends on: the hero lede is the first paragraph only, the below-grid body is
// everything after it (links preserved), and the lede is never duplicated below.

describe('splitCollectionDescription', () => {
  it('keeps a single-paragraph body as a lede with no below-grid content (live state preserved)', () => {
    const {lede, bodyHtml} = splitCollectionDescription(
      '<p>Bright, joyful flowers to make any birthday feel special.</p>',
    );
    expect(lede).toBe('Bright, joyful flowers to make any birthday feel special.');
    expect(bodyHtml).toBe('');
  });

  it('splits a rich body: first paragraph is the lede, the rest is the below-grid HTML', () => {
    const html =
      '<p>Bright, joyful flowers to make any birthday feel special.</p>' +
      '<p>Our birthday collection is made to celebrate.</p>' +
      '<p>Pair it with our <a href="/collections/anniversary">Anniversary</a> designs.</p>';
    const {lede, bodyHtml} = splitCollectionDescription(html);

    expect(lede).toBe('Bright, joyful flowers to make any birthday feel special.');
    // The hero lede sentence must NOT reappear in the below-grid body.
    expect(bodyHtml).not.toContain('feel special');
    expect(bodyHtml).toContain('made to celebrate');
    // A relative internal link is preserved for rendering below the grid.
    expect(bodyHtml).toContain('href="/collections/anniversary"');
    // No absolute/off-site or claude.ai links leak in.
    expect(bodyHtml).not.toContain('http');
  });

  it('decodes entities and strips inline tags in the lede', () => {
    const {lede} = splitCollectionDescription(
      '<p>Polished flowers &amp; gifts for <em>clients</em> &mdash; offices too.</p><p>More.</p>',
    );
    expect(lede).toBe('Polished flowers & gifts for clients — offices too.');
  });

  it('falls back to the plain description when there is no HTML (planned/empty collections)', () => {
    const {lede, bodyHtml} = splitCollectionDescription(null, 'A concise fallback lede.');
    expect(lede).toBe('A concise fallback lede.');
    expect(bodyHtml).toBe('');
  });

  it('treats un-wrapped text as the lede with no body', () => {
    const {lede, bodyHtml} = splitCollectionDescription('Just a bare sentence.');
    expect(lede).toBe('Just a bare sentence.');
    expect(bodyHtml).toBe('');
  });

  it('returns empty parts for empty input', () => {
    expect(splitCollectionDescription('')).toEqual({lede: '', bodyHtml: ''});
    expect(splitCollectionDescription(undefined, undefined)).toEqual({
      lede: '',
      bodyHtml: '',
    });
  });
});
