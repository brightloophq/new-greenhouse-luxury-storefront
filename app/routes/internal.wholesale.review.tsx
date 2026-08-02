import type {CSSProperties} from 'react';
import {
  data,
  Form,
  useActionData,
  useLoaderData,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  type MetaFunction,
} from 'react-router';
import {verifyReviewToken} from '~/lib/wholesaleReviewToken';
import {
  readReviewConfig,
  isDecidable,
  normalizeReviewStatus,
  commitReviewDecision,
} from '~/lib/wholesaleReview';
import {
  createAdminClient,
  readWholesaleReview,
  readWholesaleStatus,
  writeWholesaleDecision,
} from '~/lib/shopifyAdmin';
import {buildReviewUrl} from '~/lib/wholesaleNotify';

/**
 * Internal, staff-only operational route (not a customer page). A signed,
 * expiring token in the email authorises ONE decision for ONE customer.
 *
 * GET  → read-only confirmation page (no mutation — safe for scanners/previews).
 * POST → explicit confirmation performs the Admin API write.
 * The full CRA/TRN appears only on the confirmation page. Admin token + signing
 * secret stay server-side. `noindex` so it never enters search/analytics.
 */
export const meta: MetaFunction = () => [
  {title: 'Wholesale review'},
  {name: 'robots', content: 'noindex, nofollow'},
];

interface PublicDetails {
  businessName: string;
  businessType: string;
  craTrn: string;
  contactEmail: string;
  businessPhone: string;
}

// ── GET: verify token, read details, render the confirmation (read-only) ──────
export async function loader({context, request}: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') ?? '';
  const cfg = readReviewConfig(context.env);
  const verified = await verifyReviewToken(token, cfg.signingSecret);
  if (!verified.valid || !verified.payload) {
    // Diagnostic ONLY: a fixed reason code — never the token, payload, secret,
    // CRA/TRN, or customer id.
    console.warn(`[wholesale] review token invalid: ${verified.reason ?? 'unknown'}`);
    return data({view: 'invalid'} as const);
  }

  const admin = createAdminClient(context.env);
  try {
    const d = await readWholesaleReview(admin, verified.payload.cid);
    const adminUrl = buildReviewUrl(d.customerId, context.env.SHOPIFY_ADMIN_STORE_HANDLE);
    if (!isDecidable(d.wholesaleStatus)) {
      return data({
        view: 'decided' as const,
        status: normalizeReviewStatus(d.wholesaleStatus) || 'pending',
        businessName: d.businessName,
        adminUrl,
      });
    }
    return data({
      view: 'confirm' as const,
      action: verified.payload.act,
      token,
      error: false,
      adminUrl,
      details: publicDetails(d),
    });
  } catch {
    // The token verified — the same "invalid" page here means the Admin API
    // customer read failed (distinct cause). Fixed code, no PII/secret.
    console.warn('[wholesale] review customer read failed: customer_read_failed');
    return data({view: 'invalid'} as const);
  }
}

// ── POST: explicit confirmation → Admin write ────────────────────────────────
export async function action({context, request}: ActionFunctionArgs) {
  const form = await request.formData();
  const token = String(form.get('token') ?? '');
  const formAction = String(form.get('action') ?? '');
  const reason = String(form.get('reason') ?? '').trim();

  const cfg = readReviewConfig(context.env);
  const verified = await verifyReviewToken(token, cfg.signingSecret);
  if (!verified.valid || !verified.payload) {
    console.warn(`[wholesale] review token invalid: ${verified.reason ?? 'unknown'}`);
    return data({view: 'invalid'} as const, {status: 400});
  }
  const {cid, act} = verified.payload;
  // A token authorises exactly one action — an approve token cannot reject.
  if (formAction !== act) {
    console.warn('[wholesale] review action mismatch: action_mismatch');
    return data({view: 'invalid'} as const, {status: 400});
  }

  const admin = createAdminClient(context.env);
  let d;
  try {
    d = await readWholesaleReview(admin, cid);
  } catch {
    console.warn('[wholesale] review customer read failed: customer_read_failed');
    return data({view: 'invalid'} as const, {status: 400});
  }
  const adminUrl = buildReviewUrl(d.customerId, context.env.SHOPIFY_ADMIN_STORE_HANDLE);

  // Reject requires a non-empty reason — re-render the confirm page with an error.
  if (act === 'rejected' && !reason) {
    return data(
      {
        view: 'confirm' as const,
        action: 'rejected' as const,
        token,
        error: true,
        adminUrl,
        details: publicDetails(d),
      },
      {status: 400},
    );
  }

  const result = await commitReviewDecision({
    action: act,
    reason,
    readStatus: async () => d.wholesaleStatus,
    writeDecision: (a, r) => writeWholesaleDecision(admin, cid, a, r),
  });

  if (result.view === 'decided') {
    return data({
      view: 'decided' as const,
      status: result.status ?? 'pending',
      businessName: d.businessName,
      adminUrl,
    });
  }
  if (result.view === 'error') {
    return data({view: 'error' as const, adminUrl}, {status: 200});
  }
  return data({view: 'success' as const, action: act, businessName: d.businessName});
}

function publicDetails(d: {
  businessName: string;
  businessType: string;
  craTrn: string;
  contactEmail: string;
  businessPhone: string;
}): PublicDetails {
  return {
    businessName: d.businessName,
    businessType: d.businessType,
    craTrn: d.craTrn,
    contactEmail: d.contactEmail,
    businessPhone: d.businessPhone,
  };
}

