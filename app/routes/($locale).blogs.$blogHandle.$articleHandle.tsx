import {useLoaderData} from 'react-router';
import type {MetaDescriptor} from 'react-router';
import type {Route} from './+types/blogs.$blogHandle.$articleHandle';
import {Image} from '@shopify/hydrogen';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {absoluteUrl, articleSchema, pageMeta, breadcrumbSchema} from '~/lib/seo';

export const meta: Route.MetaFunction = ({data}) => {
  const article = data?.article;
  const title = article?.title ?? 'Article';
  const blogTitle = data?.blogTitle ?? 'Journal';
  const path = `/blogs/${data?.blogHandle ?? ''}/${data?.articleHandle ?? ''}`;
  const url = absoluteUrl(data?.origin, path);
  const description =
    article?.seo?.description ||
    `${title} — from The New Greenhouse Journal, luxury and wholesale florist in Kingston, Jamaica.`;
  const image = article?.image?.url;

  const tags: MetaDescriptor[] = [
    ...pageMeta({
      origin: data?.origin,
      path,
      title: `${title} | The New Greenhouse`,
      description,
      image,
      ogType: 'article',
    }),
    {
      'script:ld+json': breadcrumbSchema(data?.origin, [
        {name: 'Home', path: '/'},
        {name: 'Journal', path: '/blogs'},
        {name: blogTitle, path: `/blogs/${data?.blogHandle ?? ''}`},
        {name: title, path},
      ]),
    },
  ];

  if (article) {
    tags.push({
      'script:ld+json': articleSchema({
        origin: data?.origin,
        url,
        headline: title,
        description: article.seo?.description || undefined,
        image,
        datePublished: article.publishedAt,
        authorName: article.author?.name || undefined,
      }),
    });
  }

  return tags;
};

export async function loader(args: Route.LoaderArgs) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return {...deferredData, ...criticalData};
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({context, request, params}: Route.LoaderArgs) {
  const {blogHandle, articleHandle} = params;

  if (!articleHandle || !blogHandle) {
    throw new Response('Not found', {status: 404});
  }

  const [{blog}] = await Promise.all([
    context.storefront.query(ARTICLE_QUERY, {
      variables: {blogHandle, articleHandle},
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  if (!blog?.articleByHandle) {
    throw new Response(null, {status: 404});
  }

  redirectIfHandleIsLocalized(
    request,
    {
      handle: articleHandle,
      data: blog.articleByHandle,
    },
    {
      handle: blogHandle,
      data: blog,
    },
  );

  const article = blog.articleByHandle;

  return {
    article,
    blogHandle,
    blogTitle: blog.title,
    articleHandle,
    origin: new URL(request.url).origin,
  };
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context}: Route.LoaderArgs) {
  return {};
}

export default function Article() {
  const {article} = useLoaderData<typeof loader>();
  const {title, image, contentHtml, author} = article;

  const publishedDate = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(article.publishedAt));

  return (
    <div className="article">
      <h1>
        {title}
        <div>
          <time dateTime={article.publishedAt}>{publishedDate}</time> &middot;{' '}
          <address>{author?.name}</address>
        </div>
      </h1>

      {image && <Image data={image} sizes="90vw" loading="eager" />}
      <div
        dangerouslySetInnerHTML={{__html: contentHtml}}
        className="article"
      />
    </div>
  );
}

// NOTE: https://shopify.dev/docs/api/storefront/latest/objects/blog#field-blog-articlebyhandle
const ARTICLE_QUERY = `#graphql
  query Article(
    $articleHandle: String!
    $blogHandle: String!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(language: $language, country: $country) {
    blog(handle: $blogHandle) {
      handle
      title
      articleByHandle(handle: $articleHandle) {
        handle
        title
        contentHtml
        publishedAt
        author: authorV2 {
          name
        }
        image {
          id
          altText
          url
          width
          height
        }
        seo {
          description
          title
        }
      }
    }
  }
` as const;
