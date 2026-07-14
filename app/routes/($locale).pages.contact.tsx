import {useLoaderData} from 'react-router';
import type {Route} from './+types/($locale).pages.contact';
import {
  ButtonLink,
  Container,
  Icon,
  Section,
  SectionHeading,
  Text,
  TrustGrid,
  TrustItem,
  CTA,
} from '~/components/ui';
import {CollectionHero} from '~/components/catalog/CollectionHero';
import {getExperienceFromRequest} from '~/lib/experience';
import {CONTACT, DELIVERY_CUTOFF_SHORT} from '~/lib/companyContent';

export const meta: Route.MetaFunction = () => [
  {title: 'Contact | The New Greenhouse, Kingston Jamaica'},
  {
    name: 'description',
    content: `Contact The New Greenhouse — call, WhatsApp or email us, or visit ${CONTACT.address.full}. Fresh flowers, arrangements and wholesale floral supply in Kingston.`,
  },
  {tagName: 'link', rel: 'canonical', href: '/pages/contact'},
];

export async function loader({request}: Route.LoaderArgs) {
  return {experience: getExperienceFromRequest(request)};
}

export default function ContactPage() {
  const {experience} = useLoaderData<typeof loader>();
  const isDeluxe = experience === 'deluxe';

  return (
    <div className={`ng-experience ng-experience--${experience} ng-delivery`}>
      <CollectionHero
        eyebrow="Contact"
        title={
          isDeluxe
            ? 'Let’s send something beautiful.'
            : 'Contact the store.'
        }
        description={
          isDeluxe
            ? 'Call, WhatsApp or email us for gifting help, custom arrangements, corporate orders or a question about a delivery — we’re happy to help.'
            : 'Call, WhatsApp or email us, or visit us in Kingston — for wholesale orders, floral supplies, availability and delivery.'
        }
        breadcrumbs={[{label: 'Home', to: '/'}, {label: 'Contact'}]}
      />

      {/* Ways to reach us */}
      <Section spacing="compact" aria-labelledby="contact-methods">
        <Container size="lg">
          <SectionHeading id="contact-methods" eyebrow="Get in touch" title="Ways to reach us." />
          <ul className="ng-delivery-list">
            {CONTACT.phones.map((phone) => (
              <li key={phone.href}>
                <Icon name="phone" size="sm" /> <a href={phone.href}>{phone.display}</a>
              </li>
            ))}
            <li>
              <Icon name="whatsapp" size="sm" />{' '}
              <a href={CONTACT.whatsapp.href} target="_blank" rel="noreferrer">
                Message us on WhatsApp
              </a>
            </li>
            <li>
              <Icon name="mail" size="sm" />{' '}
              <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
            </li>
          </ul>
        </Container>
      </Section>

      {/* Visit us */}
      <Section spacing="compact" aria-labelledby="contact-visit">
        <Container size="lg">
          <SectionHeading id="contact-visit" eyebrow="Visit" title="Find us in Kingston." />
          <address className="ng-delivery-contact">
            <p>
              <strong>The New Greenhouse</strong>
              <br />
              {CONTACT.address.line1}
              <br />
              {CONTACT.address.line2}
            </p>
          </address>
          <Text size="body">
            Prefer to plan a delivery? See where we deliver, timing and fees on our{' '}
            <a className="ng-link-underline" href="/pages/delivery-information">
              delivery information
            </a>{' '}
            page. Same-day across Kingston &amp; St. Andrew for orders before {DELIVERY_CUTOFF_SHORT}.
          </Text>
        </Container>
      </Section>

      {/* Quick contact strip */}
      <Section spacing="compact">
        <Container size="lg">
          <TrustGrid aria-label="Contact at a glance">
            <TrustItem icon={<Icon name="phone" size="sm" />} label={CONTACT.phones[0].display} />
            <TrustItem icon={<Icon name="whatsapp" size="sm" />} label="WhatsApp welcome" />
            <TrustItem icon={<Icon name="map-pin" size="sm" />} label="Kingston 5, Jamaica" />
          </TrustGrid>
        </Container>
      </Section>

      {/* Experience-specific closing CTA */}
      {isDeluxe ? (
        <CTA
          tone="dark"
          title="Ready to send flowers?"
          description="Browse our luxury bouquets and occasion gifts, or message us for something bespoke."
          actions={
            <>
              <ButtonLink to="/collections/luxury-bouquets" variant="primary">
                Shop gifts
              </ButtonLink>
              <ButtonLink to="/pages/delivery-information" variant="ghost">
                Delivery information
              </ButtonLink>
            </>
          }
        />
      ) : (
        <CTA
          tone="dark"
          title="Placing a wholesale or supply order?"
          description="Browse wholesale flowers and floral supplies, or send us your list and we’ll confirm availability and pricing."
          actions={
            <>
              <ButtonLink to="/classic/wholesale" variant="primary">
                Wholesale flowers
              </ButtonLink>
              <ButtonLink to="/classic/supplies" variant="ghost">
                Floral supplies
              </ButtonLink>
            </>
          }
        />
      )}
    </div>
  );
}
