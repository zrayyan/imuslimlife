// Which generated pages Google should index (task 152, 2026-11-14).
//
// On 2026-11-08 Google stopped showing the site (impressions ~3,500/day -> ~10) while all
// pages stayed indexed: an algorithmic demotion of ~13.6k near-duplicate URLs (500 cities x
// languages x 13 pages, a Qibla page per city, thin masjid pages). Every page stays live for
// visitors; the ones below get `noindex,follow` and are left out of the sitemap. layout() and
// the sitemap both call indexable(), so the two can never disagree.
import { LANG_COUNTRIES } from './i18n.mjs';

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const LANG_PREFIX = new RegExp(`^/(${Object.keys(LANG_COUNTRIES).join('|')})(?=/)`);
const ARABIC = new Set(LANG_COUNTRIES.ar);

// Month pages: this month and the next three (people search a few months ahead, e.g.
// "maghrib time february 2027" in November).
export const MONTH_WINDOW = 4;

export function monthIndexable(slug, today) {
  const m = MONTHS.indexOf(slug);
  if (m < 0) return true;
  const cur = Number(today.slice(5, 7)) - 1;
  return (m - cur + 12) % 12 < MONTH_WINDOW;
}

// A masjid page is worth indexing when it says more than a map pin: its own iqamah times
// (Masjid Connect), or an address plus a way to contact the masjid.
export const masjidIndexable = (m) => Boolean(m.connect || m.live || (m.address && (m.website || m.phone)));

// url: a site path such as /ar/prayer-times/eg/cairo/march/. today: YYYY-MM-DD.
export function indexable(url, today) {
  const lang = url.match(LANG_PREFIX)?.[1] || 'en';
  const parts = url.replace(LANG_PREFIX, '').split('/').filter(Boolean);
  const [section, cc, city, month] = parts;
  // French where Arabic already covers the country (Maghreb, Mauritania, Djibouti, Chad):
  // a third copy of the same page.
  if (lang === 'fr' && cc && ARABIC.has(cc)) return false;
  if (section === 'prayer-times' && month) return monthIndexable(month, today);
  if (section === 'qibla' && city) return false; // the country page lists every city's bearing
  return true;
}
