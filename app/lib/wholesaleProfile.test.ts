import {describe, expect, it, vi} from 'vitest';
import {isRouteErrorResponse} from 'react-router';
import {
  REQUIRED_PROFILE_KEYS,
  WHOLESALE_PROFILE_FIELDS,
  buildProfileMetafields,
  isProfileComplete,
  missingProfileFields,
  requireWholesaleProfile,
  toProfile,
} from './wholesaleProfile';
import {WHOLESALE_PROFILE_KEYS} from '~/graphql/customer-account/WholesaleProfile';

const COMPLETE = {
  business_name: 'Petal & Stem',
  business_type: 'Florist',
  cra_number: '123456789',
  business_phone: '876-555-0100',
  business_address: '12 Hope Road',
  city_parish: 'Kingston',
  delivery_area: 'Kingston & St. Andrew',
};

function customerAccount(metafields: unknown) {
  return {query: vi.fn().mockResolvedValue({data: {customer: {metafields}}})};
}

describe('wholesale profile schema', () => {
  it('stores each field as its own metafield — never one JSON blob', () => {
    expect(WHOLESALE_PROFILE_FIELDS.map((f) => f.key)).toEqual([
      ...WHOLESALE_PROFILE_KEYS,
    ]);
    for (const field of WHOLESALE_PROFILE_FIELDS) {
      expect(field.type).not.toBe('json');
    }
  });

  it('requires the trade-critical fields, including the CRA/TRN number', () => {
    expect(REQUIRED_PROFILE_KEYS).toEqual([
      'business_name',
      'business_type',
      'cra_number',
      'business_phone',
      'business_address',
      'city_parish',
      'delivery_area',
    ]);
  });
});

describe('buildProfileMetafields (customer-written mutation payload)', () => {
  const OWNER = 'gid://shopify/Customer/42';
  const rows = buildProfileMetafields(OWNER, COMPLETE);

  it('includes cra_number as a customer-written metafield', () => {
    const cra = rows.find((r) => r.key === 'cra_number');
    expect(cra).toEqual({
      ownerId: OWNER,
      namespace: 'custom',
      key: 'cra_number',
      type: 'single_line_text_field',
      value: '123456789',
    });
  });

  it('NEVER includes wholesale_status — that is staff-controlled, set in admin', () => {
    // compared as string: the key type provably cannot be "wholesale_status"
    expect(rows.map((r) => String(r.key)).includes('wholesale_status')).toBe(
      false,
    );
  });

  it('writes only the profile fields, all under the custom namespace', () => {
    expect(rows.map((r) => r.key)).toEqual(
      WHOLESALE_PROFILE_FIELDS.map((f) => f.key),
    );
    expect(rows.every((r) => r.namespace === 'custom')).toBe(true);
    expect(rows.every((r) => r.ownerId === OWNER)).toBe(true);
  });
});

describe('completeness', () => {
  it('treats blank and whitespace values as missing', () => {
    const rows = [
      {key: 'business_name', value: '   '},
      {key: 'business_type', value: 'Florist'},
    ];
    const profile = toProfile(rows);
    expect(profile.business_name).toBeUndefined();
    expect(missingProfileFields(profile)).toContain('business_name');
  });

  it('accepts a fully completed profile', () => {
    expect(isProfileComplete(COMPLETE)).toBe(true);
    expect(missingProfileFields(COMPLETE)).toEqual([]);
  });
});

describe('requireWholesaleProfile', () => {
  const request = new Request('https://example.com/wholesale/flowers?sort=title');

  it('redirects an incomplete buyer back to the form with a return path', async () => {
    const account = customerAccount([{key: 'business_name', value: 'Petal & Stem'}]);
    let thrown: unknown;
    try {
      await requireWholesaleProfile(account, request);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Response);
    const location = (thrown as Response).headers.get('location');
    expect(location).toContain('/account/wholesale-profile');
    expect(location).toContain(encodeURIComponent('/wholesale/flowers?sort=title'));
  });

  it('lets a complete buyer through', async () => {
    const rows = Object.entries(COMPLETE).map(([key, value]) => ({key, value}));
    await expect(
      requireWholesaleProfile(customerAccount(rows), request),
    ).resolves.toMatchObject({business_name: 'Petal & Stem'});
  });

  it('does NOT lock the buyer out when the metafield lookup fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const account = {query: vi.fn().mockRejectedValue(new Error('no access'))};

    await expect(requireWholesaleProfile(account, request)).resolves.toEqual({});
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

// Guards against react-router being tree-shaken out of the test build.
expect(typeof isRouteErrorResponse).toBe('function');
