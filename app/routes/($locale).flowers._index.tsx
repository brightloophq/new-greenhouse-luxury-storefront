import type {Route} from './+types/($locale).flowers._index';
import {FlowerCard} from '~/components/FlowerCard';
import {FLOWERS, flowersByFamily} from '~/data/flowers';
import {canonicalTag} from '~/lib/seo';

export const meta: Route.MetaFunction = ({data}) => {
  return [
    {title: 'Flower Guide | Shop Flowers by Variety | The New Greenhouse'},
    {
      name: 'description',
      content:
        'Browse fresh-cut flower varieties and colourways from The New Greenhouse — Alstroemeria, roses, tulips, orchids and more, for luxury and wholesale floristry in Kingston, Jamaica.',
    },
    canonicalTag(data?.origin, '/flowers'),
  ];
};

/** Origin only — powers the absolute self-canonical. */
export function loader({request}: Route.LoaderArgs) {
  return {origin: new URL(request.url).origin};
}

// Number of above-the-fold cards to load eagerly (first grid row on desktop).
const PRIORITY_COUNT = 4;

export default function FlowersRoute() {
  const groups = flowersByFamily(FLOWERS);

  // JSON-LD ItemList for SEO (positions are stable, data-driven).
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'The New Greenhouse — Flower Varieties',
    itemListElement: FLOWERS.map((f, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: f.name,
    })),
  };

  let rendered = 0;

  return (
    <div className="flower-catalog">
      <header className="flower-catalog-hero">
        <p className="ng-kicker flower-catalog-kicker">The flower library</p>
        <h1 className="flower-catalog-title">Shop flowers by variety.</h1>
        <p className="flower-catalog-lede">
          Every stem we grow and source, by family and colourway. New varieties
          are added as they come into season.
        </p>
      </header>

      {groups.map((group) => (
        <section
          key={group.family}
          className="flower-family"
          aria-labelledby={`family-${group.handle}`}
        >
          <div className="flower-family-head">
            <h2 className="flower-family-title" id={`family-${group.handle}`}>
              {group.family}
            </h2>
            <span className="flower-family-count">
              {group.flowers.length} colourway
              {group.flowers.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="flower-grid">
            {group.flowers.map((flower) => {
              const priority = rendered < PRIORITY_COUNT;
              rendered += 1;
              return (
                <FlowerCard
                  key={flower.id}
                  flower={flower}
                  priority={priority}
                />
              );
            })}
          </div>
        </section>
      ))}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{__html: JSON.stringify(itemList)}}
      />
    </div>
  );
}
