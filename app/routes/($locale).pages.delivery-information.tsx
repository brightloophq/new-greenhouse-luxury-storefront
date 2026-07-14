import {useLoaderData} from 'react-router';
import type {Route} from './+types/($locale).pages.delivery-information';
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
import {
  CONTACT,
  DELIVERY,
  DELIVERY_CUTOFF,
  DELIVERY_FEE_BANDS_JMD,
  formatJMD,
} from '~/lib/companyContent';

export const meta: Route.MetaFunction = () => [
  {title: 'Delivery Information | The New Greenhouse, Kingston Jamaica'},
  {
    name: 'description',
    content: `Flower delivery across Kingston & St. Andrew. Same-day for orders before ${DELIVERY_CUTOFF}, Monday–Saturday. Island-wide by arrangement. Delivery fees confirmed by location.`,
  },
  {tagName: 'link', rel: 'canonical', href: '/pages/delivery-information'},
];

export async function loader({request}: Route.LoaderArgs) {
  return {experience: getExperienceFromRequest(request)};
}

export default function DeliveryInformationPage() {
  const {experience} = useLoaderData<typeof loader>();
  const isDeluxe = experience === 'deluxe';

  return (
    <div className={`ng-experience ng-experience--${experience} ng-delivery`}>
      <CollectionHero
        eyebrow="Delivery"
        title={
          isDeluxe
            ? 'Thoughtful delivery, exactly as expected.'
            : 'Delivery information.'
        }
        description={DELIVERY.intro}
        breadcrumbs={[{label: 'Home', to: '/'}, {label: 'Delivery'}]}
      />

      {/* Where we deliver */}
      <Section spacing="compact" aria-labelledby="delivery-areas">
        <Container size="lg">
          <SectionHeading id="delivery-areas" eyebrow="Where" title={DELIVERY.areas.heading} />
          <ul className="ng-delivery-list">
            {DELIVERY.areas.points.map((p) => (
              <li key={p}>
                <Icon name="map-pin" size="sm" /> <span>{p}</span>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {/* When we deliver */}
      <Section spacing="compact" aria-labelledby="delivery-times">
        <Container size="lg">
          <SectionHeading id="delivery-times" eyebrow="When" title={DELIVERY.times.heading} />
          <ul className="ng-delivery-list">
            {DELIVERY.times.points.map((p) => (
              <li key={p}>
                <Icon name="clock" size="sm" /> <span>{p}</span>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {/* Delivery fees + fee-band map */}
      <Section spacing="compact" aria-labelledby="delivery-fees">
        <Container size="lg">
          <SectionHeading id="delivery-fees" eyebrow="Fees" title={DELIVERY.fees.heading} />
          <Text size="body">{DELIVERY.fees.note}</Text>

          <p className="ng-delivery-bands-label">{DELIVERY.fees.bandsLabel}</p>
          <ul className="ng-delivery-bands" aria-label="Delivery fee bands (Jamaican dollars)">
            {DELIVERY_FEE_BANDS_JMD.map((amount) => (
              <li key={amount} className="ng-delivery-band">
                {formatJMD(amount)}
              </li>
            ))}
          </ul>

          {DELIVERY.fees.mapAsset ? (
            <figure className="ng-delivery-map">
              <img
                src={DELIVERY.fees.mapAsset}
                alt={DELIVERY.fees.mapAlt}
                loading="lazy"
                decoding="async"
              />
              <figcaption>{DELIVERY.fees.mapAlt}</figcaption>
            </figure>
          ) : (
            <p className="ng-delivery-map-note">
              <Icon name="map-pin" size="sm" /> The fee bands above are a guide only.
              Your exact delivery fee is confirmed by location during ordering.
            </p>
          )}
        </Container>
      </Section>

      {/* If the recipient is unavailable */}
      <Section spacing="compact" aria-labelledby="delivery-recipient">
        <Container size="lg">
          <SectionHeading
            id="delivery-recipient"
            eyebrow="On delivery day"
            title={DELIVERY.recipient.heading}
          />
          <Text size="body">{DELIVERY.recipient.intro}</Text>
          <p className="ng-delivery-bands-label">To help us deliver smoothly, please provide:</p>
          <ul className="ng-delivery-list ng-delivery-list--check">
            {DELIVERY.recipient.askFor.map((item) => (
              <li key={item}>
                <Icon name="check" size="sm" /> <span>{item}</span>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {/* Delays + confirmation */}
      <Section spacing="compact" aria-labelledby="delivery-delays">
        <Container size="lg">
          <SectionHeading id="delivery-delays" eyebrow="Good to know" title={DELIVERY.delays.heading} />
          <Text size="body">{DELIVERY.delays.text}</Text>

          <h3 className="ng-delivery-subheading">{DELIVERY.confirmation.heading}</h3>
          <ul className="ng-delivery-list">
            {DELIVERY.confirmation.points.map((p) => (
              <li key={p}>
                <Icon name="check" size="sm" /> <span>{p}</span>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {/* Contact */}
      <Section spacing="compact" aria-labelledby="delivery-contact">
        <Container size="lg">
          <SectionHeading id="delivery-contact" eyebrow="Contact" title="Questions about a delivery?" />
          <address className="ng-delivery-contact">
            <p>
              <strong>The New Greenhouse</strong>
              <br />
              {CONTACT.address.line1}
              <br />
              {CONTACT.address.line2}
            </p>
            <p>
              {CONTACT.phones.map((phone) => (
                <span key={phone.href} className="ng-delivery-contact-line">
                  <Icon name="phone" size="sm" /> <a href={phone.href}>{phone.display}</a>
                </span>
              ))}
              <span className="ng-delivery-contact-line">
                <Icon name="mail" size="sm" />{' '}
                <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
              </span>
              <span className="ng-delivery-contact-line">
                <Icon name="whatsapp" size="sm" />{' '}
                <a href={CONTACT.whatsapp.href} target="_blank" rel="noreferrer">
                  WhatsApp (preferred for fast questions)
                </a>
              </span>
            </p>
          </address>
        </Container>
      </Section>

      {/* Same-day trust strip */}
      <Section spacing="compact">
        <Container size="lg">
          <TrustGrid aria-label="Delivery at a glance">
            <TrustItem
              icon={<Icon name="clock" size="sm" />}
              label={`Same-day before ${DELIVERY_CUTOFF} (Mon–Sat)`}
            />
            <TrustItem
              icon={<Icon name="map-pin" size="sm" />}
              label="Kingston & St. Andrew"
            />
            <TrustItem
              icon={<Icon name="truck" size="sm" />}
              label="Island-wide by arrangement"
            />
          </TrustGrid>
        </Container>
      </Section>

      {/* Experience-specific closing CTA */}
      {isDeluxe ? (
        <CTA
          tone="dark"
          title="Sending a gift across Kingston?"
          description="Add the recipient’s details at checkout and choose same-day where available. A wholesale or trade buyer? Trade delivery schedules are arranged separately."
          actions={
            <>
              <ButtonLink to="/collections/luxury-bouquets" variant="primary">
                Shop gifts
              </ButtonLink>
              <ButtonLink to="/classic" variant="ghost">
                Wholesale delivery
              </ButtonLink>
            </>
          }
        />
      ) : (
        <CTA
          tone="dark"
          title="Wholesale or trade delivery?"
          description="Trade and bulk orders may follow agreed delivery schedules rather than the retail fee bands above. Talk to us to set up a recurring delivery plan."
          actions={
            <>
              <ButtonLink to="/classic/wholesale" variant="primary">
                Wholesale flowers
              </ButtonLink>
              <ButtonLink to="/pages/contact" variant="ghost">
                Arrange trade delivery
              </ButtonLink>
            </>
          }
        />
      )}
    </div>
  );
}
