import {describe, expect, it, vi} from 'vitest';
import {
  getWholesaleAccess,
  isWholesaleApproved,
  normalizeWholesaleStatus,
} from './wholesale';

/**
 * Wholesale access is gated on the owner's manual `custom.wholesale_status`
 * decision. Only "approved" opens the trade catalogue; every other value —
 * including blank, unknown, or a failed read — falls back to "pending". A
 * signed-in customer is NEVER granted wholesale access by default.
 */

describe('normalizeWholesaleStatus', () => {
  it('maps each recognised decision value', () => {
    expect(normalizeWholesaleStatus('approved')).toBe('approved');
    expect(normalizeWholesaleStatus('pending')).toBe('pending');
    expect(normalizeWholesaleStatus('rejected')).toBe('rejected');
    expect(normalizeWholesaleStatus('more_information_required')).toBe(
      'more_information_required',
    );
  });

  it('is tolerant of case and surrounding whitespace', () => {
    expect(normalizeWholesaleStatus(' Approved ')).toBe('approved');
    expect(normalizeWholesaleStatus('REJECTED')).toBe('rejected');
  });

  it('falls back to pending for blank / whitespace / unknown / null', () => {
    expect(normalizeWholesaleStatus('')).toBe('pending');
    expect(normalizeWholesaleStatus('   ')).toBe('pending');
    expect(normalizeWholesaleStatus('something_else')).toBe('pending');
    expect(normalizeWholesaleStatus(null)).toBe('pending');
    expect(normalizeWholesaleStatus(undefined)).toBe('pending');
  });
});

describe('isWholesaleApproved', () => {
  it('is true only for approved', () => {
    expect(isWholesaleApproved('approved')).toBe(true);
    expect(isWholesaleApproved('pending')).toBe(false);
    expect(isWholesaleApproved('rejected')).toBe(false);
    expect(isWholesaleApproved('more_information_required')).toBe(false);
    expect(isWholesaleApproved('guest')).toBe(false);
  });
});

/** A fake Customer Account API: control login + the returned status value. */
function account(opts: {
  loggedIn?: boolean;
  loginThrows?: boolean;
  status?: string | null;
  firstName?: string | null;
  queryThrows?: boolean;
}) {
  return {
    isLoggedIn: vi.fn(async (): Promise<boolean> => {
      if (opts.loginThrows) throw new Error('session error');
      return opts.loggedIn ?? false;
    }),
    query: vi.fn(async () => {
      if (opts.queryThrows) throw new Error('customer account query failed');
      return {
        data: {
          customer: {
            firstName: opts.firstName ?? null,
            metafield:
              opts.status === undefined ? null : {value: opts.status ?? null},
          },
        },
      };
    }),
  };
}

describe('getWholesaleAccess', () => {
  it('is guest when not signed in — never queries the status', async () => {
    const acct = account({loggedIn: false});
    expect(await getWholesaleAccess(acct)).toEqual({access: 'guest'});
    expect(acct.query).not.toHaveBeenCalled();
  });

  it('is guest when the login check itself throws', async () => {
    const acct = account({loginThrows: true});
    expect(await getWholesaleAccess(acct)).toEqual({access: 'guest'});
  });

  it('grants approved access and passes through the first name', async () => {
    const acct = account({loggedIn: true, status: 'approved', firstName: 'Maya'});
    expect(await getWholesaleAccess(acct)).toEqual({
      access: 'approved',
      firstName: 'Maya',
    });
  });

  it('maps each denied status to its own state', async () => {
    for (const status of ['pending', 'rejected', 'more_information_required']) {
      const acct = account({loggedIn: true, status});
      const result = await getWholesaleAccess(acct);
      expect(result.access).toBe(status);
    }
  });

  it('treats a blank / missing status as pending (never auto-approve)', async () => {
    expect((await getWholesaleAccess(account({loggedIn: true, status: ''}))).access).toBe(
      'pending',
    );
    // metafield entirely absent
    expect(
      (await getWholesaleAccess(account({loggedIn: true, status: undefined}))).access,
    ).toBe('pending');
  });

  it('fails closed to pending when the status query throws', async () => {
    const acct = account({loggedIn: true, queryThrows: true});
    expect((await getWholesaleAccess(acct)).access).toBe('pending');
  });
});
