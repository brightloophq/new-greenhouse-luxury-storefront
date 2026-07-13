import type {Route} from './+types/($locale).pages.about-us';
import {EditorialPage} from '~/components/EditorialPage';

export const meta: Route.MetaFunction = () => [
  {title: 'About | The New Greenhouse'},
  {
    name: 'description',
    content:
      'The New Greenhouse is a luxury floral house in Kingston, Jamaica — four decades of flowers for celebrations, weddings, sympathy, and the wholesale trade.',
  },
  {tagName: 'link', rel: 'canonical', href: '/pages/about-us'},
];

export default function AboutUsPage() {
  return (
    <EditorialPage
      eyebrow="Kingston, Jamaica"
      title="Four decades of flowers, memories, and moments."
      lead="The New Greenhouse is a luxury floral house serving Jamaica since 1984 — flowers for celebrations, farewells, weddings, homes, and businesses, and the meaningful gestures in between."
      heroImage="/images/pages/about-hero"
      heroAlt="The New Greenhouse floral heritage, Kingston, Jamaica"
      intro={{
        heading: 'A florist’s house, not a template.',
        body: [
          'For more than forty years we have arranged flowers for Jamaica’s most important days — birthdays and anniversaries, weddings and sympathies, hotel lobbies and embassy tables. What began as a small greenhouse has grown into a full floral house serving both retail gifting and the wholesale trade.',
          'We hold two standards at once: the polish of a luxury gift, and the warmth of something personal. Every arrangement is composed by hand in Kingston, and every stem — retail or by the box — is chosen with the same eye.',
        ],
      }}
      featuresTitle="What we do"
      features={[
        {
          title: 'Retail & gifting',
          body: 'Hand-composed arrangements and gifts, with same-day delivery across Kingston & St. Andrew.',
        },
        {
          title: 'Weddings & events',
          body: 'Full-service floral design for weddings, celebrations, and corporate occasions.',
        },
        {
          title: 'Wholesale & trade',
          body: 'Fresh flowers by the box and bunch for florists, planners, hotels, and businesses.',
        },
      ]}
      cta={{
        label: 'Send flowers',
        to: '/collections/all-flowers',
        note: 'Not just flowers — whatever it takes.',
      }}
    />
  );
}
