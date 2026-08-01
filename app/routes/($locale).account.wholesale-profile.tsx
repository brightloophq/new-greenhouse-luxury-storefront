import {
  data,
  Form,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
  useSearchParams,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  type MetaFunction,
} from 'react-router';
import {
  WHOLESALE_PROFILE_QUERY,
  WHOLESALE_PROFILE_MUTATION,
} from '~/graphql/customer-account/WholesaleProfile';
import {
  WHOLESALE_PROFILE_FIELDS,
  buildProfileMetafields,
  missingProfileFields,
  toProfile,
  type WholesaleProfile as Profile,
  type WholesaleProfileField,
} from '~/lib/wholesaleProfile';
import {
  readNotifyConfig,
  sendWholesaleNotificationEmail,
  resolveWholesaleStatus,
  describeMetafieldUserErrors,
  buildReviewUrl,
  processWholesaleSubmission,
} from '~/lib/wholesaleNotify';

/**
 * Wholesale business profile. The customer is authenticated (the account layout
 * gates this) and already has wholesale access — this collects the trade
 * details we need before opening the wholesale catalogue, one typed customer
 * metafield per field.
 */
export const meta: MetaFunction = () => [
  {title: 'Business profile | The New Greenhouse'},
];

export async function loader({context}: LoaderFunctionArgs) {
  const {data: d} = await context.customerAccount.query(WHOLESALE_PROFILE_QUERY);
  const customer = d?.customer;
  const profile = toProfile(customer?.metafields);

  // Seed the phone from the account when the buyer has not set a trade number.
  if (!profile.business_phone && customer?.phoneNumber?.phoneNumber) {
    profile.business_phone = customer.phoneNumber.phoneNumber;
  }

  return data({
    profile,
    email: customer?.emailAddress?.emailAddress ?? '',
    name: [customer?.firstName, customer?.lastName].filter(Boolean).join(' '),
  });
}

export async function action({context, request}: ActionFunctionArgs) {
  const form = await request.formData();
  const profile: Profile = {};
  for (const field of WHOLESALE_PROFILE_FIELDS) {
    const value = String(form.get(field.key) ?? '').trim();
    if (value) profile[field.key] = value;
  }

  const missing = missingProfileFields(profile);
  if (missing.length) {
    return data({ok: false, missing, error: null}, {status: 400});
  }

  // metafieldsSet requires the owner id — read it (plus the contact email and
  // the current review status) from the authenticated session.
  let ownerId: string | undefined;
  let contactEmail = '';
  let currentStatus = '';
  try {
    const {data: who} = await context.customerAccount.query(
      WHOLESALE_PROFILE_QUERY,
    );
    ownerId = who?.customer?.id;
    contactEmail = who?.customer?.emailAddress?.emailAddress ?? '';
    const statusField = (
      who?.customer?.metafields as
        | ({key?: string | null; value?: string | null} | null)[]
        | undefined
    )?.find((m) => m?.key === 'wholesale_status');
    currentStatus = statusField?.value ?? '';
  } catch {
    ownerId = undefined;
  }
  if (!ownerId) {
    return data(
      {
        ok: false,
        missing: [],
        error: 'Your session has expired. Please sign in again to save.',
      },
      {status: 401},
    );
  }
  const oid = ownerId;

  // The customer writes ONLY their own profile fields (including cra_trn_number).
  // wholesale_status is a staff-controlled field with no Customer Account API
  // write access — it is set by staff in Shopify admin, never here.
  const metafields = buildProfileMetafields(oid, profile);

  // Resolve the status for the email only (display, never written): a first or
  // unknown submission → "pending"; an existing staff decision is reflected.
  const status = resolveWholesaleStatus(currentStatus);
  const notifyConfig = readNotifyConfig(context.env);

  // The email carries a "Review in Shopify" deep link when the customer id and
  // store handle are both valid. If it cannot be built, the email still sends
  // (button omitted, plain customer reference kept). Log a fixed, redacted
  // message only — never customer data, CRA/TRN, env values, URLs or keys.
  if (!buildReviewUrl(oid, notifyConfig.adminStoreHandle)) {
    console.warn('[wholesale] review link unavailable');
  }

  // Save → then notify. Email failure never fails the submission (see wholesaleNotify).
  const result = await processWholesaleSubmission({
    saveMetafields: async () => {
      const {data: res, errors} = await context.customerAccount.mutate(
        WHOLESALE_PROFILE_MUTATION,
        {variables: {metafields}},
      );
      const userErrors = res?.metafieldsSet?.userErrors ?? [];
      if (errors?.length || userErrors.length) {
        // Server-side diagnostic: pinpoint the failing metafield index/path.
        // Never contains submitted values, so no CRA/TRN can leak.
        if (userErrors.length) {
          console.error(
            `[wholesale] metafieldsSet userErrors: ${describeMetafieldUserErrors(
              userErrors,
            )}`,
          );
        }
        // Customer-facing message stays generic — no field paths or values.
        return {
          ok: false,
          error: 'We could not save your profile — please try again.',
        };
      }
      return {ok: true};
    },
    sendNotification: () =>
      sendWholesaleNotificationEmail(
        {
          businessName: profile.business_name ?? '',
          businessType: profile.business_type ?? '',
          businessPhone: profile.business_phone ?? '',
          contactEmail,
          craNumber: profile.cra_trn_number ?? '',
          customerId: oid,
          submittedAt: new Date().toISOString(),
          status,
        },
        notifyConfig,
      ),
    logError: (message) => console.error(message),
  });

  if (!result.ok) {
    return data(
      {
        ok: false,
        missing: [],
        error:
          result.error ?? 'We could not save your profile — please try again.',
      },
      {status: 400},
    );
  }

  // Return the buyer to whatever they were trying to reach.
  const to = new URL(request.url).searchParams.get('return');
  if (to?.startsWith('/')) throw redirect(to);

  return data({ok: true, missing: [], error: null});
}

