// Structured data (JSON-LD) helpers, one small function per schema.org type (task S04).
// Pages call these instead of writing JSON by hand. Used by the route shells, the Alexa, Hijri and Dua
// builders, the city build and the Worker's places pages. publish-site.sh copies this file with the city modules.
//
// Owner rule (W06): never a rating, a review count or any third-party rating/review/id.
export const SITE = 'https://imuslimlife.com';
export const APP_STORE_URL = 'https://apps.apple.com/app/id6743494825';
export const PLAY_URL = 'https://play.google.com/store/apps/details?id=com.rayyan.salatemustaqeem';
export const ALEXA_SKILL_URL = 'https://www.amazon.com/dp/B0GTBN95HQ/';
export const MCP_URL = 'https://alexa.imuslimlife.com/v1/mcp';
const ORG_ID = `${SITE}/#organization`;
const FREE = { '@type': 'Offer', price: '0', priceCurrency: 'USD' };

/** Keys no page may ever emit (W06 forbidden list). */
export const FORBIDDEN_KEYS = ['aggregateRating', 'ratingValue', 'ratingCount', 'reviewCount', 'bestRating', 'worstRating', 'review', 'reviewRating'];

/** The publisher node every page's software and articles point to by @id. */
export const organization = () => ({ '@type': 'Organization', '@id': ORG_ID, name: 'iMuslim Life', url: `${SITE}/`, logo: `${SITE}/logo512.png` });

/** The WebSite node with the site search box (SearchAction), on every page's graph. */
export const website = () => ({ '@type': 'WebSite', '@id': `${SITE}/#website`, name: 'iMuslim Life', url: `${SITE}/`, publisher: { '@id': ORG_ID }, inLanguage: ['en', 'ar', 'ur', 'fr', 'es', 'id', 'ms', 'tr'],
  potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: `${SITE}/search/?q={search_term_string}` }, 'query-input': 'required name=search_term_string' } });

const definedIds = (v, out = new Set()) => { if (Array.isArray(v)) v.forEach((x) => definedIds(x, out)); else if (v && typeof v === 'object') { if (v['@id'] && Object.keys(v).length > 1) out.add(v['@id']); Object.values(v).forEach((x) => definedIds(x, out)); } return out; };
const refIds = (v, out = new Set()) => { if (Array.isArray(v)) v.forEach((x) => refIds(x, out)); else if (v && typeof v === 'object') { if (v['@id'] && Object.keys(v).length === 1) out.add(v['@id']); Object.values(v).forEach((x) => refIds(x, out)); } return out; };

/** @id references (nodes that are only an @id) that no node on the page defines; [] when whole. */
export const danglingIds = (nodes) => { const d = definedIds(nodes); return [...refIds(nodes)].filter((i) => !d.has(i)); };

/** The JSON-LD <script> payload (escaped for HTML) for a list of nodes; adds the Organization when the nodes point at it and don't define it. */
export function graphJson(nodes) {
  const all = danglingIds(nodes).includes(ORG_ID) ? [organization(), ...nodes] : nodes;
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': all }).replace(/</g, '\\u003c');
}

/** Paths of forbidden keys (and Google map/place ids) found anywhere in a JSON-LD value; [] when clean. */
export function forbiddenFindings(value, path = '$') {
  const out = [];
  if (Array.isArray(value)) value.forEach((v, i) => out.push(...forbiddenFindings(v, `${path}[${i}]`)));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (FORBIDDEN_KEYS.includes(k)) out.push(`${path}.${k}`);
      out.push(...forbiddenFindings(v, `${path}.${k}`));
    }
  } else if (typeof value === 'string' && /google\.[a-z.]+\/(maps|search)|maps\.app\.goo\.gl|ChIJ[\w-]{10,}/i.test(value)) out.push(`${path}=${value.slice(0, 40)}`);
  return out;
}

/** The app: one MobileApplication, installable from both stores. */
export const mobileApplication = ({ url = `${SITE}/mobile-app/`, sameAs = [] } = {}) => ({
  '@type': 'MobileApplication', '@id': `${SITE}/#app`, name: 'Salat-e-Mustaqeem', operatingSystem: 'iOS 17+, Android 7+, watchOS, Wear OS',
  applicationCategory: 'LifestyleApplication', url, installUrl: [APP_STORE_URL, PLAY_URL], downloadUrl: [APP_STORE_URL, PLAY_URL],
  isAccessibleForFree: true, offers: FREE, publisher: { '@id': ORG_ID }, ...(sameAs.length ? { sameAs } : {}),
});

/** A piece of software that is not a store app (the Alexa skill). */
export const softwareApplication = ({ name, url, os, category = 'LifestyleApplication', description, installUrl }) => ({
  '@type': 'SoftwareApplication', name, url, operatingSystem: os, applicationCategory: category, isAccessibleForFree: true, offers: FREE,
  publisher: { '@id': ORG_ID }, ...(description ? { description } : {}), ...(installUrl ? { installUrl } : {}),
});

/** The MCP server (a public HTTP endpoint). */
export const webApi = ({ name, description, endpoint, docUrl }) => ({
  '@type': 'WebAPI', name, description, url: docUrl, documentation: docUrl, termsOfService: `${SITE}/terms/`, provider: { '@id': ORG_ID },
  potentialAction: { '@type': 'ConsumeAction', target: { '@type': 'EntryPoint', urlTemplate: endpoint, httpMethod: 'POST', contentType: 'application/json' } },
});

export const geo = (lat, lon) => ({ '@type': 'GeoCoordinates', latitude: lat, longitude: lon });

/** A city as a Place with coordinates (prayer-time pages). */
export const cityPlace = ({ name, url, lat, lon, countryName, countryCode }) => ({
  '@type': 'Place', name, url, geo: geo(lat, lon),
  address: { '@type': 'PostalAddress', addressLocality: name, ...(countryCode ? { addressCountry: countryCode } : {}) },
  ...(countryName ? { containedInPlace: { '@type': 'Country', name: countryName } } : {}),
});

/** A list of links: [{ name, url }] in order. */
export const itemList = (name, items) => ({
  '@type': 'ItemList', name, numberOfItems: items.length,
  itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, url: it.url })),
});

/** A listed place (Mosque, Restaurant, Place...). No ratings, ever. */
export const listedPlace = ({ type, url, name, lang, address, lat, lon, telephone, website, mapUrl, hours, checkedAt }) => ({
  '@type': type, '@id': url, url, name, inLanguage: lang,
  address: { '@type': 'PostalAddress', ...address }, geo: geo(lat, lon),
  ...(telephone ? { telephone } : {}), ...(website ? { sameAs: [website] } : {}), ...(mapUrl ? { hasMap: mapUrl } : {}),
  ...(hours ? { openingHours: hours } : {}), ...(isoDay(checkedAt) ? { dateModified: isoDay(checkedAt) } : {}),
});

/** A page of reference writing with dates. */
export const article = ({ headline, url, lang, modified, published = modified, type = 'Article' }) => ({
  '@type': type, headline, name: headline, url, mainEntityOfPage: url, inLanguage: lang,
  datePublished: isoDay(published), dateModified: isoDay(modified),
  author: { '@id': ORG_ID }, publisher: { '@id': ORG_ID },
});

/** YYYY-MM-DD from a Date or ISO string; '' when unusable. */
export function isoDay(v) {
  if (!v) return '';
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}
