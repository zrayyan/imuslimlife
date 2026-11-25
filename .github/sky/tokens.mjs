// Living Sky design tokens (task K01). Source of truth for the five skies and the two page
// themes; sky.css is generated from this table and the contrast test reads it, so a colour
// is changed in one place. Values are from the canvas "The five skies" board.
// Rule: text sits only in the upper sky (stops `top`, `mid`) and on the ground, never on the
// bright horizon glow (`glow`, decoration only). Every text pair here is tested at 4.5:1.

export const SKY_ORDER = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

export const SKIES = {
  fajr: { name: 'Fajr', night: true, stops: ['#0E1431', '#2A2C58', '#7A5A86', '#EBB09D'], ground: '#121633', groundInk: '#F4ECE6', ink: '#FBF4EA', soft: '#E6DDE0', accent: '#F6C2A8', inkOn: '#151A3A', glass: 'rgba(255,255,255,.08)', line: 'rgba(251,244,234,.26)', sun: '#FFD3B8', stars: 0.55 },
  dhuhr: { name: 'Dhuhr', night: false, stops: ['#BFD9DF', '#E3ECE6', '#F7EFD9'], ground: '#D5C7A6', groundInk: '#1E2A20', ink: '#13241B', soft: '#34443A', accent: '#0E5C40', inkOn: '#F7F1E3', glass: 'rgba(255,253,248,.62)', line: 'rgba(19,36,27,.18)', sun: '#F4BE48', stars: 0 },
  asr: { name: 'Asr', night: false, stops: ['#E3C68C', '#EFD7A5', '#F8E7C2'], ground: '#C29E62', groundInk: '#22170A', ink: '#2A1C0C', soft: '#43321A', accent: '#52320A', inkOn: '#FAF0DC', glass: 'rgba(255,248,232,.55)', line: 'rgba(42,28,12,.2)', sun: '#E89F2E', stars: 0 },
  maghrib: { name: 'Maghrib', night: true, stops: ['#1E1433', '#5A2847', '#B9523E', '#F09A5A'], ground: '#241327', groundInk: '#FFF0E2', ink: '#FFF4E8', soft: '#F3E3DF', accent: '#FFC58F', inkOn: '#2A1426', glass: 'rgba(30,12,30,.28)', line: 'rgba(255,244,232,.28)', sun: '#FF9A55', stars: 0.3 },
  isha: { name: 'ʿIshāʾ', night: true, stops: ['#030B08', '#08201A', '#0E2A1E'], ground: '#030A07', groundInk: '#EFE7D6', ink: '#F7F1E3', soft: '#C9D0C6', accent: '#D9B46A', inkOn: '#0B2219', glass: 'rgba(255,255,255,.06)', line: 'rgba(247,241,227,.2)', sun: '#F3E6C4', stars: 1 },
};

// Gradient stop positions per stop count (the canvas gradients).
const POS = { 3: [0, 55, 100], 4: [0, 48, 76, 100] };
export const POS_FOR = { fajr: [0, 48, 76, 100], dhuhr: [0, 55, 100], asr: [0, 55, 100], maghrib: [0, 46, 74, 100], isha: [0, 62, 100] };

export const gradient = (key) => {
  const s = SKIES[key];
  return `linear-gradient(180deg,${s.stops.map((c, i) => `${c} ${POS_FOR[key][i] ?? POS[s.stops.length][i]}%`).join(',')})`;
};

export const PAGES = {
  day: { bg: '#F6F2E9', ink: '#15241C', soft: '#4F564E', card: '#FFFDF8', line: '#E4DCC8', gold: '#8A6420', accent: '#0E5C40', band: '#F2EEE2' },
  night: { bg: '#07150F', ink: '#F3ECDD', soft: '#A9B8AE', card: '#0D2219', line: '#1F3A2D', gold: '#D9B46A', accent: '#D9B46A', band: '#0A1D15' },
};

/** Which page theme sits under a sky. */
export const pageFor = (sky) => (SKIES[sky].night ? 'night' : 'day');
