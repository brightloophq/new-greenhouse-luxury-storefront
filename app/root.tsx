import {Analytics, getShopAnalytics, useNonce} from '@shopify/hydrogen';
import {
  Outlet,
  useRouteError,
  isRouteErrorResponse,
  type ShouldRevalidateFunction,
  Links,
  Meta,
  Scripts,
  ScrollRestoration,
  useLocation,
  useRouteLoaderData,
} from 'react-router';
import type {Route} from './+types/root';
import {FOOTER_QUERY, HEADER_QUERY} from '~/lib/fragments';
import resetStyles from '~/styles/reset.css?url';
import appStyles from '~/styles/app.css?url';
import designSystemStyles from '~/styles/design-system.css?url';
import componentStyles from '~/styles/components.css?url';
import shellStyles from '~/styles/shell.css?url';
import catalogStyles from '~/styles/catalog.css?url';
import flowerStyles from '~/styles/flowers.css?url';
import pageStyles from '~/styles/pages.css?url';
import homeStyles from '~/styles/home.css?url';
import experienceStyles from '~/styles/experience.css?url';
import suppliesStyles from '~/styles/supplies.css?url';
import arrangementsStyles from '~/styles/arrangements.css?url';
import informationalStyles from '~/styles/informational.css?url';
import wholesaleStyles from '~/styles/wholesale.css?url';
import productStyles from '~/styles/product.css?url';
import cartStyles from '~/styles/cart.css?url';
import fontStyles from '~/styles/fonts.css?url';
import tailwindCss from './styles/tailwind.css?url';
// Critical brand faces preloaded to minimise FOUT on the above-the-fold hero:
// Raleway (body) and Montserrat (display). Both are variable — one file each.
import ralewayBody from '~/assets/fonts/raleway-variable.woff2?url';
import montserratDisplay from '~/assets/fonts/montserrat-variable.woff2?url';
import {PageLayout} from './components/PageLayout';
import {ExperienceProvider} from '~/components/ExperienceProvider';
import {NotFound} from '~/components/NotFound';
import {
  themeForPath,
  PREMIUM_ROUTE,
  DEFAULT_EXPERIENCE,
} from '~/lib/experience';

export type RootLoader = typeof loader;

/**
 * This is important to avoid re-fetching root queries on sub-navigations
 */
export const shouldRevalidate: ShouldRevalidateFunction = ({
  formMethod,
  currentUrl,
  nextUrl,
}) => {
  // revalidate when a mutation is performed e.g add to cart, login...
  if (formMethod && formMethod !== 'GET') return true;

  // revalidate when manually revalidating via useRevalidator
  if (currentUrl.toString() === nextUrl.toString()) return true;

  // Re-run the root loader when crossing the premium-catalogue boundary so the
  // route-based visual theme (<html data-experience>) updates on client nav.
  if (
    currentUrl.pathname.startsWith(PREMIUM_ROUTE) !==
    nextUrl.pathname.startsWith(PREMIUM_ROUTE)
  ) {
    return true;
  }

  // Defaulting to no revalidation for root loader data to improve performance.
  // When using this feature, you risk your UI getting out of sync with your server.
  // Use with caution. If you are uncomfortable with this optimization, update the
  // line below to `return defaultShouldRevalidate` instead.
  // For more details see: https://remix.run/docs/en/main/route/should-revalidate
  return false;
};

/**
 * The main and reset stylesheets are added in the Layout component
 * to prevent a bug in development HMR updates.
 *
 * This avoids the "failed to execute 'insertBefore' on 'Node'" error
 * that occurs after editing and navigating to another page.
 *
 * It's a temporary fix until the issue is resolved.
 * https://github.com/remix-run/remix/issues/9242
 */
