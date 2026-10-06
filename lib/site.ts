import type { Metadata } from 'next';

/** Public facts about the site, shared by metadata, the sitemap and JSON-LD. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://search.nhako.com';

export const SITE_DESCRIPTION =
  'Free cozy word search for two: race a friend or team up online, play the daily puzzle and 360 levels. No download, installs on any phone or computer.';

const SHARE_ALT = 'NhakoSearch: cozy word search for two';

/**
 * Metadata for an indexable page. Open Graph and Twitter are spelled out in
 * full because Next replaces (does not merge) a parent's `openGraph` object:
 * a page that set only a title used to lose the share image and site name.
 */
export function pageMetadata({ title, description, path }: { title: string; description: string; path: string }): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      siteName: 'NhakoSearch',
      locale: 'en_US',
      title: `${title} | NhakoSearch`,
      description,
      url: path,
      images: [{ url: '/opengraph-image.png', width: 1200, height: 630, alt: SHARE_ALT }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | NhakoSearch`,
      description,
      images: [{ url: '/twitter-image.png', alt: SHARE_ALT }],
    },
  };
}

/**
 * A page kept out of search results (personal pages, single boards, rooms).
 * The title is absolute so the suffix survives nested segments, and the
 * canonical is cleared: inheriting the parent's (e.g. the home page) sent
 * crawlers a "this is really /" signal on a noindex page.
 */
export function noindexMetadata(title: string): Metadata {
  return {
    title: { absolute: `${title} | NhakoSearch` },
    robots: { index: false, follow: true },
    alternates: { canonical: null },
  };
}
