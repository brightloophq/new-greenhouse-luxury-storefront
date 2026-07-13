import type {Route} from './+types/($locale).pages.corporate-flowers';
import {EditorialPage} from '~/components/EditorialPage';

export const meta: Route.MetaFunction = () => [
  {title: 'Corporate Floral Services | The New Greenhouse'},
  {
    name: 'description',
    content:
      'Weekly corporate floral styling and event arrangements for Kingston hotels, offices, restaurants, embassies, and private functions — by The New Greenhouse.',
  },
  {tagName: 'link', rel: 'canonical', href: '/pages/corporate-flowers'},
];

export default function CorporateFlowersPage() {
  return (
    <EditorialPage
      eyebrow="Corporate Floral Services"
      title="Flowers that hold the room."
      lead="Weekly floral styling and event arrangements for Kingston’s hotels, offices, restaurants, embassies, boutiques, and private functions."
      heroImage="/images/pages/corporate-hero"
      heroAlt="Refined ivory corporate arrangement by The New Greenhouse"
      intro={{
        heading: 'A standing account, effortlessly managed.',
        body: [
          'We keep your reception, lobby, boardroom, and guest spaces in fresh flowers on a schedule that suits you — delivered, arranged, and refreshed by our team so your space always looks considered.',
          'Palettes are matched to your brand and interiors, with scaling for launches, galas, and seasonal moments. One point of contact, dependable delivery, invoiced monthly.',
        ],
      }}
      featuresTitle="How we work with you"
      features={[
        {
          title: 'Weekly styling',
          body: 'Recurring arrangements for lobbies, receptions, and executive floors, refreshed on a set cadence.',
        },
        {
          title: 'Events & launches',
          body: 'Scaled florals and installations for conferences, galas, product launches, and hospitality.',
        },
        {
          title: 'Gifting & VIP',
          body: 'Branded client gifts, VIP welcomes, and bulk corporate orders with reliable island-wide delivery.',
        },
      ]}
      cta={{
        label: 'Enquire about a corporate account',
        to: '/pages/contact',
        note: 'Let’s design a standing floral programme for your space.',
      }}
    />
  );
}
