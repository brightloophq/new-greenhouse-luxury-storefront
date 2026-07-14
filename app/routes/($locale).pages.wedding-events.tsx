import type {Route} from './+types/($locale).pages.wedding-events';
import {EditorialPage} from '~/components/EditorialPage';

export const meta: Route.MetaFunction = () => [
  {title: 'Weddings & Events | The New Greenhouse'},
  {
    name: 'description',
    content:
      'Luxury wedding and event florals in Kingston, Jamaica — bridal bouquets, ceremony arches, and reception tablescapes composed by The New Greenhouse.',
  },
  {tagName: 'link', rel: 'canonical', href: '/pages/wedding-events'},
];

export default function WeddingEventsPage() {
  return (
    <EditorialPage
      eyebrow="Wedding Atelier"
      title="Your wedding, imagined in bloom."
      lead="Ceremony florals, bridal work, and reception styling composed around your venue, your palette, and the feeling you want your guests to carry home."
      heroImage="/images/pages/wedding-hero"
      heroAlt="Cascading bridal bouquet by The New Greenhouse"
      intro={{
        heading: 'A florist’s hand for the whole day.',
        body: [
          'From the first consultation to the last table, our team designs the floral atmosphere of your celebration — bridal and bridesmaid bouquets, boutonnières, ceremony arches and aisles, and reception centrepieces that feel considered rather than staged.',
          'We work across Kingston and throughout Jamaica, coordinating with your planner, venue, and stylist so the flowers arrive fresh, installed, and exactly to brief on the day.',
        ],
      }}
      featuresTitle="What we compose"
      features={[
        {
          title: 'Bridal & party',
          body: 'Bouquets, boutonnières, corsages, and flower-crown work tailored to your dress, colours, and season.',
        },
        {
          title: 'Ceremony & arches',
          body: 'Arches, aisle markers, altar and backdrop installations that frame your vows.',
        },
        {
          title: 'Reception & tablescapes',
          body: 'Centrepieces, head-table runners, and statement pieces styled to your room and lighting.',
        },
      ]}
      cta={{
        label: 'Book a floral consultation',
        to: '/pages/contact',
        note: 'Every wedding begins with a conversation.',
      }}
    />
  );
}