export default function WholesaleProfile() {
  const {profile, email, name} = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const nav = useNavigation();
  const saving = nav.state !== 'idle';
  const actionData = useActionData<typeof action>();
  const missing = new Set(actionData?.ok === false ? actionData.missing : []);
  const gated = Boolean(searchParams.get('return'));

  return (
    <div className="ng-wsprofile">
      <div className="ng-wsprofile-head">
        <p className="ng-wsprofile-eyebrow">Wholesale</p>
        <h2 className="ng-wsprofile-title">Your business profile</h2>
        <p className="ng-wsprofile-sub">
          {gated
            ? 'One step before the trade catalogue — tell us about your business.'
            : 'Keep your trade details current so we can serve you better.'}
          {name ? ` Signed in as ${name}.` : null}
        </p>
      </div>

      {actionData?.ok ? (
        <p className="ng-wsprofile-success" role="status">
          Saved. Your business profile is up to date.
        </p>
      ) : null}
      {actionData?.error ? (
        <p className="ng-wsprofile-error" role="alert">
          {actionData.error}
        </p>
      ) : null}
      {missing.size ? (
        <p className="ng-wsprofile-error" role="alert">
          Please complete the highlighted required fields.
        </p>
      ) : null}

      <Form method="POST" className="ng-wsprofile-form">
        <div className="ng-wsprofile-grid">
          {WHOLESALE_PROFILE_FIELDS.map((field) => (
            <ProfileField
              key={field.key}
              field={field}
              value={profile[field.key] ?? ''}
              invalid={missing.has(field.key)}
            />
          ))}
          <label className="ng-wsprofile-field">
            <span>Email</span>
            <input type="email" value={email} readOnly />
          </label>
        </div>

        <button type="submit" className="ng-wsprofile-submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save business profile'}
        </button>
      </Form>
    </div>
  );
}

function ProfileField({
  field,
  value,
  invalid,
}: {
  field: WholesaleProfileField;
  value: string;
  invalid: boolean;
}) {
  const label = (
    <span>
      {field.label}
      {field.required ? <span aria-hidden="true"> *</span> : null}
    </span>
  );
  const shared = {
    name: field.key,
    required: field.required,
    defaultValue: value,
    'aria-invalid': invalid || undefined,
  };

  return (
    <label
      className={`ng-wsprofile-field${field.full ? ' is-full' : ''}${
        invalid ? ' is-invalid' : ''
      }`}
    >
      {label}
      {field.options ? (
        <select {...shared}>
          <option value="">Select…</option>
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : field.textarea ? (
        <textarea {...shared} rows={3} />
      ) : (
        <input {...shared} type={field.inputType ?? 'text'} />
      )}
      {field.helper ? (
        <span className="ng-wsprofile-helper">{field.helper}</span>
      ) : null}
    </label>
  );
}
