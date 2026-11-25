// The Living Sky look for the static Ramaḍān timetable pages (task K08): /ramadan/<year>/ and the city
// Ramaḍān months. The page markup and classes are the city pages' own; this stylesheet is cities.css with its
// green palette, its dark-mode block and its old header bar removed, the sky tokens mapped onto the
// names it uses (--green, --paper, --text, --muted ...), and the shared fonts. The nightly city build writes it
// to /prayer-times/cities-sky.css. Static pages have no visitor, so they carry the sky-less default (a
// calm Dhuhr day page); the Worker's per-visitor sky belongs to the pages it renders per request.
import { FONT_FACES, skyCss } from './css.mjs';

const MAP = ':root{--green:var(--accent);--green-dark:var(--accent);--green-soft:var(--band);--gold-dark:var(--gold);--gold-soft:var(--band);--paper:var(--card);--text:var(--ink);--muted:var(--soft)}';
const OVERRIDES = `
html{font-family:var(--sans)}
body{font-family:inherit;font-size:16px}
[dir="rtl"] body,[dir="rtl"] .btn{font-family:inherit}
:lang(ar){font-family:Amiri,serif}
:lang(ur){font-family:'Noto Nastaliq Urdu',serif;line-height:2}
.wrap{max-width:1100px;padding-inline:32px}
@media (max-width:720px){.wrap{padding-inline:16px}}
main{padding-block:32px 48px}
.hero{border-top:0;border-radius:24px;padding:36px 24px}
.hero h1{font-family:var(--serif);font-weight:400;color:var(--ink)}
.card{border-radius:22px;padding:26px}
.card h2,.card h3,.month h1{font-family:var(--serif);font-weight:400;color:var(--ink)}
.slot{border-radius:16px}
.hero .btns{justify-content:center}
.slot b{color:var(--ink);font-weight:500}
.btn{border-radius:999px;color:var(--bg);min-height:48px;display:inline-flex;align-items:center;padding-inline:22px}
.btn:hover{color:var(--bg);filter:brightness(1.12)}
.btn.alt{color:var(--gold);border-color:var(--gold)}
.btn.alt:hover{color:var(--gold);background:var(--band)}
.foot{border-block-start:1px solid var(--line);margin-block-start:24px;padding-block:28px 12px}
.foot a,.crumbs a,.cities span,.cities span a{color:var(--soft)}
.cities a{color:var(--accent)}
@media print{.sk-header,.sk-footer,.sk-skip,.sk-season{display:none!important}}
`;

/** @param {string} citiesCss the text of cities.css */
export function citiesSkyCss(citiesCss) {
  const base = citiesCss
    .replace(/:root \{[^}]*\}\s*@media \(prefers-color-scheme: dark\) \{\s*:root \{[^}]*\}\s*\}/, '') // the old palette and dark mode: the sky decides
    .replace(/^\.(?:bar|brand)[^\n]*\n/gm, ''); // the old green header bar
  return `${FONT_FACES}\n${skyCss()}\n${MAP}\n${base}\n${OVERRIDES}`;
}
