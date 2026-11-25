// The sun and the masjid skyline that close a stage (path from the canvas), plus a fixed star field.
import { SKIES } from './tokens.mjs';

/** The masjid skyline (owner's redraw, 2026-11-24), viewBox 0 0 1440 120; fill comes from CSS (the sky's ground). */
export const SKYLINE_GROUP = '<g class="sk-skyline"><path d="M0 120 V98 H140 V90 H230 V98 H380 V86 H470 V98 H560 V80 H880 V98 H1000 V88 C1000 76 1012 70 1024 64 C1036 70 1048 76 1048 88 V98 H1180 V90 H1290 V98 H1440 V120 Z"/><rect x="662" y="62" width="116" height="18"/><path d="M664 64 C656 46 672 30 696 21 C710 16 717 13 720 10 C723 13 730 16 744 21 C768 30 784 46 776 64 Z"/><rect x="718.6" y="0" width="2.8" height="11"/><circle cx="720" cy="6" r="3"/><path d="M606 80 C606 66 618 58 632 56 C646 58 658 66 658 80 Z"/><path d="M782 80 C782 66 794 58 808 56 C822 58 834 66 834 80 Z"/><rect x="630.8" y="49" width="2.4" height="8"/><rect x="806.8" y="49" width="2.4" height="8"/><rect x="587" y="30" width="10" height="50"/><rect x="583" y="47" width="18" height="3.4" rx="1"/><rect x="585" y="35" width="14" height="2.6" rx="1"/><path d="M587 30 L592 5 L597 30 Z"/><rect x="849" y="30" width="10" height="50"/><rect x="845" y="47" width="18" height="3.4" rx="1"/><rect x="847" y="35" width="14" height="2.6" rx="1"/><path d="M849 30 L854 5 L859 30 Z"/></g>';
// Where the sun stands in each card sky (1440 grid, centred on the mosque); ʿIshāʾ has none.
const SUN = { fajr: [610, 104], dhuhr: [720, 28], asr: [812, 56], maghrib: [846, 104], isha: null };

/** The skyline for a five-sky card: the same group, cropped to the mosque. All suns are in the SVG; CSS shows the current one. */
export function scene() {
  const sun = Object.entries(SUN).filter(([, v]) => v).map(([k, v]) => `<circle class="sk-sun" data-for="${k}" cx="${v[0]}" cy="${v[1]}" r="13"/>`).join('');
  return `<svg class="sk-scene" aria-hidden="true" viewBox="0 0 1440 120" preserveAspectRatio="xMidYMax slice">${sun}${SKYLINE_GROUP}</svg>`;
}

// 46 seeded stars, as in the canvas: position, 2 or 3 px, a staggered twinkle delay.
let seed = 7;
const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
export const STARS = Array.from({ length: 46 }, () => ({ left: (rnd() * 100).toFixed(2), top: (rnd() * 62).toFixed(2), size: rnd() < 0.85 ? 2 : 3, delay: (-rnd() * 5).toFixed(2) }));
export const stars = () => `<div class="sk-stars" aria-hidden="true">${STARS.map((s) => `<i class="star" style="left:${s.left}%;top:${s.top}%;width:${s.size}px;height:${s.size}px;animation-delay:${s.delay}s"></i>`).join('')}</div>`;
/** The crescent that rises at ʿIshāʾ (shown by CSS only under that sky). */
export const moon = () => '<svg class="sk-moon" aria-hidden="true" width="64" height="64" viewBox="0 0 64 64"><path d="M40 8a24 24 0 1 0 16 40A19 19 0 1 1 40 8z" fill="#F3E6C4" opacity=".92"/></svg>';
export const knownSky = (k) => k in SKIES;
