import {useLoaderData} from 'react-router';
import type {Route} from './+types/_index';
import {BrandHero} from '~/components/home/BrandHero';
import {ExperienceChooser} from '~/components/home/ExperienceChooser';
import {ShopByVariety} from '~/components/home/ShopByVariety';
import {ServiceBand} from '~/components/home/ServiceBand';
import {loadFlowerVarieties} from '~/lib/flowerVarieties';

/**
 * Homepage — short, visual, shopping-focused (owner-approved structure):
 * header → hero → Choose Your Shopping Experience → Shop by Flower Variety
 * → footer.
 *
 * Variety discovery sits BELOW the four shopping paths on purpose: the shopper
 * chooses how they buy (wholesale/retail/arrangements/supplies) before they
 * browse what they buy. Heritage, testimonials, newsletter and marketing
 * editorial remain removed at the owner's request; reviews live only on
 * /reviews.
 */
export const meta: Route.MetaFunction = ({data}) => {
  const title = 'The New Greenhouse | Not just a flower, whatever it takes.';
  const description =
    'Fresh flowers, hand-crafted arrangements and professional florist supplies in Kingston, Jamaica.';
  const origin = data?.origin ?? '';
  const image = `${origin}/images/homepage/hero-split-1200.webp`;
  return [
    {title},
    {name: 'description', content: description},
    {property: 'og:type', content: 'website'},
    {property: 'og:title', content: title},
    {property: 'og:description', content: description},
    {property: 'og:url', content: `${origin}/`},
    {property: 'og:site_name', content: 'The New Greenhouse'},
    {property: 'og:image', content: image},
    {name: 'twitter:card', content: 'summary_large_image'},
    {name: 'twitter:title', content: title},
    {name: 'twitter:description', content: description},
    {name: 'twitter:image', content: image},
  ];
};

export async function loader({request, context}: Route.LoaderArgs) {
  return {
    origin: new URL(request.url).origin,
    // Availability is resolved server-side so an empty or missing collection
    // never reaches the client as a dead card.
    varieties: await loadFlowerVarieties(context.storefront),
  };
}

export default function Homepage() {
  const {varieties} = useLoaderData<typeof loader>();
  return (
    <div className="home home--general">
      <BrandHero />
      <ExperienceChooser />
      <ShopByVariety varieties={varieties} />
      <ServiceBand />
    </div>
  );
}
