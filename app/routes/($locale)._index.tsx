import type {Route} from './+types/_index';
import {BrandHero} from '~/components/home/BrandHero';
import {ExperienceChooser} from '~/components/home/ExperienceChooser';

/**
 * Homepage — short, visual, shopping-focused (owner-approved structure):
 * header → hero → Choose Your Shopping Experience → footer.
 * Heritage, testimonials/reviews, newsletter/trade-list and marketing editorial
 * were removed at the owner's request; reviews live only on /reviews.
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

export async function loader({request}: Route.LoaderArgs) {
  return {origin: new URL(request.url).origin};
}

export default function Homepage() {
  return (
    <div className="home home--general">
      <BrandHero />
      <ExperienceChooser />
    </div>
  );
}
