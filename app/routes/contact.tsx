import {useRef} from 'react';
import {type LoaderFunctionArgs, type MetaFunction} from 'react-router';
import {CONTACT, DELIVERY_CUTOFF} from '~/lib/companyContent';
import {cardImage} from '~/lib/catalogues';
import {focalStyle} from '~/lib/focalPoint';
import {useReveal} from '~/lib/useReveal';
import {GlasshouseDivider} from '~/components/GlasshouseDivider';
import {catalogueMeta} from '~/lib/seo';

export const meta: MetaFunction<typeof loader> = ({data}) =>
  catalogueMeta({
    origin: data?.origin,
    path: '/contact',
    title: 'Contact & Flower Delivery | The New Greenhouse',
    description:
      'Contact The New Greenhouse in Kingston, Jamaica — phone, WhatsApp, email and our Kingston 5 address, plus flower delivery across Kingston and St. Andrew.',
    breadcrumbs: [
      {name: 'Home', path: '/'},
      {name: 'Contact Us', path: '/contact'},
    ],
  });

/** Origin only — powers the absolute self-canonical + breadcrumb URLs. */
export async function loader({request}: LoaderFunctionArgs) {
  return {origin: new URL(request.url).origin};
}

const CONTACT_IMG = '/images/homepage/retail';

/**
 * Contact — action and accessibility, in the editorial page language. Every
 * detail is the merchant-approved data from companyContent (address, two phones,
 * email, WhatsApp, delivery, socials); the essentials lead the source order so
 * they reach the fold and the screen reader first, and every channel is a
 * tappable link. There is no contact form in the current implementation, so none
 * is fabricated — direct contact is the action.
 */
export default function Contact() {
  const scope = useRef<HTMLElement>(null);
  useReveal(scope);
  const media = cardImage(CONTACT_IMG);

  return (
    <section ref={scope} className="ng-info" aria-labelledby="ng-contact-title">
      <div className="ng-info-inner">
        <div className="ng-info-head" data-reveal-heading>
          <p className="ng-info-eyebrow">Contact</p>
          <h1 id="ng-contact-title" className="ng-info-title ng-editorial-title">
            Contact us
          </h1>
          <p className="ng-info-lede">
            Call, message or email — we’re glad to help with an order, a delivery
            or a trade enquiry. WhatsApp is our fastest channel.
          </p>
        </div>

        <GlasshouseDivider className="ng-info-seam" />

        <div className="ng-contact-body">
          <dl className="ng-contact-list" data-reveal-item>
            <div>
              <dt>Visit</dt>
              <dd>{CONTACT.address.full}</dd>
            </div>
            <div>
              <dt>Call</dt>
              <dd className="ng-contact-phones">
                {CONTACT.phones.map((p) => (
                  <a key={p.href} href={p.href}>
                    {p.display}
                  </a>
                ))}
              </dd>
            </div>
            <div>
              <dt>WhatsApp</dt>
              <dd>
                <a
                  href={CONTACT.whatsapp.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Message us on WhatsApp
                </a>
              </dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>
                <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
              </dd>
            </div>
            <div>
              <dt>Delivery</dt>
              <dd>
                Kingston &amp; St. Andrew, same day before {DELIVERY_CUTOFF}.
                Island-wide by arrangement.
              </dd>
            </div>
            <div>
              <dt>Social</dt>
              <dd className="ng-contact-socials">
                <a
                  href={CONTACT.social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Instagram
                </a>
                <a
                  href={CONTACT.social.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Facebook
                </a>
              </dd>
            </div>
          </dl>

          <figure className="ng-contact-media" data-reveal-item>
            <img
              src={media.src}
              srcSet={media.srcSet}
              sizes="(min-width: 60em) 40vw, 92vw"
              alt="Fresh flowers at The New Greenhouse, Kingston"
              loading="lazy"
              decoding="async"
              width={800}
              height={1000}
              style={focalStyle(CONTACT_IMG)}
            />
          </figure>
        </div>
      </div>
    </section>
  );
}
