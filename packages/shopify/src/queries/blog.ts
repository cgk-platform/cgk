/**
 * Shopify Blog & Article GraphQL queries
 */

import type { StorefrontClient } from '../storefront'

// ---------------------------------------------------------------------------
// Response Types
// ---------------------------------------------------------------------------

interface BlogByHandleResponse {
  blog: ShopifyBlog | null
}

interface ArticleByHandleResponse {
  blog: {
    articleByHandle: ShopifyArticle | null
  } | null
}

// ---------------------------------------------------------------------------
// Public Types
// ---------------------------------------------------------------------------

export interface ShopifyBlog {
  id: string
  handle: string
  title: string
  articles: {
    edges: Array<{
      node: ShopifyArticle
    }>
    pageInfo: {
      hasNextPage: boolean
      endCursor: string | null
    }
  }
}

export interface ShopifyArticle {
  id: string
  handle: string
  title: string
  excerpt: string | null
  excerptHtml: string | null
  contentHtml: string
  publishedAt: string
  image: {
    url: string
    altText: string | null
    width: number
    height: number
  } | null
  authorV2: {
    name: string
    bio: string | null
  } | null
  blog: {
    handle: string
    title: string
  }
  tags: string[]
  seo: {
    title: string | null
    description: string | null
  } | null
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

const ARTICLE_FRAGMENT = `
  fragment ArticleFields on Article {
    id
    handle
    title
    excerpt
    excerptHtml
    contentHtml
    publishedAt
    image {
      url
      altText
      width
      height
    }
    authorV2 {
      name
      bio
    }
    blog {
      handle
      title
    }
    tags
    seo {
      title
      description
    }
  }
`

/**
 * Fetch a blog and its articles by handle.
 * Defaults to 'news' blog handle if not specified.
 */
export async function getBlogArticles(
  client: StorefrontClient,
  blogHandle: string = 'news',
  first: number = 12,
  after?: string
): Promise<ShopifyBlog | null> {
  const result = await client.query<BlogByHandleResponse>(
    `
    ${ARTICLE_FRAGMENT}
    query BlogArticles($handle: String!, $first: Int!, $after: String) {
      blog(handle: $handle) {
        id
        handle
        title
        articles(first: $first, after: $after, sortKey: PUBLISHED_AT, reverse: true) {
          edges {
            node {
              ...ArticleFields
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
    `,
    { handle: blogHandle, first, after }
  )

  return result.blog
}

/**
 * Fetch a single article by blog handle and article handle.
 */
export async function getArticleByHandle(
  client: StorefrontClient,
  blogHandle: string,
  articleHandle: string
): Promise<ShopifyArticle | null> {
  const result = await client.query<ArticleByHandleResponse>(
    `
    ${ARTICLE_FRAGMENT}
    query ArticleByHandle($blogHandle: String!, $articleHandle: String!) {
      blog(handle: $blogHandle) {
        articleByHandle(handle: $articleHandle) {
          ...ArticleFields
        }
      }
    }
    `,
    { blogHandle, articleHandle }
  )

  return result.blog?.articleByHandle ?? null
}
