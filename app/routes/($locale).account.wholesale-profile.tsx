import {
  data,
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  type MetaFunction,
} from 'react-router';
import {
  WHOLESALE_PROFILE_QUERY,
  WHOLESALE_PROFILE_MUTATION,
} from '~/graphql/customer-account/WholesaleProfile';

/**
 * Wholesale business-profile completion (Part 11). The customer is already
 * authenticated (account layout gates this) and already has wholesale access —
 * this collects business details, stored as a single JSON customer metafield
 * (custom.wholesale_profile). No approval, no gating.
 */
export const meta: MetaFunction<typeof loader> = () => [
  {title: 'Business profile | The New Greenhouse'},
];

const BUSINESS_TYPES = [
  'Florist',
  'Wedding planner',
  'Event planner',
  'Funeral home',
  'Hotel',
  'Restaurant',
  'Retail shop',
  'Corporate buyer',
  'Designer/decorator',
  'Other',
];

/** Fields persisted in the profile JSON. */
const FIELDS = [
  'firstName',
  'lastName',
  'businessName',
  'phone',
  'businessType',
  'address',
  'city',
  'deliveryArea',
  'website',
  'frequency',
  'notes',
] as const;
type Field = (typeof FIELDS)[number];
type Profile = Partial<Record<Field, string>>;

const REQUIRED: Field[] = [
  'firstName',
  'lastName',
  'businessName',
  'phone',
  'businessType',
  'address',
  'city',
  'deliveryArea',
];

export async function loader({context}: LoaderFunctionArgs) {
  const {data: d} = await context.customerAccount.query(WHOLESALE_PROFILE_QUERY);
  const c = d?.customer;
  let saved: Profile = {};
  try {
    if (c?.wholesaleProfile?.value)
      saved = JSON.parse(c.wholesaleProfile.value) as Profile;
  } catch {
    saved = {};
  }
  const profile: Profile = {
    firstName: saved.firstName ?? c?.firstName ?? '',
    lastName: saved.lastName ?? c?.lastName ?? '',
    phone: saved.phone ?? c?.phoneNumber?.phoneNumber ?? '',
    businessName: saved.businessName ?? '',
    businessType: saved.businessType ?? '',
    address: saved.address ?? '',
    city: saved.city ?? '',
    deliveryArea: saved.deliveryArea ?? '',
    website: saved.website ?? '',
    frequency: saved.frequency ?? '',
    notes: saved.notes ?? '',
  };
  return data({profile, email: c?.emailAddress?.emailAddress ?? ''});
}

export async function action({context, request}: ActionFunctionArgs) {
  const form = await request.formData();
  const profile: Profile = {};
  for (const f of FIELDS) {
    const v = String(form.get(f) ?? '').trim();
    if (v) profile[f] = v;
  }

  const missing = REQUIRED.filter((f) => !profile[f]);
  if (missing.length) {
    return data({ok: false, missing, error: null}, {status: 400});
  }

  // ownerId is required by metafieldsSet — fetch the authenticated customer id.
  const {data: who} = await context.customerAccount.query(WHOLESALE_PROFILE_QUERY);
  const ownerId = who?.customer?.id;
  if (!ownerId) {
    return data({ok: false, missing: [], error: 'Not signed in.'}, {status: 401});
  }

  const {data: res, errors} = await context.customerAccount.mutate(
    WHOLESALE_PROFILE_MUTATION,
    {
      variables: {
        metafields: [
          {
            ownerId,
            namespace: 'custom',
            key: 'wholesale_profile',
            type: 'json',
            value: JSON.stringify(profile),
          },
        ],
      },
    },
  );

  const userErrors = res?.metafieldsSet?.userErrors ?? [];
  if (errors?.length || userErrors.length) {
    return data(
      {
        ok: false,
        missing: [],
        error:
          userErrors[0]?.message ??
          'We could not save your profile — please try again.',
      },
      {status: 400},
    );
  }

  return data({ok: true, missing: [], error: null});
}

export default function WholesaleProfile() {
  const {profile, email} = useLoaderData<typeof loader>();
  const nav = useNavigation();
  const saving = nav.state !== 'idle';
  const actionData = useActionData<typeof action>();
  const missing = actionData && !actionData.ok ? actionData.missing : [];

  return (
    <div className="ng-wsprofile">
      <div className="ng-wsprofile-head">
        <p className="ng-wsprofile-eyebrow">Wholesale</p>
        <h2 className="ng-wsprofile-title">Your business profile</h2>
        <p className="ng-wsprofile-sub">
          Tell us about your business so we can serve you better. You already
          have wholesale access — this takes a minute.
        </p>
      </div>

      {actionData?.ok ? (
        <p className="ng-wsprofile-success" role="status">
          Saved. Thank you — your business profile is up to date.
        </p>
      ) : null}
      {actionData?.error ? (
        <p className="ng-wsprofile-error" role="alert">
          {actionData.error}
        </p>
      ) : null}
      {missing.length ? (
        <p className="ng-wsprofile-error" role="alert">
          Please complete the required fields.
        </p>
      ) : null}

      <Form method="POST" className="ng-wsprofile-form">
        <div className="ng-wsprofile-grid">
          <Field name="firstName" label="First name" required defaultValue={profile.firstName} />
          <Field name="lastName" label="Last name" required defaultValue={profile.lastName} />
          <Field name="businessName" label="Business name" required defaultValue={profile.businessName} />
          <label className="ng-wsprofile-field">
            <span>
              Business type<span aria-hidden="true"> *</span>
            </span>
            <select name="businessType" required defaultValue={profile.businessType}>
              <option value="">Select…</option>
              {BUSINESS_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <Field name="phone" label="Phone" required defaultValue={profile.phone} type="tel" />
          <label className="ng-wsprofile-field">
            <span>Email</span>
            <input type="email" value={email} readOnly />
          </label>
          <Field name="address" label="Business address" required defaultValue={profile.address} full />
          <Field name="city" label="City / parish" required defaultValue={profile.city} />
          <Field name="deliveryArea" label="Preferred delivery area" required defaultValue={profile.deliveryArea} />
          <Field name="website" label="Website or Instagram (optional)" defaultValue={profile.website} full />
          <Field name="frequency" label="Expected purchasing frequency (optional)" defaultValue={profile.frequency} />
          <Field name="notes" label="Additional notes (optional)" defaultValue={profile.notes} full textarea />
        </div>

        <button type="submit" className="ng-wsprofile-submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save business profile'}
        </button>
      </Form>
    </div>
  );
}

function Field({
  name,
  label,
  required,
  defaultValue,
  type = 'text',
  full,
  textarea,
}: {
  name: string;
  label: string;
  required?: boolean;
  defaultValue?: string;
  type?: string;
  full?: boolean;
  textarea?: boolean;
}) {
  return (
    <label className={`ng-wsprofile-field${full ? ' is-full' : ''}`}>
      <span>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </span>
      {textarea ? (
        <textarea name={name} rows={3} defaultValue={defaultValue} />
      ) : (
        <input
          name={name}
          type={type}
          required={required}
          defaultValue={defaultValue}
        />
      )}
    </label>
  );
}
