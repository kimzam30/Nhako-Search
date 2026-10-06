import { HomeClient } from '@/components/home/HomeClient';
import { SITE_DESCRIPTION, SITE_URL } from '@/lib/site';

/*
 * The home screen is interactive (HomeClient); this server wrapper adds the
 * structured data that tells search engines what the site is: a free,
 * browser-based word game with online multiplayer that installs as an app.
 */
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: 'NhakoSearch',
      description: SITE_DESCRIPTION,
      inLanguage: 'en',
    },
    {
      '@type': ['VideoGame', 'WebApplication'],
      '@id': `${SITE_URL}/#game`,
      name: 'NhakoSearch',
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      image: `${SITE_URL}/opengraph-image.png`,
      genre: ['Word search', 'Puzzle'],
      gamePlatform: ['Web browser', 'iOS', 'Android', 'Windows', 'macOS'],
      applicationCategory: 'GameApplication',
      operatingSystem: 'Any (web browser)',
      playMode: ['SinglePlayer', 'MultiPlayer', 'CoOp'],
      numberOfPlayers: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 2 },
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      inLanguage: 'en',
      publisher: { '@type': 'Organization', name: 'Nhako' },
    },
  ],
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        // JSON.stringify output is safe here: no user data, and `<` is escaped.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <HomeClient />
    </>
  );
}
