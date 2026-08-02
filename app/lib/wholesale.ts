/**
 * Wholesale access is gated on the owner's MANUAL review decision, recorded in
 * the `custom.wholesale_status` customer metafield in Shopify Admin. Signing in
 * is necessary but NOT sufficient — only an "approved" status opens the trade
 * catalogue and its wholesale pricing. The owner reviews the CRA/TRN from the
 * notification email and sets the status on the customer record; there is no
 * automatic approval.
 *
 * States:
 *   guest                     → not signed in                → sign-in gate
 *   approved                  → owner approved               → wholesale catalogue
 *   pending                   → awaiting review (or blank)   → "under review" notice
 *   rejected                  → owner declined               → rejection notice
 *   more_information_required → owner needs more info         → "contact us" notice
 */

import {WHOLESALE_STATUS_QUERY} from '~/graphql/customer-account/WholesaleApprovalQuery';

/** The four manual-review decision states for a signed-in customer. */
export type WholesaleDecision =
  | 'approved'
  | 'pending'
  | 'rejected'
  | 'more_information_required';

export type WholesaleAccess = 'guest' | WholesaleDecision;

export interface WholesaleAccessResult {
  access: WholesaleAccess;
  firstName?: string;
}

interface WholesaleCustomerAccount {
  isLoggedIn(): Promise<boolean>;
  query(
    query: string,
    options?: {variables?: Record<string, unknown>},
  ): Promise<{
    data?: {
      customer?: {
        firstName?: string | null;
        metafield?: {value?: string | null} | null;
      } | null;
    } | null;
    errors?: unknown;
  }>;
}

/**
 * Normalise a raw metafield value to one of the four decision states. Blank,
 * whitespace, or an unrecognised value all fall back to "pending": a customer
 * is NEVER granted wholesale access by default — only an explicit "approved"
 * opens the door.
 */
export function normalizeWholesaleStatus(
  value: string | null | undefined,
): WholesaleDecision {
  switch ((value ?? '').trim().toLowerCase()) {
    case 'approved':
      return 'approved';
    case 'rejected':
      return 'rejected';
    case 'more_information_required':
      return 'more_information_required';
    case 'pending':
    default:
      return 'pending';
  }
}

/** True only for the single state that may shop wholesale. */
export function isWholesaleApproved(access: WholesaleAccess): boolean {
  return access === 'approved';
}

/**
 * Resolve wholesale access from sign-in + the manual status metafield. A failed
 * status read is treated as "pending" (fail closed — never auto-approve) and
 * logged so a misconfigured metafield is diagnosable rather than silently
 * granting access.
 */
export async function getWholesaleAccess(
  customerAccount: WholesaleCustomerAccount,
): Promise<WholesaleAccessResult> {
  let loggedIn = false;
  try {
    loggedIn = await customerAccount.isLoggedIn();
  } catch {
    loggedIn = false;
  }
  if (!loggedIn) return {access: 'guest'};

  try {
    const {data} = await customerAccount.query(WHOLESALE_STATUS_QUERY);
    const access = normalizeWholesaleStatus(data?.customer?.metafield?.value);
    return {access, firstName: data?.customer?.firstName ?? undefined};
  } catch (error) {

    console.warn('[wholesale] status lookup failed — treating as pending', error);
    return {access: 'pending'};
  }
}