// ── UI (all values rendered via JSX → HTML-escaped by React) ──────────────────
const wrap: CSSProperties = {
  maxWidth: 560,
  margin: '48px auto',
  padding: '0 20px',
  fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif",
  color: '#222',
};
const card: CSSProperties = {
  background: '#fff',
  border: '1px solid #ece7de',
  borderRadius: 6,
  padding: 28,
};

interface ViewState {
  view: string;
  action?: 'approved' | 'rejected';
  token?: string;
  error?: boolean;
  status?: string;
  businessName?: string;
  adminUrl?: string | null;
  details?: PublicDetails;
}

export default function InternalWholesaleReview() {
  const actionData = useActionData<typeof action>();
  const loaderData = useLoaderData<typeof loader>();
  const state = (actionData ?? loaderData) as unknown as ViewState | undefined;

  return (
    <div style={wrap}>
      <div style={{color: '#c8a96a', fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 8}}>
        The New Greenhouse — Wholesale review
      </div>
      <div style={card}>{renderView(state)}</div>
    </div>
  );
}

function renderView(state: ViewState | undefined) {
  if (!state) return <Invalid />;
  switch (state.view) {
    case 'confirm':
      return <Confirm state={state} />;
    case 'success':
      return (
        <div>
          <h1 style={{fontSize: 20}}>
            Wholesale application {state.action === 'approved' ? 'approved' : 'rejected'}.
          </h1>
          <p>
            {state.action === 'approved'
              ? `${state.businessName || 'This business'} now has approved wholesale status.`
              : 'The application status has been updated.'}
          </p>
        </div>
      );
    case 'decided':
      return (
        <div>
          <h1 style={{fontSize: 20}}>This application has already been reviewed.</h1>
          <p>Current status: {state.status}</p>
          {state.adminUrl ? <p><a href={state.adminUrl}>Open the customer in Shopify Admin</a></p> : null}
        </div>
      );
    case 'error':
      return (
        <div>
          <h1 style={{fontSize: 20}}>The status was not updated.</h1>
          <p>Please try again, or open the customer in Shopify Admin to review manually.</p>
          {state.adminUrl ? <p><a href={state.adminUrl}>Open the customer in Shopify Admin</a></p> : null}
        </div>
      );
    case 'invalid':
    default:
      return <Invalid />;
  }
}

function Invalid() {
  return (
    <div>
      <h1 style={{fontSize: 20}}>This review link is invalid or has expired.</h1>
      <p>Open the customer in Shopify Admin to review the application manually.</p>
    </div>
  );
}

function Row({label, value}: {label: string; value: string}) {
  return (
    <tr>
      <td style={{padding: '6px 16px 6px 0', color: '#6b6b6b', fontSize: 13, whiteSpace: 'nowrap', verticalAlign: 'top'}}>{label}</td>
      <td style={{padding: '6px 0', fontSize: 14, fontWeight: 500}}>{value}</td>
    </tr>
  );
}

function Confirm({state}: {state: ViewState}) {
  const isApprove = state.action !== 'rejected';
  const d: PublicDetails = state.details ?? {
    businessName: '',
    businessType: '',
    craTrn: '',
    contactEmail: '',
    businessPhone: '',
  };
  return (
    <div>
      <h1 style={{fontSize: 20, marginTop: 0}}>
        {isApprove ? 'Approve wholesale application?' : 'Reject wholesale application?'}
      </h1>
      <p style={{color: '#4a4a4a', fontSize: 14}}>
        Confirm that you have manually reviewed the submitted business information and CRA/TRN.
      </p>
      <table style={{borderCollapse: 'collapse', margin: '12px 0 20px'}}>
        <tbody>
          <Row label="Business name" value={d.businessName} />
          <Row label="Business type" value={d.businessType} />
          <Row label="Full CRA/TRN" value={d.craTrn} />
          <Row label="Contact email" value={d.contactEmail} />
          <Row label="Current status" value="Pending review" />
        </tbody>
      </table>

      <Form method="POST">
        <input type="hidden" name="token" value={state.token ?? ''} />
        <input type="hidden" name="action" value={state.action ?? 'approved'} />
        {!isApprove ? (
          <label style={{display: 'block', marginBottom: 16}}>
            <span style={{display: 'block', fontSize: 13, marginBottom: 4}}>Rejection reason (required)</span>
            <textarea
              name="reason"
              rows={3}
              required
              aria-invalid={state.error || undefined}
              style={{width: '100%', padding: 8, border: '1px solid #c4c4c4', borderRadius: 6, fontFamily: 'inherit'}}
            />
            {state.error ? (
              <span role="alert" style={{color: '#a02020', fontSize: 12}}>
                A rejection reason is required.
              </span>
            ) : null}
          </label>
        ) : null}

        <div style={{display: 'flex', gap: 12, alignItems: 'center'}}>
          {state.adminUrl ? (
            <a href={state.adminUrl} style={{fontSize: 14}}>Cancel</a>
          ) : (
            <span style={{fontSize: 14, color: '#6b6b6b'}}>Cancel</span>
          )}
          <button
            type="submit"
            style={{
              background: isApprove ? '#4d6a50' : '#8a1f1f',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              padding: '11px 22px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {isApprove ? 'Confirm Approval' : 'Confirm Rejection'}
          </button>
        </div>
      </Form>
    </div>
  );
}
