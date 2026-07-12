import type {Route} from './+types/($locale).flowers.$family';
import {Link, useLoaderData} from 'react-router';
import {FlowerCard} from '~/components/FlowerCard';
import {flowersByFamily, flowersForFamily} from '~/data/flowers';
import {FLOWER_CATEGORIES, flowerCategoryPath} from '~/lib/flowerCategories';

export async function loader({params}: Route.LoaderArgs) {
  const handle = params.family ?? '';
  const group = flowersByFamily().find((g) => g.handle === handle);
  const approved = FLOWER_CATEGORIES.find((c) => c.handle === handle);
  // Unknown handle (not an approved family, no imagery) → 404, never a blank page.
  if (!group && !approved) {
    throw new Response('Flower family not found', {status: 404});
  }
  return {
    handle,
    familyName: group?.family ?? approved!.name,
    hasImages: Boolean(group),
  };
}

export const meta: Route.MetaFunction = ({data}) => {
  const name = data?.familyName ?? 'Flowers';
  return [
    {title: `${name} | Flower Guide | The New Greenhouse`},
    {
      name: 'description',
      content: `Browse ${name} colourways from The New Greenhouse — luxury and wholesale fresh-cut flowers in Kingston, Jamaica.`,
    },
    {rel: 'canonical', href: `/flowers/${data?.handle ?? ''}`},
  ];
};

export default function FlowerFamilyRoute() {
  const {handle, familyName, hasImages} = useLoaderData<typeof loader>();
  const flowers = flowersForFamily(handle);

  return (
    <div className="flower-catalog">
      <header className="flower-catalog-hero">
        <p className="flower-catalog-kicker">
          <Link to="/flowers" className="flower-breadcrumb">
            Flower library
          </Link>{' '}
          / {familyName}
        </p>
        <h1 className="flower-catalog-title">{familyName}</h1>
        <p className="flower-catalog-lede">
          {hasImages
            ? `${flowers.length} ${familyName} colourway${
                flowers.length === 1 ? '' : 's'
              }, fresh from The New Greenhouse.`
            : `${familyName} colourways are coming soon.`}
        </p>
        <Link className="flower-shop-cta" to={flowerCategoryPath(handle)}>
          Shop all {familyName}
        </Link>
      </header>

      {hasImages ? (
        <div className="flower-grid" aria-label={`${familyName} colourways`}>
          {flowers.map((flower, i) => (
            <FlowerCard key={flower.id} flower={flower} priority={i < 4} />
          ))}
        </div>
      ) : (
        <p className="flower-empty">
          Fresh imagery for {familyName} is on the way. In the meantime, explore
          the full collection.
        </p>
      )}
    </div>
  );
}
