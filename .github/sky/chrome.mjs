// The shared header and footer (task K01): plain functions returning HTML strings, so the
// static builders and the Worker use the same markup. Every link is a real, crawlable <a>;
// nothing needs JavaScript. The `Ask` bar is a GET form to /search/ and is the main navigation.
// Styles live in sky.css (class prefix `sk-`). Layout uses logical properties, so ar/ur flip.
import { LANGS, LANG_NAMES, RTL, t } from './i18n.mjs';

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** A time or number group that mixes Latin digits with AM/PM or Arabic-script day periods: its own left-to-right isolate, so it never reorders inside an RTL line (ar, ur). */
export const ltr = (s) => `<bdi dir="ltr">${esc(s)}</bdi>`;

/** A language's URL for the same page: `?lang=xx` (English has none), as Layout.js writes it. */
export const langHref = (path, lang) => (lang === 'en' ? path : `${path}?lang=${lang}`);

// The Nūr rules: 24 grid, 1.5 stroke, exactly one gold point of light.
const MARK = '<svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><path d="M14 2l3.5 8.5L26 14l-8.5 3.5L14 26l-3.5-8.5L2 14l8.5-3.5z" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="14" cy="14" r="3" fill="currentColor"/></svg>';
const SEARCH = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M16 16l4.5 4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

// Every top-level destination of the old header stays one click away (K02): six in the primary row,
// the rest behind "More" (a CSS-only disclosure, so it works with JS off). On phones all sit in the menu panel.
export const NAV = [
  ['times', '/prayer-times/'], ['quran', '/quran/'], ['places', '/places/'],
  ['calendar', '/calendar/'], ['qibla', '/qibla/'], ['alexaSkill', '/alexa-skill/'],
];
export const NAV_MORE = [
  ['mobile', '/mobile-app/'], ['agentsNav', '/ai-agents/'], ['mihrab', '/mihrab/'],
  ['api', '/api/'], ['support', '/faq-support/'], ['duas', '/duas/'],
];

/** @param {{lang?:string, current?:string}} o current: the nav key of this page, e.g. 'quran' */
export function header({ lang = 'en', current } = {}) {
  const s = t(lang);
  const link = ([k, href]) => `<a href="${href}"${k === current ? ' aria-current="page"' : ''}>${esc(s[k])}</a>`;
  const links = NAV.map(link).join('');
  const more = NAV_MORE.map(link).join('');
  return `<a class="sk-skip" href="#main">${esc(s.skip)}</a>
<header class="sk-header"><div class="sk-wrap sk-bar">
<a class="sk-logo" href="/" aria-label="${esc(s.home)}">${MARK}<span>iMuslim Life</span></a>
<input type="checkbox" id="sk-menu" class="sk-menu-t" aria-label="${esc(s.menu)}"><label for="sk-menu" class="sk-menubtn" aria-hidden="true"><i></i><i></i></label>
<div class="sk-right"><nav class="sk-nav" aria-label="${esc(s.main)}">${links}<div class="sk-more"><input type="checkbox" id="sk-more" class="sk-more-t" aria-label="${esc(s.moreLabel)}"><label for="sk-more" class="sk-more-btn" aria-hidden="true">${esc(s.more)}<svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 3.5l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></label><div class="sk-more-panel">${more}</div></div></nav>
<form class="sk-ask" role="search" action="/search/" method="get">${SEARCH}<label class="sk-sr" for="sk-q">${esc(s.askLabel)}</label><input id="sk-q" name="q" type="search" placeholder="${esc(s.ask)}" autocomplete="off"><kbd aria-hidden="true">/</kbd><button class="sk-sr" type="submit">${esc(s.askGo)}</button></form>
<a class="sk-cta" href="/mobile-app/">${esc(s.getApp)}</a></div>
</div></header>`;
}

const COLS = (s) => [
  [s.pray, [[s.times, '/prayer-times/'], [s.cities, '/prayer-times/countries/'], [s.calendar, '/calendar/'], [s.qibla, '/qibla/'], [s.alexaSkill, '/alexa-skill/'], [s.alexa, '/alexa-athan/']]],
  [s.read, [[s.quran, '/quran/'], [s.tasmi, '/tasmi/'], [s.duas, '/duas/'], [s.names, '/names-of-allah/']]],
  [s.find, [[s.places, '/places/'], [s.atlas, '/places/world/'], [s.addMasjid, '/mobile-app/']]],
  [s.masjidsCol, [[s.mihrab, '/mihrab/'], [s.claim, '/mihrab/']]],
  [s.builders, [[s.agentsNav, '/ai-agents/'], [s.api, '/api/']]],
  [s.appCol, [[s.mobile, '/mobile-app/'], [s.support, '/faq-support/']]],
];

/** @param {{lang?:string, path?:string, year?:number, hrefs?:Record<string,string>, languages?:boolean}} o path: this page's path, for the language links; hrefs: the page's own URL per language (static pages whose languages live at other paths, e.g. the city pages), and only those languages are listed */
export function footer({ lang = 'en', path = '/', year = new Date().getUTCFullYear(), hrefs = null, languages = true } = {}) {
  const s = t(lang);
  const cols = COLS(s).map(([h, ls]) => `<div class="sk-col"><b>${esc(h)}</b>${ls.map(([n, href]) => `<a href="${href}">${esc(n)}</a>`).join('')}</div>`).join('');
  const langs = LANGS.filter((l) => !hrefs || hrefs[l]).map((l) => `<a href="${esc(hrefs ? hrefs[l] : langHref(path, l))}" lang="${l}"${RTL.has(l) ? ' dir="rtl"' : ''}${l === lang ? ' aria-current="true"' : ''} hreflang="${l}">${esc(LANG_NAMES[l])}</a>`).join('');
  return `<footer class="sk-footer"><div class="sk-wrap">
<div class="sk-foot-top"><div class="sk-about"><span class="sk-logo-static">${MARK}<span>iMuslim Life</span></span><p>${esc(s.tag)}</p></div>
<nav class="sk-cols" aria-label="${esc(s.site)}">${cols}</nav></div>
${languages ? `<nav class="sk-langs" aria-label="${esc(s.langs)}">${langs}</nav>` : ''}
<div class="sk-legal"><span>© ${year} iMuslim Life</span><span class="sk-legal-links"><a href="/privacy-policy/">${esc(s.privacy)}</a><a href="/terms/">${esc(s.terms)}</a><a href="/faq-support/">${esc(s.contact)}</a></span></div>
</div></footer>`;
}
