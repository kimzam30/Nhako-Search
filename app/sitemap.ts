import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

/** The indexable pages. Boards, rooms and personal pages are deliberately left out. */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages: [string, MetadataRoute.Sitemap[number]['changeFrequency'], number][] = [
    ['/', 'weekly', 1],
    ['/daily', 'daily', 0.9],
    ['/how-to-play', 'monthly', 0.8],
    ['/play/race/lobby', 'monthly', 0.8],
    ['/level-path', 'monthly', 0.7],
    ['/play/standard', 'monthly', 0.7],
  ];
  return pages.map(([path, changeFrequency, priority]) => ({
    url: `${SITE_URL}${path === '/' ? '' : path}`,
    changeFrequency,
    priority,
  }));
}
