import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

/*
 * Everything is crawlable except live game rooms, which are private and
 * short-lived. Personal and per-board pages stay crawlable but carry
 * `noindex` (see their layout.tsx), which a Disallow would hide from crawlers.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/play/race/lobby'],
      disallow: ['/play/race/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
