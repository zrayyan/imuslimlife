// Sitemaps, shared by the static build (build.mjs) and the Worker (task 165 step 5, ADR 052).
// Only indexable URLs go in (indexing.mjs, the same rule layout() uses for noindex).
// Places (W06) reuse urlset/sitemapIndex/shards: an index plus shards of SHARD URLs each.
import { indexable } from './indexing.mjs';
import { SITE } from './render.mjs';

export const SHARD = 10000; // ADR 051: places shards of 10k URLs (Google allows 50k per file)

const xml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const HEAD = '<?xml version="1.0" encoding="UTF-8"?>\n';

/** A urlset of site paths, all with one lastmod (YYYY-MM-DD). */
export const urlset = (paths, lastmod) => `${HEAD}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((u) => `  <url><loc>${xml(SITE + u)}</loc><lastmod>${lastmod}</lastmod></url>`).join('\n')}
</urlset>
`;

/** A sitemap index: [{ path: '/sitemap-places-1.xml', lastmod }]. */
export const sitemapIndex = (entries) => `${HEAD}<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map((e) => `  <sitemap><loc>${xml(SITE + e.path)}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ''}</sitemap>`).join('\n')}
</sitemapindex>
`;

/** Splits a URL list into shards of at most `size`. */
export const shards = (urls, size = SHARD) => Array.from({ length: Math.ceil(urls.length / size) }, (_, i) => urls.slice(i * size, (i + 1) * size));

/** Every generated page of the city-pages families, in the build's order (indexable or not). */
export function cityPagesUrls({ aboutUrls, masjidDir, ramadan, calendar, qibla, ALL_LANGS, countriesUrl, countriesIn, countryUrl, cities, langsOf, cityUrl, monthUrl, MONTHS }) {
  return [
    '/widget/',
    ...aboutUrls,
    ...masjidDir.urls,
    ...(ramadan ? [ramadan.url] : []),
    ...calendar.urls,
    ...qibla.urls,
    ...ALL_LANGS.flatMap((L) => [countriesUrl(L), ...countriesIn(L).map(([cc]) => countryUrl(cc, L))]),
    ...cities.flatMap((c) => langsOf(c.country).flatMap((L) => [cityUrl(c, L), ...MONTHS.map((_, i) => monthUrl(c, i + 1, L))])),
  ];
}

/** /sitemap-cities.xml: the indexable URLs, lastmod the 1st of today's month. */
export function citySitemap(urls, today) {
  const indexed = urls.filter((u) => indexable(u, today));
  return { xml: urlset(indexed, `${today.slice(0, 7)}-01`), count: indexed.length };
}