export function links() {
  return [
    {
      rel: 'preconnect',
      href: 'https://cdn.shopify.com',
    },
    {
      rel: 'preconnect',
      href: 'https://shop.app',
    },
    {
      rel: 'preload',
      as: 'font',
      type: 'font/woff2',
      href: ralewayBody,
      crossOrigin: 'anonymous',
    },
    {
      rel: 'preload',
      as: 'font',
      type: 'font/woff2',
      href: montserratDisplay,
      crossOrigin: 'anonymous',
    },
    // The New Greenhouse brand favicon / touch / PWA icon set (public/).
    {rel: 'icon', type: 'image/x-icon', href: '/favicon.ico'},
    {rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png'},
    {rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png'},
    {rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png'},
    {rel: 'manifest', href: '/manifest.webmanifest'},
  ];
}

/**
 * Default document metadata for The New Greenhouse. Applies brand title,
 * description and social cards to any route that does not set its own meta.
 * Content routes (homepage, collections, products) override the title with
 * page-specific SEO copy.
 */
export const meta: Route.MetaFunction = () => {
  const title = 'The New Greenhouse | Not just a flower, whatever it takes.';
  const description =
    'Premium wholesale flowers, luxury floral arrangements, and professional floral supplies in Kingston, Jamaica. Fresh flowers for florists, businesses, gifts, and everyday moments.';
  return [
    {title},
    {name: 'description', content: description},
    {property: 'og:type', content: 'website'},
    {property: 'og:site_name', content: 'The New Greenhouse'},
    {property: 'og:title', content: title},
    {property: 'og:description', content: description},
    {property: 'og:image', content: '/og-image.png'},
    {name: 'twitter:card', content: 'summary_large_image'},
    {name: 'twitter:title', content: title},
    {name: 'twitter:description', content: description},
    {name: 'twitter:image', content: '/og-image.png'},
  ];
};

export async function loader(args: Route.LoaderArgs) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  const {storefront, env} = args.context;

  return {
    ...deferredData,
    ...criticalData,
    // Visual theme is route-based (green everywhere; elevated only on the
    // premium catalogue) — not cookie- or product-driven.
    experience: themeForPath(new URL(args.request.url).pathname),
    publicStoreDomain: env.PUBLIC_STORE_DOMAIN,
    shop: getShopAnalytics({
      storefront,
      publicStorefrontId: env.PUBLIC_STOREFRONT_ID,
    }),
    consent: {
      checkoutDomain: env.PUBLIC_CHECKOUT_DOMAIN,
      storefrontAccessToken: env.PUBLIC_STOREFRONT_API_TOKEN,
      withPrivacyBanner: false,
      // localize the privacy banner
      country: args.context.storefront.i18n.country,
      language: args.context.storefront.i18n.language,
    },
  };
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({context}: Route.LoaderArgs) {
  const {storefront} = context;

  const [header] = await Promise.all([
    storefront.query(HEADER_QUERY, {
      cache: storefront.CacheLong(),
      variables: {
        headerMenuHandle: 'main-menu', // Adjust to your header menu handle
      },
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  return {header};
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context}: Route.LoaderArgs) {
  const {storefront, customerAccount, cart} = context;

  // defer the footer query (below the fold)
  const footer = storefront
    .query(FOOTER_QUERY, {
      cache: storefront.CacheLong(),
      variables: {
        footerMenuHandle: 'footer', // Adjust to your footer menu handle
      },
    })
    .catch((error: Error) => {
      // Log query errors, but don't throw them so the page can still render
      console.error(error);
      return null;
    });
  return {
    cart: cart.get(),
    isLoggedIn: customerAccount.isLoggedIn(),
    footer,
  };
}

export function Layout({children}: {children?: React.ReactNode}) {
  const nonce = useNonce();
  const data = useRouteLoaderData<RootLoader>('root');
  const experience = data?.experience ?? DEFAULT_EXPERIENCE;

  return (
    <html lang="en" data-experience={experience}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        {/* Global brand chrome — constant on every route (route meta can't drop these) */}
        <meta name="theme-color" content="#090909" />
        <meta name="application-name" content="The New Greenhouse" />
        <meta name="apple-mobile-web-app-title" content="The New Greenhouse" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="msapplication-TileColor" content="#090909" />
        <link rel="stylesheet" href={fontStyles}></link>
        <link rel="stylesheet" href={tailwindCss}></link>
        <link rel="stylesheet" href={resetStyles}></link>
        <link rel="stylesheet" href={appStyles}></link>
        <link rel="stylesheet" href={designSystemStyles}></link>
        <link rel="stylesheet" href={componentStyles}></link>
        <link rel="stylesheet" href={shellStyles}></link>
        <link rel="stylesheet" href={catalogStyles}></link>
        <link rel="stylesheet" href={flowerStyles}></link>
        <link rel="stylesheet" href={pageStyles}></link>
        <link rel="stylesheet" href={homeStyles}></link>
        <link rel="stylesheet" href={experienceStyles}></link>
        <link rel="stylesheet" href={suppliesStyles}></link>
        <link rel="stylesheet" href={arrangementsStyles}></link>
        <link rel="stylesheet" href={informationalStyles}></link>
        <link rel="stylesheet" href={wholesaleStyles}></link>
        <link rel="stylesheet" href={productStyles}></link>
        <link rel="stylesheet" href={cartStyles}></link>
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}

export default function App() {
  const data = useRouteLoaderData<RootLoader>('root');
  const location = useLocation();

  if (!data) {
    return <Outlet />;
  }

  // The private-preview launch page is a standalone full-screen gate — it must
  // NOT render the storefront chrome (nav, cart, search, footer). It provides
  // its own complete markup.
  if (location.pathname === '/preview') {
    return <Outlet />;
  }

  return (
    <ExperienceProvider experience={data.experience}>
      <Analytics.Provider
        cart={data.cart}
        shop={data.shop}
        consent={data.consent}
      >
        <PageLayout {...data}>
          <Outlet />
        </PageLayout>
      </Analytics.Provider>
    </ExperienceProvider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  let errorMessage = 'Unknown error';
  let errorStatus = 500;

  if (isRouteErrorResponse(error)) {
    errorMessage = error?.data?.message ?? error.data;
    errorStatus = error.status;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  // Shoppers get a designed, navigable page in the house green — never a stack
  // trace. The underlying message stays available to developers in the console.
  if (import.meta.env.DEV && errorMessage) {
     
    console.error(`[${errorStatus}]`, errorMessage);
  }

  return <NotFound status={errorStatus} />;
}
