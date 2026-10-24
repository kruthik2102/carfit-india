// New cars on sale in India, checked model by model on 24 October 2026 (see docs/data-review.md):
// prices are Delhi ex-showroom ₹ lakh as listed by CarDekho; feature splits from each model's variant
// breakdown; crash ratings from Bharat NCAP results (Autocar India's list) and Global NCAP.
// Efficiency is the claimed ARAI / MIDC figure; where a maker has not published one, the car's notes
// say the figure is an estimate. Prices and kit change often — verify with the maker or a dealer.
//
// Entry shorthand: eff = claimed kmpl / km-per-kg per fuel; ev = { kwh, range } (largest battery);
// trans 'M' | 'A' | 'MA'; std / hi = space-separated feature keys (see js/features.js) that are
// standard on every variant / only on higher variants. Anything not listed is "not offered".
//
// variants (optional) = the trim ladder, cheapest trim first: [name, { powertrain: ₹ lakh }, 'keys added', note?].
// Each trim has everything below it plus what it adds. Powertrain codes are fuel-gearbox: P petrol,
// D diesel, C CNG, H strong hybrid, E electric; M manual, A automatic ('P-M', 'D-A'). Colour and
// edition variants are left out. When a car has variants, its price range, gearboxes and ✓/◐/✗ marks
// are derived from them, so std / hi / price / trans are not needed.

import { ALL_FEATURES, FEATURE_KEYS } from '../features.js';

export const DATA_LAST_REVIEWED = 'October 2026';

export const BODY_TYPES = ['Hatchback', 'Sedan', 'Compact SUV', 'Mid-size SUV', 'Full-size SUV', 'MPV/MUV', 'Off-roader', 'Pickup'];

export function feats(std, hi = '') {
  const out = Object.fromEntries(ALL_FEATURES.map((f) => [f.key, 'no']));
  const put = (list, v) => {
    for (const k of list.split(/\s+/).filter(Boolean)) {
      if (!FEATURE_KEYS.has(k)) throw new Error(`Unknown feature key "${k}"`);
      out[k] = v;
    }
  };
  put(hi, 'higher');
  put(std, 'std');
  // A panoramic sunroof is a sunroof.
  if (out.panoSunroof === 'std') out.sunroof = 'std';
  if (out.panoSunroof === 'higher' && out.sunroof === 'no') out.sunroof = 'higher';
  return out;
}

export const PT_FUEL = { P: 'Petrol', D: 'Diesel', C: 'CNG', H: 'Strong hybrid', E: 'Electric' };
export const PT_TRANS = { M: 'Manual', A: 'Automatic' };

const keysOf = (list) =>
  list.split(/\s+/).filter(Boolean).map((k) => {
    if (!FEATURE_KEYS.has(k)) throw new Error(`Unknown feature key "${k}"`);
    return k;
  });

export function ladder(rows) {
  const acc = new Set();
  return rows.map(([name, prices, adds = '', note = '']) => {
    const added = keysOf(adds);
    added.forEach((k) => acc.add(k));
    if (acc.has('panoSunroof')) acc.add('sunroof');
    const options = Object.entries(prices).map(([code, price]) => {
      const [f, t] = code.split('-');
      if (!PT_FUEL[f] || !PT_TRANS[t]) throw new Error(`Unknown powertrain "${code}" on ${name}`);
      return { fuel: PT_FUEL[f], trans: PT_TRANS[t], price };
    });
    return { name, options, adds: added, has: new Set(acc), note };
  });
}

function featsFromLadder(variants) {
  const first = variants[0].has;
  const all = variants[variants.length - 1].has;
  return Object.fromEntries(ALL_FEATURES.map((f) => [f.key, first.has(f.key) ? 'std' : all.has(f.key) ? 'higher' : 'no']));
}

const B = (stars, year) => ({ agency: 'Bharat NCAP', stars, year });
const G = (stars, year) => ({ agency: 'Global NCAP', stars, year });
const TRANS = { M: ['Manual'], A: ['Automatic'], MA: ['Manual', 'Automatic'] };
const slug = (s) => s.toLowerCase().replace(/ë/g, 'e').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

function car(brand, o) {
  const eff = o.eff ?? {};
  const variants = o.variants ? ladder(o.variants) : null;
  const prices = variants?.flatMap((v) => v.options.map((x) => x.price)) ?? o.price;
  const trans = variants
    ? ['Manual', 'Automatic'].filter((t) => variants.some((v) => v.options.some((x) => x.trans === t)))
    : TRANS[o.trans];
  return {
    id: slug(`${brand} ${o.model}`),
    brand,
    model: o.model,
    body: o.body,
    under4m: !!o.u4,
    seats: o.seats,
    priceMin: Math.min(...prices),
    priceMax: Math.max(...prices),
    fuels: [...Object.keys(eff), ...(o.ev ? ['Electric'] : [])],
    eff,
    ev: o.ev ?? null,
    trans,
    ncap: o.ncap ?? null,
    airbags: o.airbags,
    launch: o.launch,
    updated: o.updated ?? o.launch,
    features: variants ? featsFromLadder(variants) : feats(o.std, o.hi),
    variants,
    notes: o.notes ?? '',
  };
}

const brand = (name, list) => list.map((o) => car(name, o));

// Feature bundles that recur across a maker's range.
const MS_BASE = 'airbags6 esc hillHold belts3pt';
const HY_BASE = 'airbags6 esc hillHold belts3pt isofix';
const MID_STD = 'airbags6 esc hillHold belts3pt isofix tpms rearCam';
const PREMIUM_ALL =
  'airbags6 esc hillHold belts3pt isofix tpms rearCam cam360 rearDisc epb adas bsm frontSensors autoAC rearAC cruise rearHeadrests ' +
  'powerSeat ventSeats keyless autoHeadlamps rainWipers autoIRVM autoFoldORVM ledHeadlamps rearArmrest connected digitalCluster screen10 wirelessCharger premiumSound';

const maruti = brand('Maruti Suzuki', [
  { model: 'Alto K10', body: 'Hatchback', u4: 1, seats: [5], eff: { Petrol: 24.9, CNG: 33.85 },
    ncap: G(2, 2023), airbags: 6, launch: 2022, updated: 2025,
    variants: [
      ['STD (O)', { 'P-M': 3.7 }, MS_BASE],
      ['LXi (O)', { 'P-M': 4.0, 'C-M': 4.84 }, ''],
      ['VXi (O)', { 'P-M': 4.52, 'P-A': 4.97, 'C-M': 5.34 }, ''],
      ['VXi+ (O)', { 'P-M': 5.0, 'P-A': 5.45 }, '', 'Touchscreen with wired Android Auto/CarPlay.'],
    ] },
  { model: 'S-Presso', body: 'Hatchback', u4: 1, seats: [5], eff: { Petrol: 25.3, CNG: 32.73 },
    ncap: G(1, 2022), airbags: 6, launch: 2019, updated: 2025,
    variants: [
      ['STD (O)', { 'P-M': 3.5 }, MS_BASE],
      ['LXi (O)', { 'P-M': 3.82, 'C-M': 4.64 }, ''],
      ['VXi (O)', { 'P-M': 4.32, 'P-A': 4.77, 'C-M': 5.14 }, 'connected'],
      ['VXi+ (O)', { 'P-M': 4.82, 'P-A': 5.27 }, '', 'Touchscreen with wired Android Auto/CarPlay.'],
    ] },
  { model: 'Celerio', body: 'Hatchback', u4: 1, seats: [5], eff: { Petrol: 26.68, CNG: 34.43 },
    ncap: G(3, 2025), airbags: 6, launch: 2021, updated: 2025,
    variants: [
      ['LXi', { 'P-M': 4.7 }, `${MS_BASE} isofix`],
      ['VXi', { 'P-M': 5.18, 'P-A': 5.63, 'C-M': 5.98 }, ''],
      ['ZXi', { 'P-M': 5.73, 'P-A': 6.18 }, 'keyless'],
      ['ZXi+', { 'P-M': 6.3, 'P-A': 6.75 }, 'ledHeadlamps autoFoldORVM rearWiper'],
    ] },
  { model: 'Wagon R', body: 'Hatchback', u4: 1, seats: [5], eff: { Petrol: 25.19, CNG: 34.05 },
    ncap: G(1, 2023), airbags: 6, launch: 2019, updated: 2026,
    variants: [
      ['LXi', { 'P-M': 4.99, 'C-M': 5.94 }, MS_BASE],
      ['VXi', { 'P-M': 5.54, 'P-A': 5.99, 'C-M': 6.49 }, ''],
      ['ZXi', { 'P-M': 5.98, 'P-A': 6.43 }, 'keyless', '1.2 petrol from here.'],
      ['ZXi+', { 'P-M': 6.41, 'P-A': 6.86 }, 'autoFoldORVM'],
      ['Flex Fuel', { 'P-M': 7.24 }, '', 'Runs on petrol or up to E85 ethanol blend.'],
    ],
    notes: 'A flex-fuel (E85) variant was added in June 2026.' },
  { model: 'Swift', body: 'Hatchback', u4: 1, seats: [5], eff: { Petrol: 25.35, CNG: 35.07 },
    airbags: 6, launch: 2024,
    variants: [
      ['LXi', { 'P-M': 5.84 }, `${MS_BASE} isofix`],
      ['VXi', { 'P-M': 6.68, 'P-A': 7.13, 'C-M': 7.57, 'C-A': 7.92 }, 'wirelessAA'],
      ['VXi (O)', { 'P-M': 6.94, 'P-A': 7.39, 'C-M': 7.83, 'C-A': 8.18 }, 'keyless connected autoFoldORVM'],
      ['ZXi', { 'P-M': 7.62, 'P-A': 8.07, 'C-M': 8.51, 'C-A': 8.86 }, 'ledHeadlamps autoHeadlamps rearCam autoAC rearAC wirelessCharger rearWiper rearHeadrests'],
      ['ZXi Plus', { 'P-M': 8.29, 'P-A': 8.74 }, 'premiumSound cruise'],
    ],
    notes: 'The 2018 model scored 1 star (Global NCAP 2022); the current generation has not been tested.' },
  { model: 'Dzire', body: 'Sedan', u4: 1, seats: [5], eff: { Petrol: 25.15, CNG: 35.63 },
    ncap: B(5, 2025), airbags: 6, launch: 2024, updated: 2026,
    variants: [
      ['LXi', { 'P-M': 6.31 }, `${MS_BASE} isofix`],
      ['VXi', { 'P-M': 7.27, 'P-A': 7.72, 'C-M': 8.18, 'C-A': 8.53 }, 'wirelessAA keyless autoAC rearAC rearHeadrests rearArmrest'],
      ['ZXi', { 'P-M': 8.28, 'P-A': 8.73, 'C-M': 9.19, 'C-A': 9.54 }, 'ledHeadlamps autoHeadlamps rearCam tpms cruise connected'],
      ['ZXi Plus', { 'P-M': 8.96, 'P-A': 9.41 }, 'sunroof cam360 wirelessCharger autoFoldORVM premiumSound'],
    ],
    notes: 'Also rated 5 stars by Global NCAP (2024).' },
  { model: 'Baleno', body: 'Hatchback', u4: 1, seats: [5], eff: { Petrol: 23.8, CNG: 33.61 },
    ncap: B(4, 2025), airbags: 6, launch: 2022, updated: 2026,
    variants: [
      ['Sigma', { 'P-M': 5.99 }, `${MS_BASE} isofix rearHeadrests`],
      ['Delta', { 'P-M': 7.0, 'P-A': 7.5, 'C-M': 7.92, 'C-A': 8.32 }, 'wirelessAA tpms rearAC'],
      ['Zeta', { 'P-M': 8.0, 'P-A': 8.5, 'C-M': 8.92, 'C-A': 9.32 }, 'ledHeadlamps keyless autoAC wirelessCharger connected rearCam rearWiper'],
      ['Alpha', { 'P-M': 9.1, 'P-A': 9.6 }, 'cam360 cruise ventSeats autoIRVM autoFoldORVM hud premiumSound'],
      ['Alpha (O)', { 'P-M': 9.5, 'P-A': 9.99 }, 'adas'],
    ],
    notes: '2026 facelift with a 3-cylinder engine; the crash rating is for the pre-facelift car.' },
  { model: 'Fronx', body: 'Compact SUV', u4: 1, seats: [5], eff: { Petrol: 21.79, CNG: 28.51 },
    airbags: 6, launch: 2023,
    variants: [
      ['Sigma', { 'P-M': 6.9, 'C-M': 7.94 }, `${MS_BASE} isofix autoAC rearHeadrests`],
      ['Delta', { 'P-M': 7.75, 'P-A': 8.25, 'C-M': 8.74 }, 'keyless'],
      ['Delta+', { 'P-M': 8.14, 'P-A': 8.64 }, 'wirelessAA', 'Also with the 1.0 turbo (manual) from ₹8.97 L.'],
      ['Zeta', { 'P-M': 9.76, 'P-A': 11.04 }, 'ledHeadlamps rearWiper rearCam wirelessCharger rearAC connected autoHeadlamps', '1.0 turbo-petrol only.'],
      ['Alpha', { 'P-M': 10.61, 'P-A': 11.89 }, 'cam360 cruise hud premiumSound autoFoldORVM autoIRVM', '1.0 turbo-petrol only.'],
    ] },
  { model: 'Brezza', body: 'Compact SUV', u4: 1, seats: [5], eff: { Petrol: 19.96, CNG: 26.9 },
    ncap: B(5, 2026), airbags: 6, launch: 2022, updated: 2026,
    variants: [
      ['LXi', { 'P-M': 7.5, 'C-M': 9.4 }, `${MS_BASE} isofix rearAC`],
      ['VXi', { 'P-M': 8.65, 'P-A': 10.61, 'C-M': 9.99 }, 'wirelessAA autoAC rearHeadrests'],
      ['ZXi', { 'P-M': 9.95, 'P-A': 11.85, 'C-M': 11.6 }, 'sunroof wirelessCharger keyless rearArmrest ledHeadlamps rearCam', 'The turbo ZXi also has TPMS, blind-spot monitor, front sensors, auto headlamps and rear wiper.'],
      ['ZXi Plus', { 'P-M': 11.26, 'P-A': 13.55 }, 'screen10 cam360 hud ventSeats cruise autoFoldORVM connected autoHeadlamps tpms bsm frontSensors rearWiper'],
    ],
    notes: 'July 2026 facelift. Manual petrol versions use the new 1.0 turbo; automatics use the 1.5.' },
  { model: 'Grand Vitara', body: 'Mid-size SUV', seats: [5], eff: { Petrol: 21.11, 'Strong hybrid': 27.97, CNG: 26.6 },
    airbags: 6, launch: 2022, updated: 2025,
    variants: [
      ['Sigma', { 'P-M': 10.77 }, `${MS_BASE} isofix keyless autoAC rearAC autoFoldORVM`],
      ['Delta', { 'P-M': 12.15, 'P-A': 13.5, 'C-M': 13.05, 'H-A': 16.68 }, 'wirelessAA cruise tpms rearCam connected'],
      ['Zeta', { 'P-M': 13.85, 'P-A': 15.2, 'C-M': 14.65, 'H-A': 17.97 }, 'ledHeadlamps autoHeadlamps autoIRVM rearWiper ventSeats premiumSound'],
      ['Zeta Opt', { 'P-M': 13.89, 'P-A': 15.24, 'H-A': 18.55 }, 'panoSunroof'],
      ['Alpha', { 'P-M': 15.35, 'P-A': 16.7, 'H-A': 19.55 }, 'cam360 hud powerSeat sunshades wirelessCharger rearHeadrests rearArmrest digitalCluster epb rearDisc', 'AWD automatic from ₹18.05 L.'],
      ['Alpha Opt', { 'P-M': 15.39, 'P-A': 16.74, 'H-A': 19.62 }, ''],
    ],
    notes: 'Strong-hybrid versions add a digital cluster from the Delta+ trim.' },
  { model: 'Victoris', body: 'Mid-size SUV', seats: [5], eff: { Petrol: 21.18, 'Strong hybrid': 28.65, CNG: 27.02 },
    ncap: B(5, 2025), airbags: 6, launch: 2025,
    variants: [
      ['LXi', { 'P-M': 10.5, 'C-M': 11.55 }, `${MS_BASE} isofix keyless autoAC rearAC wirelessAA rearArmrest`],
      ['VXi', { 'P-M': 11.85, 'P-A': 13.41, 'C-M': 12.9, 'H-A': 16.43 }, 'rearCam tpms epb cruise screen10', 'Electronic parking brake on automatics.'],
      ['ZXi', { 'P-M': 13.62, 'P-A': 15.18, 'C-M': 14.67, 'H-A': 17.85 }, 'ledHeadlamps autoFoldORVM autoIRVM digitalCluster wirelessCharger connected'],
      ['ZXi (O)', { 'P-M': 13.69, 'P-A': 15.25, 'H-A': 18.44 }, 'panoSunroof'],
      ['ZXi Plus', { 'P-M': 15.39, 'P-A': 17.34, 'H-A': 19.52 }, 'cam360 frontSensors adas hud ventSeats powerSeat premiumSound autoHeadlamps rainWipers rearWiper rearDisc rearHeadrests', 'ADAS only on the petrol automatic and AWD.'],
      ['ZXi Plus (O)', { 'P-M': 15.48, 'P-A': 17.43, 'H-A': 19.99 }, ''],
    ],
    notes: 'Also rated 5 stars by Global NCAP (2025).' },
  { model: 'Ertiga', body: 'MPV/MUV', seats: [7], eff: { Petrol: 20.51, CNG: 26.11 },
    ncap: G(3, 2019), airbags: 6, launch: 2018, updated: 2025,
    variants: [
      ['LXi', { 'P-M': 8.9 }, `${MS_BASE} isofix`],
      ['VXi', { 'P-M': 9.95, 'P-A': 11.3, 'C-M': 10.94 }, 'rearAC'],
      ['ZXi', { 'P-M': 11.02, 'C-M': 12.0 }, 'autoAC keyless rearWiper connected'],
      ['ZXi+', { 'P-M': 11.69, 'P-A': 13.14 }, 'wirelessAA premiumSound autoHeadlamps cruise autoFoldORVM rearCam tpms'],
    ],
    notes: 'Crash rating is from 2019, when it had 2 airbags.' },
  { model: 'XL6', body: 'MPV/MUV', seats: [6], eff: { Petrol: 20.97, CNG: 26.32 },
    airbags: 6, launch: 2019, updated: 2022,
    variants: [
      ['Zeta', { 'P-M': 11.62, 'P-A': 12.97, 'C-M': 12.61 }, `${MS_BASE} isofix autoAC rearAC cruise keyless ledHeadlamps rearWiper rearArmrest`],
      ['Alpha', { 'P-M': 12.59, 'P-A': 13.94 }, 'cam360 premiumSound wirelessAA autoHeadlamps connected autoFoldORVM'],
      ['Alpha Plus', { 'P-M': 13.17, 'P-A': 14.52 }, 'tpms ventSeats hud'],
    ] },
  { model: 'Invicto', body: 'MPV/MUV', seats: [7, 8], eff: { 'Strong hybrid': 23.24 },
    ncap: B(5, 2025), airbags: 6, launch: 2023,
    variants: [
      ['Zeta Plus', { 'H-A': 25.02 }, 'airbags6 esc hillHold belts3pt isofix rearCam rearDisc epb autoAC rearAC cruise digitalCluster ledHeadlamps connected rearArmrest autoHeadlamps rearWiper autoFoldORVM cam360 panoSunroof ventSeats', '8-seat version ₹25.37 L.'],
      ['Alpha Plus', { 'H-A': 28.7 }, 'hud premiumSound powerSeat tpms screen10 wirelessAA keyless sunshades'],
    ] },
  { model: 'Jimny', body: 'Off-roader', seats: [4], eff: { Petrol: 16.94 },
    airbags: 6, launch: 2023,
    variants: [
      ['Zeta', { 'P-M': 12.59, 'P-A': 13.65 }, `${MS_BASE} isofix rearCam keyless rearWiper`],
      ['Alpha', { 'P-M': 13.46, 'P-A': 14.52 }, 'autoAC cruise wirelessAA autoHeadlamps ledHeadlamps autoFoldORVM'],
    ] },
  { model: 'Eeco', body: 'MPV/MUV', seats: [5, 7], eff: { Petrol: 19.71, CNG: 26.78 },
    airbags: 6, launch: 2010, updated: 2025,
    variants: [
      ['5 Seater STD', { 'P-M': 5.28 }, 'airbags6 esc belts3pt isofix', '6-seat version ₹5.55 L.'],
      ['5 Seater AC', { 'P-M': 5.61, 'C-M': 6.46 }, '', 'Adds air conditioning.'],
    ] },
  { model: 'e Vitara', body: 'Mid-size SUV', seats: [5], ev: { kwh: 61, range: 543 },
    ncap: B(5, 2025), airbags: 7, launch: 2026,
    variants: [
      ['Delta', { 'E-A': 16.19 }, 'airbags6 esc hillHold belts3pt isofix tpms frontSensors epb rearDisc autoAC keyless wirelessAA screen10 digitalCluster premiumSound', '49 kWh battery, 440 km claimed.'],
      ['Zeta', { 'E-A': 17.94 }, 'wirelessCharger rearCam'],
      ['Alpha', { 'E-A': 20.21 }, 'adas cam360 ventSeats powerSeat sunroof ledHeadlamps cruise'],
    ] },
]);

const hyundai = brand('Hyundai', [
  { model: 'Grand i10 Nios', body: 'Hatchback', u4: 1, seats: [5], eff: { Petrol: 20.7, CNG: 27.3 },
    ncap: G(2, 2020), airbags: 6, launch: 2019, updated: 2026,
    variants: [
      ['Era', { 'P-M': 5.6 }, 'airbags6 belts3pt rearHeadrests'],
      ['Magna', { 'P-M': 6.37, 'P-A': 6.85, 'C-M': 7.33 }, 'rearAC tpms', 'The AMT adds ESC, hill-hold and auto-folding mirrors.'],
      ['Corporate', { 'P-M': 6.6, 'P-A': 7.21 }, ''],
      ['Sportz', { 'P-M': 6.93, 'P-A': 7.45, 'C-M': 7.59 }, 'esc hillHold rearCam cruise autoHeadlamps autoFoldORVM'],
      ['Sportz (O)', { 'P-M': 7.18, 'P-A': 7.72 }, 'keyless autoAC'],
      ['Asta', { 'P-M': 7.57, 'P-A': 8.09 }, 'isofix rearWiper wirelessCharger wirelessAA'],
    ],
    notes: 'ESC is not on the base variants. Crash rating predates the 6-airbag update.' },
  { model: 'Exter', body: 'Compact SUV', u4: 1, seats: [5], eff: { Petrol: 19.4, CNG: 27.1 },
    airbags: 6, launch: 2023, updated: 2026,
    variants: [
      ['HX2', { 'P-M': 5.81, 'C-M': 7.0 }, `${HY_BASE} digitalCluster`],
      ['HX3', { 'P-M': 6.34, 'P-A': 6.99, 'C-M': 7.5 }, 'wirelessAA rearCam'],
      ['HX4', { 'P-M': 7.32, 'C-M': 8.33 }, 'tpms rearAC'],
      ['HX4 Plus', { 'P-A': 8.14 }, 'sunroof autoFoldORVM'],
      ['HX6', { 'P-M': 8.03, 'P-A': 8.63, 'C-M': 9.0 }, 'autoAC cruise keyless'],
      ['HX8', { 'P-M': 8.44, 'P-A': 9.16, 'C-M': 9.47 }, 'autoHeadlamps wirelessCharger rearWiper'],
      ['HX10', { 'P-A': 9.5 }, 'connected'],
    ],
    notes: 'Facelift launched March 2026.' },
  { model: 'i20', body: 'Hatchback', u4: 1, seats: [5], eff: { Petrol: 20.35 },
    airbags: 6, launch: 2020, updated: 2023,
    variants: [
      ['Era', { 'P-M': 6.0 }, HY_BASE],
      ['Magna Executive', { 'P-M': 6.75 }, 'tpms autoHeadlamps'],
      ['Magna', { 'P-M': 7.05 }, 'sunroof rearAC'],
      ['Sportz', { 'P-M': 7.85, 'P-A': 8.86 }, 'wirelessAA rearCam cruise autoAC keyless autoFoldORVM'],
      ['Sportz (O)', { 'P-M': 8.39, 'P-A': 9.31 }, 'premiumSound'],
      ['Asta', { 'P-M': 8.71 }, 'ledHeadlamps wirelessCharger rearWiper'],
      ['Asta (O)', { 'P-M': 9.25, 'P-A': 10.44 }, 'screen10 connected rearHeadrests'],
    ] },
  { model: 'Aura', body: 'Sedan', u4: 1, seats: [5], eff: { Petrol: 20.5, CNG: 28 },
    airbags: 6, launch: 2020, updated: 2023,
    variants: [
      ['E', { 'P-M': 6.0, 'C-M': 6.9 }, 'airbags6 belts3pt rearHeadrests'],
      ['S', { 'P-M': 6.98, 'P-A': 7.39, 'C-M': 7.89 }, 'rearAC rearArmrest tpms'],
      ['SX', { 'P-M': 7.77, 'C-M': 8.67 }, 'esc hillHold rearCam cruise keyless wirelessCharger'],
      ['SX (O)', { 'P-M': 8.23 }, 'autoAC autoHeadlamps isofix wirelessAA'],
      ['SX+ AMT', { 'P-A': 8.42 }, ''],
    ],
    notes: 'ESC is not on the base variants.' },
  { model: 'Venue', body: 'Compact SUV', u4: 1, seats: [5], eff: { Petrol: 18.5, Diesel: 20.99 },
    ncap: B(5, 2026), airbags: 6, launch: 2025,
    variants: [
      ['HX 2', { 'P-M': 8.0, 'D-M': 9.95 }, 'airbags6 esc hillHold belts3pt isofix rearDisc rearAC screen10 wirelessAA autoHeadlamps autoIRVM'],
      ['HX 4', { 'P-M': 9.0 }, 'tpms rearCam frontSensors autoFoldORVM'],
      ['HX 5', { 'P-M': 9.56, 'P-A': 10.95, 'D-M': 11.0, 'D-A': 11.94 }, 'sunroof cruise keyless'],
      ['HX 5 Plus', { 'P-M': 10.0 }, 'ledHeadlamps rearWiper sunshades wirelessCharger'],
      ['HX 6', { 'P-M': 10.43, 'P-A': 12.21 }, 'autoAC rearHeadrests'],
      ['HX 6T', { 'P-M': 10.89 }, 'connected'],
      ['HX 7', { 'D-M': 12.82 }, 'rearArmrest'],
      ['HX 8', { 'P-M': 11.94, 'P-A': 13.03, 'D-A': 13.77 }, 'ventSeats powerSeat epb', 'Turbo-petrol or diesel only.'],
      ['HX 10', { 'P-A': 14.68, 'D-A': 15.65 }, 'adas cam360 bsm digitalCluster premiumSound'],
    ],
    notes: 'Second-generation model launched November 2025. Automatic petrol versions use the 1.0 turbo.' },
  { model: 'Verna', body: 'Sedan', seats: [5], eff: { Petrol: 18.6 },
    ncap: G(5, 2023), airbags: 7, launch: 2023, updated: 2026,
    variants: [
      ['HX2', { 'P-M': 10.99 }, `${HY_BASE} autoHeadlamps rearArmrest`],
      ['HX4', { 'P-M': 12.31 }, 'sunroof cruise tpms wirelessAA autoAC rearAC'],
      ['HX6', { 'P-M': 13.25, 'P-A': 14.46 }, 'ledHeadlamps rearCam frontSensors sunshades rearHeadrests wirelessCharger keyless autoIRVM autoFoldORVM rainWipers'],
      ['HX6 Plus', { 'P-M': 13.87, 'P-A': 15.03 }, 'ventSeats premiumSound'],
      ['HX8', { 'P-M': 14.94, 'P-A': 16.15 }, 'screen10 powerSeat connected', 'Turbo HX8 (₹16.34–17.63 L) adds ADAS, rear discs and EPB.'],
      ['HX10', { 'P-A': 17.21 }, 'adas cam360 bsm digitalCluster rearDisc epb'],
    ],
    notes: 'Facelift launched March 2026; the crash rating is for the pre-facelift car.' },
  { model: 'Creta', body: 'Mid-size SUV', seats: [5], eff: { Petrol: 17.4, Diesel: 21.8 },
    ncap: G(3, 2022), airbags: 6, launch: 2024, updated: 2025,
    variants: [
      ['E', { 'P-M': 10.91, 'D-M': 12.61 }, `${HY_BASE} tpms rearDisc rearAC rearCam`],
      ['EX', { 'P-M': 12.07, 'D-M': 13.73 }, 'wirelessAA autoHeadlamps autoAC'],
      ['EX (O)', { 'P-M': 13.14, 'P-A': 14.5, 'D-M': 14.8, 'D-A': 16.15 }, 'ledHeadlamps frontSensors panoSunroof'],
      ['S (O)', { 'P-M': 14.21, 'P-A': 15.66, 'D-M': 15.92, 'D-A': 17.37 }, 'cruise epb keyless rearWiper'],
      ['SX', { 'P-M': 15.04 }, 'premiumSound ventSeats cam360 connected screen10'],
      ['SX Premium', { 'P-M': 16.34, 'P-A': 17.79, 'D-M': 18.0 }, 'powerSeat'],
      ['King', { 'P-M': 17.28, 'P-A': 18.69, 'D-M': 18.93, 'D-A': 19.81 }, 'adas digitalCluster wirelessCharger rainWipers bsm autoIRVM autoFoldORVM sunshades rearHeadrests rearArmrest', 'Turbo-petrol DCT ₹19.91 L.'],
    ],
    notes: 'Crash rating is from the previous generation. A new Creta is expected around December 2026.' },
  { model: 'Creta Electric', body: 'Mid-size SUV', seats: [5], ev: { kwh: 51.4, range: 510 },
    airbags: 6, launch: 2025,
    variants: [
      ['Executive', { 'E-A': 18.03 }, `${HY_BASE} tpms rearDisc epb rearCam autoAC rearAC cruise wirelessAA screen10 digitalCluster keyless autoHeadlamps ledHeadlamps autoFoldORVM rearWiper rearHeadrests`, '42 kWh battery (420 km claimed).'],
      ['Executive Tech', { 'E-A': 19.0 }, 'ventSeats panoSunroof sunshades'],
      ['Premium', { 'E-A': 20.0 }, 'powerSeat premiumSound wirelessCharger'],
      ['Excellence', { 'E-A': 21.3 }, 'adas cam360 bsm frontSensors rainWipers autoIRVM connected rearArmrest', '51.4 kWh Excellence LR ₹23.67 L.'],
    ],
    notes: 'Long-range 51.4 kWh versions cost ₹20–24.55 L.' },
  { model: 'Alcazar', body: 'Mid-size SUV', seats: [6, 7], eff: { Petrol: 17.5, Diesel: 20.4 },
    airbags: 6, launch: 2024,
    variants: [
      ['Executive', { 'P-M': 14.51, 'D-M': 15.5 }, `${HY_BASE} tpms rearCam rearDisc autoAC rearAC keyless autoFoldORVM ledHeadlamps rearWiper cruise`],
      ['Prestige', { 'P-M': 16.81, 'P-A': 18.08, 'D-M': 16.62 }, 'screen10 wirelessAA premiumSound wirelessCharger panoSunroof connected autoIRVM epb', 'Electronic parking brake on automatics only.'],
      ['Corporate', { 'D-M': 17.44, 'D-A': 18.81 }, ''],
      ['Platinum', { 'P-M': 19.01, 'P-A': 20.22, 'D-M': 19.01, 'D-A': 20.22 }, 'adas cam360 frontSensors digitalCluster rainWipers powerSeat'],
      ['Signature', { 'P-A': 20.96, 'D-A': 20.96 }, 'ventSeats sunshades rearHeadrests rearArmrest autoHeadlamps', '6-seat versions add rear captain seats with armrests.'],
    ],
    notes: 'Not crash-tested by any agency yet.' },
  { model: 'Ioniq 5', body: 'Mid-size SUV', seats: [5], ev: { kwh: 84, range: 690 }, airbags: 6, launch: 2023, updated: 2026,
    variants: [['Single version', { 'E-A': 55.7 }, `${PREMIUM_ALL} panoSunroof`]],
    notes: 'Facelift launched April 2026.' },
]);

const tata = brand('Tata', [
  { model: 'Tiago', body: 'Hatchback', u4: 1, seats: [5], eff: { Petrol: 19.01, CNG: 26.49 },
    ncap: G(4, 2020), airbags: 6, launch: 2016, updated: 2026,
    variants: [
      ['Smart', { 'P-M': 4.77, 'C-M': 5.87 }, 'airbags6 belts3pt isofix'],
      ['Pure', { 'P-M': 5.57, 'P-A': 6.1, 'C-M': 6.58, 'C-A': 7.13 }, ''],
      ['Pure+', { 'P-M': 6.1, 'C-M': 7.1, 'C-A': 7.65 }, 'wirelessAA cruise esc tpms hillHold rearCam'],
      ['Pure+ A', { 'C-M': 7.57, 'C-A': 8.12 }, 'rearAC autoAC autoHeadlamps rainWipers rearWiper'],
      ['Creative', { 'C-M': 8.07, 'C-A': 8.62 }, 'screen10 ledHeadlamps autoFoldORVM cam360 bsm'],
      ['Creative+', { 'P-A': 8.62 }, 'wirelessCharger connected keyless'],
    ],
    notes: 'May 2026 facelift; Tata has not published new mileage figures, so the outgoing claim is used. Crash rating is from 2020 (2 airbags). Some petrol trim prices were not listed.' },
  { model: 'Tiago EV', body: 'Hatchback', u4: 1, seats: [5], ev: { kwh: 24, range: 285 },
    airbags: 6, launch: 2022, updated: 2026,
    variants: [
      ['Smart 19', { 'E-A': 6.99 }, 'airbags6 belts3pt tpms isofix rearCam autoAC wirelessAA connected digitalCluster', '19.2 kWh battery (226 km claimed).'],
      ['Pure Plus 19', { 'E-A': 8.64 }, ''],
      ['Pure Plus 24', { 'E-A': 9.64 }, '', '24 kWh battery.'],
      ['Creative Plus 24', { 'E-A': 10.09 }, 'esc hillHold cam360 bsm rearAC cruise screen10 keyless autoHeadlamps rainWipers autoFoldORVM ledHeadlamps rearWiper'],
    ],
    notes: 'May 2026 facelift.' },
  { model: 'Altroz', body: 'Hatchback', u4: 1, seats: [5], eff: { Petrol: 19.3, Diesel: 23.6, CNG: 26.2 },
    ncap: B(5, 2025), airbags: 6, launch: 2020, updated: 2025,
    variants: [
      ['Smart', { 'P-M': 6.0, 'C-M': 7.3 }, HY_BASE],
      ['Pure', { 'P-M': 7.15, 'P-A': 7.72, 'C-M': 8.2, 'C-A': 8.75, 'D-M': 8.3 }, 'ledHeadlamps cruise autoAC autoFoldORVM rearCam rainWipers autoHeadlamps'],
      ['Pure S', { 'P-M': 7.45, 'P-A': 8.02, 'C-M': 8.5, 'C-A': 9.05 }, 'sunroof'],
      ['Creative', { 'P-M': 8.1, 'P-A': 8.67, 'C-M': 9.15, 'C-A': 9.7 }, 'screen10 wirelessAA keyless cam360'],
      ['Creative S', { 'P-M': 8.45, 'P-A': 9.02, 'C-M': 9.5, 'C-A': 10.0, 'D-M': 9.6 }, '', 'Petrol DCT from ₹9.65 L.'],
      ['Accomplished S', { 'P-M': 9.3, 'P-A': 10.5, 'C-M': 10.35, 'C-A': 10.9, 'D-M': 10.45 }, 'rearHeadrests rearArmrest wirelessCharger digitalCluster tpms premiumSound connected rearAC rearWiper'],
      ['Accomplished Plus S', { 'P-A': 10.75 }, 'bsm'],
    ] },
  { model: 'Punch', body: 'Compact SUV', u4: 1, seats: [5], eff: { Petrol: 20.09, CNG: 26.99 },
    ncap: B(5, 2026), airbags: 6, launch: 2021, updated: 2026,
    variants: [
      ['Smart', { 'P-M': 5.75, 'C-M': 6.85 }, `${HY_BASE} tpms ledHeadlamps`],
      ['Pure', { 'P-M': 6.65, 'C-M': 7.68 }, 'rearAC'],
      ['Pure Plus', { 'P-M': 7.17, 'P-A': 7.75, 'C-M': 8.2, 'C-A': 8.77 }, 'cruise wirelessAA rearCam'],
      ['Pure Plus S', { 'P-M': 7.52, 'P-A': 8.1, 'C-M': 8.55 }, 'sunroof'],
      ['Adventure', { 'P-M': 7.77, 'P-A': 8.35, 'C-M': 8.8, 'C-A': 9.37 }, 'keyless autoAC autoHeadlamps rainWipers cam360', 'Turbo-petrol from ₹8.47 L.'],
      ['Adventure S', { 'P-M': 8.12, 'C-M': 9.15, 'C-A': 9.72 }, ''],
      ['Accomplished', { 'P-M': 8.47, 'P-A': 9.05, 'C-M': 9.5 }, 'screen10'],
      ['Accomplished Plus S', { 'P-M': 9.17, 'P-A': 9.75, 'C-A': 10.77 }, 'wirelessCharger autoIRVM digitalCluster connected autoFoldORVM rearWiper rearArmrest'],
    ],
    notes: 'January 2026 facelift made 6 airbags standard.' },
  { model: 'Punch EV', body: 'Compact SUV', u4: 1, seats: [5], ev: { kwh: 40, range: 468 },
    ncap: B(5, 2026), airbags: 6, launch: 2024, updated: 2026,
    variants: [
      ['Smart 30', { 'E-A': 9.79 }, `${HY_BASE} tpms autoAC rearHeadrests`, '30 kWh battery (365 km claimed).'],
      ['Smart Plus 30', { 'E-A': 10.39 }, ''],
      ['Smart Plus 40', { 'E-A': 11.19 }, 'epb rearCam', '40 kWh battery from here.'],
      ['Adventure 40', { 'E-A': 11.94 }, 'keyless cruise'],
      ['Empowered 40', { 'E-A': 12.69 }, 'cam360 screen10 digitalCluster wirelessAA bsm autoHeadlamps rainWipers autoFoldORVM rearWiper connected'],
      ['Empowered+ S 40', { 'E-A': 12.99 }, 'sunroof ventSeats wirelessCharger ledHeadlamps autoIRVM rearArmrest premiumSound'],
    ],
    notes: 'February 2026 facelift. No rear AC vents.' },
  { model: 'Nexon', body: 'Compact SUV', u4: 1, seats: [5], eff: { Petrol: 17.44, Diesel: 23.23, CNG: 24 },
    ncap: B(5, 2024), airbags: 6, launch: 2023, updated: 2025,
    variants: [
      ['Smart', { 'P-M': 7.4, 'C-M': 8.35 }, 'airbags6 belts3pt isofix hillHold ledHeadlamps'],
      ['Smart Plus', { 'P-M': 8.22, 'P-A': 8.92, 'C-M': 9.27, 'D-M': 9.27 }, 'esc'],
      ['Pure Plus', { 'P-M': 9.07, 'P-A': 9.72, 'C-M': 10.0, 'D-M': 10.0, 'D-A': 10.87 }, 'screen10 wirelessAA rearAC'],
      ['Pure Plus S', { 'P-M': 9.37, 'P-A': 10.0, 'D-M': 10.52 }, 'sunroof'],
      ['Creative', { 'P-M': 10.17, 'P-A': 10.87, 'C-M': 11.22, 'D-M': 11.37, 'D-A': 11.97 }, 'autoAC cruise cam360 rearCam keyless autoHeadlamps rainWipers autoFoldORVM rearWiper', 'Petrol DCT ₹11.42 L.'],
      ['Creative Plus PS', { 'P-M': 11.47, 'P-A': 12.67, 'C-M': 12.47, 'D-M': 12.62, 'D-A': 13.27 }, 'panoSunroof wirelessCharger tpms connected frontSensors'],
      ['Fearless Plus PS', { 'P-M': 12.42, 'P-A': 13.77, 'C-M': 13.42, 'D-M': 13.57, 'D-A': 14.22 }, 'digitalCluster ventSeats adas premiumSound autoIRVM rearArmrest'],
    ],
    notes: 'ESC from the Smart Plus trim.' },
  { model: 'Nexon EV', body: 'Compact SUV', u4: 1, seats: [5], ev: { kwh: 45, range: 489 },
    ncap: B(5, 2024), airbags: 6, launch: 2023, updated: 2025,
    variants: [
      ['Creative Plus MR', { 'E-A': 12.49 }, `${HY_BASE} rearCam autoAC ledHeadlamps keyless digitalCluster`, '30 kWh battery (275 km claimed).'],
      ['Fearless MR', { 'E-A': 13.29 }, 'screen10 wirelessAA rearAC'],
      ['Creative 45', { 'E-A': 14.34 }, 'epb rearDisc', '45 kWh battery from here.'],
      ['Fearless 45', { 'E-A': 15.34 }, 'rearWiper'],
      ['Empowered 45', { 'E-A': 16.34 }, 'tpms frontSensors sunroof cruise autoHeadlamps rainWipers autoIRVM wirelessCharger rearArmrest'],
      ['Empowered+ A 45', { 'E-A': 17.89 }, 'adas cam360 bsm panoSunroof ventSeats premiumSound sunshades connected autoFoldORVM'],
    ] },
  { model: 'Curvv', body: 'Mid-size SUV', seats: [5], eff: { Petrol: 17.5, Diesel: 21 },
    ncap: B(5, 2024), airbags: 6, launch: 2024,
    variants: [
      ['Smart X', { 'P-M': 10.0 }, `${HY_BASE} ledHeadlamps rearArmrest`],
      ['Pure X', { 'P-M': 11.0, 'P-A': 12.3, 'D-M': 12.3 }, 'autoAC screen10 wirelessAA premiumSound cruise rearCam tpms autoFoldORVM rearAC'],
      ['Creative X+', { 'P-M': 12.91, 'P-A': 14.21, 'D-M': 14.21 }, 'cam360 frontSensors panoSunroof digitalCluster keyless autoHeadlamps rainWipers'],
      ['Accomplished X', { 'P-M': 14.0, 'P-A': 15.3, 'D-M': 15.3 }, 'powerSeat ventSeats wirelessCharger'],
      ['Accomplished X+', { 'P-A': 18.5, 'D-A': 18.75 }, 'adas bsm rearDisc epb autoIRVM connected sunshades rearHeadrests', 'Turbo-petrol or diesel DCT.'],
    ],
    notes: 'Tata has not published claimed mileage; figures are estimates.' },
  { model: 'Curvv EV', body: 'Mid-size SUV', seats: [5], ev: { kwh: 55, range: 502 },
    ncap: B(5, 2024), airbags: 6, launch: 2024,
    variants: [
      ['Accomplished X 55', { 'E-A': 17.19 }, `${HY_BASE} tpms rearCam rearDisc epb sunshades powerSeat autoAC rearAC wirelessAA screen10 digitalCluster connected wirelessCharger keyless autoHeadlamps rainWipers autoFoldORVM ledHeadlamps rearArmrest panoSunroof`],
      ['Empowered X 55', { 'E-A': 19.39 }, 'adas bsm ventSeats autoIRVM premiumSound cam360 frontSensors'],
    ],
    notes: 'The 45 kWh version was discontinued in May 2026.' },
  { model: 'Harrier', body: 'Mid-size SUV', seats: [5], eff: { Petrol: 14, Diesel: 16.8 },
    ncap: B(5, 2023), airbags: 7, launch: 2019, updated: 2026,
    variants: [
      ['Smart', { 'P-M': 13.0, 'D-M': 14.0 }, `${HY_BASE} autoAC rearAC digitalCluster ledHeadlamps`],
      ['Pure X', { 'P-M': 16.4, 'P-A': 17.9, 'D-M': 17.5, 'D-A': 19.0 }, 'cam360 rearCam autoHeadlamps rainWipers rearWiper panoSunroof cruise wirelessAA screen10 autoFoldORVM keyless'],
      ['Adventure X', { 'P-M': 17.25, 'P-A': 18.85, 'D-M': 18.5, 'D-A': 20.0 }, 'powerSeat'],
      ['Adventure X Plus', { 'P-M': 17.6, 'P-A': 19.2, 'D-M': 18.9, 'D-A': 20.45 }, 'adas epb rearDisc'],
      ['Fearless X', { 'P-M': 20.25, 'P-A': 22.0, 'D-M': 21.45, 'D-A': 23.0 }, 'tpms ventSeats sunshades rearArmrest autoIRVM wirelessCharger premiumSound'],
      ['Fearless X Plus', { 'P-M': 22.35, 'P-A': 23.8, 'D-M': 23.45, 'D-A': 24.9 }, 'frontSensors connected rearHeadrests', 'Adds a 7th (knee) airbag.'],
      ['Fearless Ultra', { 'P-M': 22.95, 'P-A': 24.4, 'D-M': 24.05, 'D-A': 25.5 }, '', '14.5-inch screen and digital rear-view mirror.'],
    ],
    notes: 'A 1.5 turbo-petrol was added in 2026; no official mileage yet, so the petrol figure is an estimate.' },
  { model: 'Harrier EV', body: 'Mid-size SUV', seats: [5], ev: { kwh: 75, range: 627 },
    ncap: B(5, 2025), airbags: 7, launch: 2025,
    variants: [
      ['Adventure 65', { 'E-A': 21.79 }, `${HY_BASE} tpms autoAC rearAC cruise powerSeat digitalCluster screen10 keyless ledHeadlamps rearArmrest rearDisc epb rearCam`, '65 kWh battery (538 km claimed).'],
      ['Adventure S 65', { 'E-A': 22.29 }, 'panoSunroof autoHeadlamps rainWipers'],
      ['Fearless Plus 65', { 'E-A': 24.29 }, 'cam360 ventSeats sunshades wirelessCharger premiumSound autoIRVM'],
      ['Fearless Plus 75', { 'E-A': 25.29 }, '', '75 kWh battery; dual-motor AWD from ₹26.79 L.'],
      ['Empowered 75', { 'E-A': 27.79 }, 'adas bsm wirelessAA frontSensors autoFoldORVM connected rearWiper'],
    ] },
  { model: 'Safari', body: 'Mid-size SUV', seats: [6, 7], eff: { Petrol: 14, Diesel: 16.3 },
    ncap: B(5, 2023), airbags: 7, launch: 2021, updated: 2026,
    variants: [
      ['Smart', { 'P-M': 13.4, 'D-M': 14.85 }, `${HY_BASE} rearDisc tpms ledHeadlamps autoAC rearAC digitalCluster`],
      ['Pure X', { 'P-M': 16.85, 'P-A': 18.35, 'D-M': 17.95, 'D-A': 19.45 }, 'cruise keyless panoSunroof cam360 rearCam screen10 wirelessAA autoHeadlamps rainWipers autoFoldORVM rearWiper'],
      ['Adventure X Plus', { 'P-M': 18.15, 'P-A': 19.8, 'D-M': 19.4, 'D-A': 21.05 }, 'adas powerSeat epb'],
      ['Accomplished X', { 'P-M': 21.3, 'P-A': 22.9, 'D-M': 22.35, 'D-A': 24.0 }, 'ventSeats wirelessCharger autoIRVM premiumSound sunshades rearArmrest'],
      ['Accomplished X Plus', { 'P-M': 23.05, 'P-A': 24.5, 'D-M': 24.15, 'D-A': 25.6 }, 'frontSensors connected bsm rearHeadrests'],
      ['Accomplished Ultra', { 'P-M': 23.65, 'P-A': 25.1, 'D-M': 24.75, 'D-A': 26.2 }, '', '14.5-inch screen and digital rear-view mirror.'],
    ],
    notes: 'A 1.5 turbo-petrol was added in 2026; no official mileage yet, so the petrol figure is an estimate.' },
  { model: 'Sierra', body: 'Mid-size SUV', seats: [5], eff: { Petrol: 17.4, Diesel: 21.26 },
    ncap: B(5, 2026), airbags: 6, launch: 2025,
    variants: [
      ['Smart Plus', { 'P-M': 11.49, 'D-M': 12.99 }, `${HY_BASE} rearDisc epb sunshades rearAC ledHeadlamps`],
      ['Smart Plus L', { 'P-M': 11.99, 'D-M': 13.49 }, 'autoFoldORVM'],
      ['Pure', { 'P-M': 13.14, 'P-A': 14.49, 'D-M': 14.59, 'D-A': 15.99 }, 'tpms rearCam cruise screen10 wirelessAA'],
      ['Pure L', { 'P-M': 13.79, 'P-A': 14.99, 'D-M': 15.24 }, 'rearWiper'],
      ['Pure L (O)', { 'P-M': 14.29, 'P-A': 15.59, 'D-M': 15.74, 'D-A': 16.99 }, 'panoSunroof autoHeadlamps rainWipers'],
      ['Pure Plus L', { 'P-M': 14.99, 'P-A': 16.29, 'D-M': 16.44, 'D-A': 17.74 }, 'powerSeat autoAC'],
      ['Adventure Plus', { 'P-M': 16.14, 'P-A': 17.44, 'D-M': 17.34, 'D-A': 18.64 }, 'cam360 bsm frontSensors digitalCluster rearArmrest keyless'],
      ['Adventure Plus L', { 'P-M': 16.99, 'P-A': 18.29, 'D-M': 18.19, 'D-A': 19.49 }, 'wirelessCharger'],
      ['Accomplished', { 'P-M': 17.99, 'P-A': 19.99, 'D-M': 18.99, 'D-A': 19.99 }, 'adas premiumSound hud'],
      ['Accomplished Plus', { 'P-A': 20.99, 'D-M': 20.29, 'D-A': 21.29 }, 'ventSeats autoIRVM connected rearHeadrests'],
    ],
    notes: 'Revived nameplate; deliveries began January 2026.' },
  { model: 'Sierra EV', body: 'Mid-size SUV', seats: [5], ev: { kwh: 75, range: 665 },
    airbags: 6, launch: 2026,
    variants: [
      ['Pure 63', { 'E-A': 18.79 }, `${HY_BASE} tpms rearDisc epb rearCam sunshades autoAC rearAC cruise rearHeadrests wirelessAA screen10 digitalCluster connected ledHeadlamps keyless autoHeadlamps rainWipers autoIRVM rearWiper`, '63 kWh battery (566 km claimed).'],
      ['Pure S 63', { 'E-A': 19.99 }, 'panoSunroof frontSensors autoFoldORVM'],
      ['Adventure 63', { 'E-A': 20.99 }, 'cam360 wirelessCharger premiumSound', '75 kWh Adventure ₹22.19 L.'],
      ['Empowered 63', { 'E-A': 22.79 }, 'ventSeats powerSeat rearArmrest'],
      ['Empowered A 75', { 'E-A': 24.79 }, 'adas hud bsm', 'Dual-motor AWD ₹25.99 L.'],
    ],
    notes: 'Launched June 2026. Not crash-tested yet.' },
  { model: 'Aeris', body: 'Sedan', u4: 1, seats: [5], eff: { Petrol: 19.01, CNG: 28.06 },
    airbags: 6, launch: 2026,
    variants: [
      ['Smart', { 'P-M': 5.3, 'C-M': 6.3 }, 'airbags6 belts3pt isofix'],
      ['Pure', { 'P-M': 6.15, 'P-A': 6.7, 'C-M': 7.15, 'C-A': 7.7 }, ''],
      ['Pure Plus', { 'P-M': 6.75, 'P-A': 7.3, 'C-M': 7.75, 'C-A': 8.3 }, 'esc hillHold tpms rearCam rearAC cruise wirelessAA', 'Cruise control on petrol only.'],
      ['Creative', { 'P-M': 7.5, 'P-A': 8.05, 'C-M': 8.5, 'C-A': 9.05 }, 'ledHeadlamps autoHeadlamps autoAC rainWipers cam360 bsm screen10'],
      ['Accomplished', { 'P-M': 8.2, 'P-A': 8.75, 'C-M': 9.2, 'C-A': 9.75 }, 'ventSeats wirelessCharger connected keyless'],
    ],
    notes: 'Compact sedan launched September 2026, replacing the Tigor. Petrol mileage not yet published; Tiago 1.2 figure used.' },
]);

const mahindra = brand('Mahindra', [
  { model: 'Bolero', body: 'MPV/MUV', seats: [7], eff: { Diesel: 16 },
    airbags: 2, launch: 2000, updated: 2025,
    variants: [
      ['B4', { 'D-M': 8.57 }, 'rearAC'],
      ['B6', { 'D-M': 9.37 }, '', '7-inch touchscreen.'],
      ['B6 (O)', { 'D-M': 9.69 }, 'rearWiper'],
      ['B8', { 'D-M': 9.99 }, 'rearHeadrests'],
    ] },
  { model: 'Bolero Neo', body: 'MPV/MUV', seats: [7], eff: { Diesel: 17.29 },
    ncap: G(1, 2024), airbags: 2, launch: 2021, updated: 2025,
    variants: [
      ['N4', { 'D-M': 9.06 }, ''],
      ['N8', { 'D-M': 9.69 }, 'rearWiper'],
      ['N10', { 'D-M': 9.97 }, 'keyless cruise isofix', '7-inch touchscreen with wireless CarPlay.'],
      ['N11', { 'D-M': 10.39 }, '', '9-inch touchscreen, leatherette seats.'],
    ],
    notes: 'October 2025 facelift. No rear camera or rear AC vents.' },
  { model: 'Thar', body: 'Off-roader', seats: [4], eff: { Petrol: 12.4, Diesel: 15.2 },
    ncap: G(4, 2020), airbags: 6, launch: 2020, updated: 2026,
    variants: [
      ['AXT', { 'D-M': 10.32 }, 'esc hillHold isofix rearAC keyless'],
      ['LXT', { 'D-M': 12.99, 'D-A': 16.49, 'P-M': 15.6, 'P-A': 14.77 }, 'cruise screen10 wirelessAA', 'Petrol manual is 4x4 only.'],
      ['ZXT', { 'D-M': 13.99, 'D-A': 17.49, 'P-M': 16.6, 'P-A': 16.09 }, 'airbags6 tpms rearCam wirelessCharger ledHeadlamps'],
    ],
    notes: 'Sold as the Thar OG; facelift launched September 2026. Mahindra has not published claimed mileage (Thar Roxx figures used). Crash rating is from 2020 (2 airbags).' },
  { model: 'Thar Roxx', body: 'Off-roader', seats: [5], eff: { Petrol: 12.4, Diesel: 15.2 },
    ncap: B(5, 2024), airbags: 6, launch: 2024,
    variants: [
      ['MX1', { 'P-M': 12.52, 'D-M': 14.23 }, `${HY_BASE} ledHeadlamps rearDisc`],
      ['MX3', { 'P-A': 15.28, 'D-M': 16.28, 'D-A': 17.82 }, 'rearCam cruise keyless autoHeadlamps rainWipers autoIRVM rearWiper'],
      ['MX5', { 'P-M': 16.64, 'P-A': 18.15, 'D-M': 17.07, 'D-A': 18.65 }, 'sunroof frontSensors tpms wirelessAA rearAC screen10'],
      ['AX3L', { 'D-M': 17.28 }, 'digitalCluster autoAC adas'],
      ['AX5L', { 'D-A': 19.41 }, 'panoSunroof connected'],
      ['AX7L', { 'P-A': 20.0, 'D-M': 19.57, 'D-A': 20.83 }, 'cam360 bsm ventSeats powerSeat premiumSound wirelessCharger rearArmrest autoFoldORVM', '4x4 diesel up to ₹23.52 L.'],
    ] },
  { model: 'XUV 3XO', body: 'Compact SUV', u4: 1, seats: [5], eff: { Petrol: 20.1, Diesel: 20.6, CNG: 24.7 },
    ncap: B(5, 2024), airbags: 6, launch: 2024,
    variants: [
      ['MX1', { 'P-M': 7.79 }, `${HY_BASE} rearAC rearDisc rearHeadrests`],
      ['REVX M', { 'P-M': 8.59 }, 'rearArmrest'],
      ['REVX M (O)', { 'P-M': 9.09, 'P-A': 9.99 }, 'sunroof'],
      ['REVX Edge (O)', { 'P-M': 9.89, 'P-A': 11.09, 'D-M': 11.09, 'D-A': 11.91, 'C-M': 10.79 }, 'screen10 wirelessAA cruise rearCam autoFoldORVM autoHeadlamps rainWipers keyless'],
      ['AX5', { 'P-M': 10.0, 'P-A': 11.88, 'D-M': 11.39, 'D-A': 12.2, 'C-M': 11.19 }, 'ledHeadlamps digitalCluster connected autoAC tpms rearWiper'],
      ['AX5 L', { 'P-M': 12.03, 'P-A': 13.28 }, 'wirelessCharger autoIRVM epb cam360 bsm adas', 'Turbo-petrol only.'],
      ['AX7', { 'P-M': 12.2, 'P-A': 13.34, 'D-M': 13.04 }, 'panoSunroof premiumSound frontSensors'],
      ['AX7 L', { 'P-M': 13.32, 'P-A': 15.04, 'D-M': 14.07 }, ''],
    ],
    notes: 'No ventilated or powered seats. The MX and REVX lines overlap; the ladder follows price.' },
  { model: 'XUV 3XO EV', body: 'Compact SUV', u4: 1, seats: [5], ev: { kwh: 39.4, range: 456 },
    airbags: 6, launch: 2026,
    variants: [
      ['AX5', { 'E-A': 13.89 }, `${HY_BASE} tpms rearCam rearDisc screen10 digitalCluster wirelessAA wirelessCharger keyless autoHeadlamps autoAC rearAC autoFoldORVM ledHeadlamps rearArmrest cruise`],
      ['AX7 L', { 'E-A': 14.96 }, 'frontSensors cam360 adas panoSunroof autoIRVM premiumSound'],
    ],
    notes: 'Launched January 2026. Not crash-tested yet.' },
  { model: 'XUV400 EV', body: 'Compact SUV', seats: [5], ev: { kwh: 39.4, range: 456 },
    airbags: 6, launch: 2023, updated: 2024,
    variants: [
      ['EC Pro', { 'E-A': 15.49 }, 'esc belts3pt tpms isofix rearDisc keyless autoIRVM cruise rearAC', '34.5 kWh battery (375 km claimed).'],
      ['EL Pro', { 'E-A': 16.74 }, 'airbags6 hillHold screen10 wirelessAA autoAC sunroof digitalCluster rearCam rearArmrest autoHeadlamps rearWiper wirelessCharger', '39.4 kWh EL Pro ₹17.49 L.'],
    ] },
  { model: 'Scorpio Classic', body: 'MPV/MUV', seats: [7, 9], eff: { Diesel: 14.44 },
    airbags: 2, launch: 2022,
    variants: [
      ['S', { 'D-M': 13.43 }, 'rearAC', '9-seat version ₹13.91 L.'],
      ['S11', { 'D-M': 17.48 }, 'cruise autoAC keyless'],
    ],
    notes: 'No ESC or rear camera.' },
  { model: 'Scorpio N', body: 'Mid-size SUV', seats: [6, 7], eff: { Petrol: 12.2, Diesel: 15.4 },
    ncap: G(5, 2022), airbags: 6, launch: 2022, updated: 2026,
    variants: [
      ['Z2', { 'P-M': 13.69, 'D-M': 14.19 }, 'esc hillHold belts3pt isofix rearDisc rearAC', '2 airbags.'],
      ['Z4', { 'P-M': 15.57, 'P-A': 17.16, 'D-M': 16.12, 'D-A': 17.68 }, 'rearWiper cruise'],
      ['Z6', { 'D-M': 17.17, 'D-A': 18.82 }, 'sunroof rearCam'],
      ['Z8S', { 'P-M': 17.79, 'P-A': 19.26, 'D-M': 18.79, 'D-A': 19.89 }, 'airbags6 ledHeadlamps digitalCluster wirelessAA connected screen10'],
      ['Z8', { 'D-M': 19.86, 'D-A': 21.41 }, 'autoAC wirelessCharger autoFoldORVM autoHeadlamps rainWipers keyless tpms'],
      ['Z8T', { 'P-M': 20.38, 'P-A': 21.85, 'D-M': 20.65, 'D-A': 22.35 }, 'powerSeat ventSeats premiumSound frontSensors autoIRVM epb'],
      ['Z8L', { 'P-M': 21.31, 'P-A': 22.87, 'D-M': 21.99, 'D-A': 23.59 }, 'panoSunroof cam360 adas bsm', '4x4 diesel up to ₹25.49 L.'],
    ],
    notes: 'August 2026 facelift; 6 airbags from Z8S. Crash rating carried over from the 2022 test.' },
  { model: 'XUV 7XO', body: 'Mid-size SUV', seats: [6, 7], eff: { Petrol: 13, Diesel: 16.5 },
    ncap: B(5, 2026), airbags: 7, launch: 2026,
    variants: [
      ['AX', { 'P-M': 13.99, 'D-M': 15.36 }, `${HY_BASE} tpms rearAC cruise rearArmrest wirelessAA screen10 digitalCluster keyless ledHeadlamps`],
      ['AX3', { 'P-M': 16.37, 'P-A': 17.88, 'D-M': 16.87, 'D-A': 18.38 }, 'rearCam rearWiper autoFoldORVM'],
      ['AX5', { 'P-M': 17.88, 'P-A': 19.38, 'D-M': 18.38, 'D-A': 19.89 }, 'panoSunroof frontSensors'],
      ['AX7', { 'P-M': 19.26, 'P-A': 20.68, 'D-M': 19.8, 'D-A': 21.16 }, 'cam360 powerSeat autoAC autoHeadlamps rainWipers bsm'],
      ['AX7T', { 'P-A': 22.76, 'D-M': 23.25, 'D-A': 23.25 }, 'adas epb ventSeats premiumSound wirelessCharger autoIRVM connected rearDisc'],
      ['AX7L', { 'P-A': 24.29, 'D-M': 24.96, 'D-A': 24.96 }, 'sunshades', 'Adds ventilated rear seats.'],
    ],
    notes: 'Replaced the XUV700 in January 2026. Mahindra has not published claimed mileage; figures are estimates.' },
  { model: 'BE 6', body: 'Mid-size SUV', seats: [5], ev: { kwh: 79, range: 683 },
    ncap: B(5, 2025), airbags: 7, launch: 2025,
    variants: [
      ['Pack One', { 'E-A': 19.45 }, `${HY_BASE} tpms rearCam rearDisc epb autoAC rearAC wirelessAA screen10 digitalCluster keyless autoHeadlamps rainWipers ledHeadlamps`, '59 kWh battery (548 km claimed).'],
      ['Pack Two', { 'E-A': 20.95 }, 'frontSensors cam360 autoIRVM autoFoldORVM wirelessCharger premiumSound'],
      ['Pack Three', { 'E-A': 21.95 }, 'panoSunroof powerSeat ventSeats bsm', '70 kWh Pack Three ₹22.95 L.'],
      ['Pack Three Plus', { 'E-A': 23.95 }, 'adas cruise rearArmrest', '79 kWh from ₹24.95 L.'],
      ['Pack Four', { 'E-A': 26.95 }, 'hud', '79 kWh battery.'],
    ],
    notes: 'Sold as the BE 6 SPORTEQ. The glass roof does not open.' },
  { model: 'XEV 9e', body: 'Mid-size SUV', seats: [5], ev: { kwh: 79, range: 656 },
    ncap: B(5, 2025), airbags: 7, launch: 2025,
    variants: [
      ['Pack One', { 'E-A': 21.9 }, `${HY_BASE} rearCam ledHeadlamps rearWiper autoAC rearAC cruise wirelessAA screen10 digitalCluster rearDisc epb keyless autoHeadlamps rainWipers`, '59 kWh battery (542 km claimed).'],
      ['Pack Two', { 'E-A': 24.9 }, 'adas frontSensors tpms powerSeat panoSunroof premiumSound wirelessCharger autoFoldORVM autoIRVM', '79 kWh Pack Two ₹26.50 L.'],
      ['Pack Three Select', { 'E-A': 27.9 }, 'ventSeats cam360 bsm sunshades rearArmrest'],
      ['Pack Three', { 'E-A': 30.5 }, 'hud', '79 kWh battery.'],
    ] },
  { model: 'XEV 9S', body: 'Mid-size SUV', seats: [6, 7], ev: { kwh: 79, range: 679 },
    airbags: 7, launch: 2025,
    variants: [
      ['Pack One Above', { 'E-A': 20.65 }, `${HY_BASE} tpms rearCam panoSunroof autoAC cruise wirelessAA keyless autoHeadlamps ledHeadlamps rearWiper screen10 digitalCluster rearAC rearDisc epb`, '59 kWh battery (521 km claimed); 79 kWh ₹22.65 L.'],
      ['Pack Two Above', { 'E-A': 25.05 }, 'adas cam360 frontSensors powerSeat ventSeats wirelessCharger premiumSound autoIRVM autoFoldORVM', '70 kWh battery.'],
      ['Pack Three', { 'E-A': 27.85 }, 'bsm sunshades rearArmrest', '79 kWh battery.'],
      ['Pack Three Above', { 'E-A': 29.95 }, 'hud'],
    ],
    notes: 'Launched November 2025. Not crash-tested yet.' },
]);

const kia = brand('Kia', [
  { model: 'Sonet', body: 'Compact SUV', u4: 1, seats: [5], eff: { Petrol: 18.4, Diesel: 24.1 },
    airbags: 6, launch: 2020, updated: 2024,
    variants: [
      ['HTE', { 'P-M': 7.45 }, 'airbags6 esc hillHold belts3pt tpms rearAC'],
      ['HTE (O)', { 'P-M': 7.88, 'D-M': 9.29, 'D-A': 10.0 }, 'sunroof sunshades'],
      ['HTK (O)', { 'P-M': 8.89, 'P-A': 10.0, 'D-M': 10.0, 'D-A': 11.09 }, 'autoFoldORVM autoAC rearCam wirelessAA rearWiper isofix', 'Petrol automatic is the 1.0 turbo DCT.'],
      ['HTK Plus', { 'P-M': 9.28, 'D-M': 10.65, 'D-A': 11.45 }, 'keyless wirelessCharger rearHeadrests rearArmrest'],
      ['HTK Plus (O)', { 'P-M': 9.76, 'P-A': 11.09, 'D-M': 11.15, 'D-A': 11.95 }, 'ledHeadlamps autoHeadlamps'],
      ['HTX', { 'P-A': 11.84, 'D-M': 11.6, 'D-A': 12.39 }, 'ventSeats cruise rearDisc'],
      ['GTX Plus', { 'P-A': 13.75, 'D-A': 14.36 }, 'adas cam360 screen10 digitalCluster powerSeat premiumSound connected autoIRVM bsm frontSensors'],
    ],
    notes: 'Not crash-tested.' },
  { model: 'Syros', body: 'Compact SUV', u4: 1, seats: [5], eff: { Petrol: 18.2, Diesel: 20.75 },
    ncap: B(5, 2025), airbags: 6, launch: 2025, updated: 2026,
    variants: [
      ['HTE', { 'P-M': 8.42 }, `${HY_BASE} rearCam rearAC wirelessAA screen10 digitalCluster tpms`],
      ['HTE (O)', { 'P-M': 9.22, 'D-M': 10.0 }, 'sunroof'],
      ['HTK (EX)', { 'P-M': 9.82, 'D-M': 10.62 }, 'ledHeadlamps autoHeadlamps'],
      ['HTK Plus', { 'P-M': 10.76, 'P-A': 11.96, 'D-M': 11.56, 'D-A': 12.76 }, 'panoSunroof cruise rearArmrest keyless epb rearDisc', 'Push start, EPB and rear discs on automatics.'],
      ['HTK Plus (O)', { 'P-M': 12.02, 'P-A': 13.22, 'D-M': 12.82, 'D-A': 14.02 }, 'rearWiper'],
      ['HTX', { 'P-A': 14.02, 'D-A': 14.82 }, 'ventSeats powerSeat wirelessCharger premiumSound sunshades autoFoldORVM autoAC'],
      ['HTX (O)', { 'P-A': 15.0, 'D-A': 15.82 }, 'connected autoIRVM'],
    ],
    notes: 'Kia dropped ADAS and the 360° camera in the 2026 update (sources disagree). No head-up display.' },
  { model: 'Seltos', body: 'Mid-size SUV', seats: [5], eff: { Petrol: 17, Diesel: 20.7 },
    ncap: B(5, 2026), airbags: 6, launch: 2026,
    variants: [
      ['HTE', { 'P-M': 11.25, 'D-M': 12.94 }, `${HY_BASE} tpms rearCam rearDisc cruise rearAC ledHeadlamps wirelessAA screen10`],
      ['HTE (O)', { 'P-M': 12.42, 'P-A': 13.72, 'D-M': 14.04, 'D-A': 15.32 }, 'epb rearHeadrests rearArmrest', 'EPB on automatics.'],
      ['HTK', { 'P-M': 13.42, 'P-A': 14.72, 'D-M': 15.04, 'D-A': 16.34 }, 'keyless sunshades rearWiper'],
      ['HTK (O)', { 'P-M': 14.52, 'P-A': 15.82, 'D-M': 16.14, 'D-A': 17.44 }, 'autoAC panoSunroof powerSeat ventSeats frontSensors wirelessCharger', 'Turbo DCT ₹16.62 L.'],
      ['HTX', { 'P-M': 15.92, 'P-A': 17.22, 'D-M': 17.54, 'D-A': 18.84 }, 'connected premiumSound autoIRVM autoHeadlamps'],
      ['HTX (A)', { 'P-M': 17.02, 'P-A': 18.32, 'D-M': 18.64, 'D-A': 19.94 }, 'adas cam360 digitalCluster'],
      ['GTX (O)', { 'P-A': 21.57, 'D-A': 21.82 }, 'rainWipers', 'Turbo-petrol DCT or diesel AT; GTX without ADAS from ₹18.72 L.'],
    ],
    notes: 'Second generation, launched 2026. Kia has not published claimed mileage; previous-generation figures used.' },
  { model: 'Carens Clavis', body: 'MPV/MUV', seats: [6, 7], eff: { Petrol: 15.34, Diesel: 19.54 },
    airbags: 6, launch: 2025,
    variants: [
      ['HTE', { 'P-M': 11.39, 'D-M': 13.14 }, `${HY_BASE} tpms rearDisc rearAC`, 'CNG ₹12.39 L.'],
      ['HTE (O)', { 'P-M': 12.35, 'P-A': 14.67, 'D-M': 14.37, 'D-A': 15.82 }, 'screen10 wirelessAA rearCam', 'Petrol automatic is the turbo DCT.'],
      ['HTK Plus', { 'P-M': 15.2, 'P-A': 16.85, 'D-M': 16.44, 'D-A': 17.37 }, 'sunroof autoAC frontSensors keyless cruise autoFoldORVM rearWiper'],
      ['HTK Plus (O)', { 'P-M': 16.42, 'P-A': 17.86, 'D-M': 17.22 }, 'wirelessCharger epb', 'EPB on DCT only.'],
      ['HTX', { 'P-M': 17.96, 'D-M': 19.01 }, 'ledHeadlamps panoSunroof digitalCluster premiumSound ventSeats powerSeat cam360 autoIRVM'],
      ['HTX Plus', { 'P-M': 18.69, 'P-A': 21.07 }, 'adas rainWipers bsm'],
      ['GTX Plus', { 'P-A': 21.79 }, 'sunshades connected autoHeadlamps', '7 airbags.'],
    ],
    notes: 'The earlier Carens scored 3 stars (Global NCAP 2024).' },
  { model: 'Carens Clavis EV', body: 'MPV/MUV', seats: [6, 7], ev: { kwh: 51.4, range: 490 },
    airbags: 6, launch: 2025,
    variants: [
      ['HTK Plus', { 'E-A': 18.04 }, 'airbags6 esc hillHold belts3pt rearDisc rearAC screen10 digitalCluster ledHeadlamps sunshades tpms rearCam isofix epb autoAC cruise keyless connected autoHeadlamps rearWiper', '42 kWh battery (404 km claimed).'],
      ['HTX E', { 'E-A': 20.0 }, 'panoSunroof'],
      ['HTX', { 'E-A': 20.54 }, 'adas cam360 bsm wirelessCharger autoIRVM', '51.4 kWh HTX ER ₹22.54 L.'],
      ['HTX Plus ER', { 'E-A': 24.54 }, 'powerSeat ventSeats premiumSound', '51.4 kWh battery.'],
    ] },
  { model: 'Syros EV', body: 'Compact SUV', u4: 1, seats: [5], ev: { kwh: 51.4, range: 526 },
    airbags: 6, launch: 2026,
    variants: [
      ['HTK', { 'E-A': 13.5 }, `${HY_BASE} tpms rearDisc sunshades autoAC rearAC screen10 digitalCluster wirelessAA ledHeadlamps keyless autoHeadlamps`, '42 kWh battery (443 km claimed).'],
      ['HTK Plus', { 'E-A': 15.0 }, 'rearCam cruise'],
      ['HTX', { 'E-A': 16.0 }, 'panoSunroof rearArmrest rearHeadrests rearWiper'],
      ['HTX ER', { 'E-A': 18.0 }, 'ventSeats powerSeat connected', '51.4 kWh battery from here.'],
      ['HTX Plus ER', { 'E-A': 19.5 }, 'premiumSound wirelessCharger frontSensors'],
      ['X-Line ER', { 'E-A': 20.0 }, 'adas cam360 autoIRVM'],
    ],
    notes: 'Launched July 2026. No blind-spot monitor.' },
  { model: 'Sorento', body: 'Full-size SUV', seats: [6, 7], eff: { 'Strong hybrid': 19.6, Diesel: 15 },
    airbags: 7, launch: 2026,
    variants: [
      ['HTE', { 'H-A': 29.49, 'D-A': 27.99 }, 'airbags6 esc hillHold belts3pt tpms rearCam frontSensors isofix rearDisc powerSeat autoAC rearAC cruise rearHeadrests wirelessAA screen10 wirelessCharger autoHeadlamps rainWipers rearWiper ledHeadlamps keyless'],
      ['HTE (O)', { 'H-A': 30.99, 'D-A': 29.49 }, 'panoSunroof ventSeats'],
      ['HTK', { 'H-A': 33.99, 'D-A': 32.49 }, 'premiumSound digitalCluster connected cam360'],
      ['HTK (A)', { 'H-A': 34.99, 'D-A': 33.49 }, 'adas bsm'],
      ['HTX AWD', { 'H-A': 38.99, 'D-A': 37.49 }, 'hud', '10 airbags.'],
      ['HTX (A) AWD', { 'H-A': 39.99, 'D-A': 38.49 }, '', 'Adds Level 2+ ADAS.'],
    ],
    notes: 'Launched September 2026. Diesel mileage not published; the figure is an estimate.' },
  { model: 'Carnival', body: 'MPV/MUV', seats: [7], eff: { Diesel: 14.85 }, airbags: 8, launch: 2024,
    variants: [['Single version', { 'D-A': 59.65 }, `${PREMIUM_ALL} sunroof hud sunshades rearWiper wirelessAA`]] },
  { model: 'EV6', body: 'Mid-size SUV', seats: [5], ev: { kwh: 84, range: 663 }, airbags: 8, launch: 2022, updated: 2025,
    variants: [['Single version', { 'E-A': 65.98 }, `${PREMIUM_ALL} sunroof hud`]] },
  { model: 'EV9', body: 'Full-size SUV', seats: [6], ev: { kwh: 99.8, range: 561 }, airbags: 10, launch: 2024,
    variants: [['Single version', { 'E-A': 130 }, `${PREMIUM_ALL} panoSunroof hud sunshades rearWiper`]] },
]);

const toyota = brand('Toyota', [
  { model: 'Glanza', body: 'Hatchback', u4: 1, seats: [5], eff: { Petrol: 23.8, CNG: 33.61 },
    airbags: 6, launch: 2022, updated: 2026,
    variants: [
      ['E', { 'P-M': 6.99 }, `${MS_BASE} isofix rearHeadrests`],
      ['S', { 'P-M': 7.71, 'P-A': 8.31, 'C-M': 8.76, 'C-A': 9.31 }, 'tpms wirelessAA rearAC'],
      ['G', { 'P-M': 8.73, 'P-A': 9.33, 'C-M': 9.68, 'C-A': 10.23 }, 'ledHeadlamps keyless autoAC rearCam premiumSound connected rearWiper wirelessCharger'],
      ['V', { 'P-M': 9.99, 'P-A': 10.59 }, 'autoIRVM autoFoldORVM hud cam360 cruise ventSeats'],
      ['V (O)', { 'P-M': 10.49, 'P-A': 10.98 }, 'adas'],
    ],
    notes: 'Facelift launched October 2026 (shares the new Baleno’s updates).' },
  { model: 'Urban Cruiser Taisor', body: 'Compact SUV', u4: 1, seats: [5], eff: { Petrol: 21.7, CNG: 28.5 },
    airbags: 6, launch: 2024,
    variants: [
      ['E', { 'P-M': 7.43, 'C-M': 8.45 }, `${MS_BASE} isofix autoAC rearHeadrests`],
      ['S', { 'P-M': 8.33, 'P-A': 8.94 }, ''],
      ['S Plus', { 'P-M': 8.68, 'P-A': 9.29 }, 'wirelessAA premiumSound keyless ledHeadlamps autoHeadlamps'],
      ['G Turbo', { 'P-M': 10.45, 'P-A': 11.86 }, 'rearCam wirelessCharger rearAC rearWiper connected', '1.0 turbo-petrol only.'],
      ['V Turbo', { 'P-M': 11.36, 'P-A': 12.78 }, 'hud cam360 cruise autoFoldORVM autoIRVM', '1.0 turbo-petrol only.'],
    ] },
  { model: 'Rumion', body: 'MPV/MUV', seats: [7], eff: { Petrol: 20.51, CNG: 26.11 },
    airbags: 6, launch: 2023,
    variants: [
      ['E', { 'P-M': 9.79 }, `${MS_BASE} isofix`],
      ['S', { 'P-M': 10.77, 'P-A': 12.35, 'C-M': 11.69 }, 'rearAC'],
      ['G', { 'P-M': 11.93, 'P-A': 13.44 }, 'autoAC keyless wirelessAA connected'],
      ['V', { 'P-M': 12.7, 'P-A': 14.21 }, 'cruise autoFoldORVM autoHeadlamps rearCam ledHeadlamps'],
    ] },
  { model: 'Urban Cruiser Hyryder', body: 'Mid-size SUV', seats: [5], eff: { Petrol: 21.12, 'Strong hybrid': 27.97, CNG: 26.6 },
    airbags: 6, launch: 2022, updated: 2025,
    variants: [
      ['E', { 'P-M': 11.31 }, 'airbags6 esc hillHold belts3pt isofix tpms rearCam rearAC rearArmrest'],
      ['S', { 'P-M': 12.82, 'P-A': 14.17, 'C-M': 13.71, 'H-A': 17.18 }, 'cruise autoFoldORVM connected wirelessAA autoIRVM epb autoAC'],
      ['G Opt', { 'P-M': 14.87, 'P-A': 16.18, 'C-M': 15.72, 'H-A': 19.24 }, 'ledHeadlamps rearWiper wirelessCharger ventSeats sunshades'],
      ['V', { 'P-M': 16.42, 'P-A': 17.67, 'H-A': 19.99 }, 'panoSunroof powerSeat cam360 hud keyless digitalCluster rearDisc rearHeadrests autoHeadlamps', 'AWD automatic ₹18.72 L.'],
    ],
    notes: 'No ADAS or branded audio. Strong hybrids add a digital cluster from the S trim.' },
  { model: 'Innova Crysta', body: 'MPV/MUV', seats: [7, 8], eff: { Diesel: 11 },
    airbags: 7, launch: 2016, updated: 2026,
    variants: [
      ['GX', { 'D-M': 19.95 }, 'belts3pt hillHold tpms rearCam isofix rearAC wirelessCharger rearWiper', 'Dual airbags.'],
      ['GX Plus', { 'D-M': 21.41 }, ''],
      ['VX', { 'D-M': 25.24 }, 'airbags6 esc autoAC ledHeadlamps keyless cruise'],
      ['ZX', { 'D-M': 26.96 }, 'powerSeat rearArmrest', 'Captain seats only.'],
    ],
    notes: 'ESC and 6+ airbags only from the VX variant. Toyota publishes no mileage figure; this is an estimate.' },
  { model: 'Innova Hycross', body: 'MPV/MUV', seats: [7, 8], eff: { Petrol: 16.13, 'Strong hybrid': 23.24 },
    ncap: B(5, 2025), airbags: 6, launch: 2022,
    variants: [
      ['G Fleet', { 'P-A': 18.7 }, 'airbags6 esc hillHold belts3pt isofix ledHeadlamps rearAC rearDisc rearWiper'],
      ['GX', { 'P-A': 19.53 }, 'rearCam keyless'],
      ['GX (O)', { 'P-A': 20.84 }, 'autoAC screen10 sunshades', '10.1-inch screen and sunshades on the 7-seater.'],
      ['VX', { 'H-A': 26.76 }, 'tpms autoIRVM cruise digitalCluster', 'Strong hybrid from here.'],
      ['VX (O)', { 'H-A': 28.77 }, 'wirelessAA'],
      ['ZX', { 'H-A': 31.2 }, 'ventSeats powerSeat premiumSound rearArmrest wirelessCharger connected'],
      ['ZX (O)', { 'H-A': 31.84 }, 'adas bsm panoSunroof cam360 hud epb autoHeadlamps autoFoldORVM frontSensors'],
    ] },
  { model: 'Fortuner', body: 'Full-size SUV', seats: [7], eff: { Petrol: 10.3, Diesel: 14.6 },
    airbags: 7, launch: 2016, updated: 2021,
    variants: [
      ['4x2', { 'P-A': 35.11, 'D-M': 35.75, 'D-A': 37.99 }, 'airbags6 esc hillHold belts3pt isofix rearCam autoAC rearAC powerSeat cruise connected autoIRVM ledHeadlamps rearArmrest keyless rearWiper autoFoldORVM ventSeats'],
      ['4x4', { 'D-M': 39.74 }, '', 'Part-time 4WD with low range.'],
      ['Neo Drive', { 'D-A': 43.55 }, 'wirelessCharger cam360', '48V mild hybrid; no ventilated seats.'],
      ['GR-S', { 'D-A': 50.97 }, 'premiumSound', '4x4 with adaptive suspension.'],
    ],
    notes: 'No ADAS or sunroof. Legender version ₹43.35–48.77 L. A new generation is expected around December 2026.' },
  { model: 'Hilux', body: 'Pickup', seats: [5], eff: { Diesel: 12 },
    airbags: 7, launch: 2026,
    variants: [
      ['GX', { 'D-A': 31.99 }, 'airbags6 esc hillHold belts3pt isofix rearCam ledHeadlamps digitalCluster'],
      ['VX', { 'D-A': 36.69 }, 'cam360 cruise wirelessAA screen10 connected wirelessCharger keyless'],
    ],
    notes: 'New generation launched July 2026. Mileage not published; the figure is an estimate.' },
  { model: 'Camry', body: 'Sedan', seats: [5], eff: { 'Strong hybrid': 25.49 }, airbags: 9, launch: 2024,
    variants: [['Single version', { 'H-A': 48.69 }, `${PREMIUM_ALL} sunroof hud sunshades`]] },
  { model: 'Urban Cruiser Ebella', body: 'Mid-size SUV', seats: [5], ev: { kwh: 61, range: 543 }, airbags: 7, launch: 2026, 
    variants: [['E3', { 'E-A': 23.6 }, 'airbags6 esc hillHold belts3pt isofix rearDisc autoAC rearAC wirelessAA screen10 connected keyless autoHeadlamps ledHeadlamps adas cam360 rearCam bsm cruise']],
    notes: 'Toyota’s version of the e Vitara; only the top E3 variant was on sale in October 2026.' },
]);

const honda = brand('Honda', [
  { model: 'Amaze', body: 'Sedan', u4: 1, seats: [5], eff: { Petrol: 18.65 },
    ncap: B(5, 2025), airbags: 6, launch: 2024,
    variants: [
      ['V', { 'P-M': 7.65, 'P-A': 8.7 }, `${HY_BASE} ledHeadlamps digitalCluster`],
      ['VX', { 'P-M': 8.65, 'P-A': 9.4 }, 'rearCam autoAC rearAC cruise keyless autoFoldORVM wirelessAA bsm', 'LaneWatch camera for the blind spot.'],
      ['ZX', { 'P-M': 9.39, 'P-A': 10.0 }, 'adas wirelessCharger rearArmrest'],
    ],
    notes: 'The older second-generation Amaze is still sold from ₹5.99 L. Sources disagree on whether the base V has 4 or 6 airbags.' },
  { model: 'City', body: 'Sedan', seats: [5], eff: { Petrol: 17.8, 'Strong hybrid': 27.26 },
    airbags: 6, launch: 2020, updated: 2026,
    variants: [
      ['SV', { 'P-M': 12.0 }, `${MID_STD} rearDisc rearAC wirelessAA keyless`],
      ['V', { 'P-M': 13.51, 'P-A': 14.51 }, 'screen10 connected wirelessCharger autoHeadlamps rainWipers autoAC rearArmrest sunshades ledHeadlamps autoFoldORVM cruise'],
      ['ZX', { 'P-M': 15.47, 'P-A': 16.47 }, 'adas bsm ventSeats sunroof autoIRVM'],
      ['ZX Plus', { 'P-M': 16.36, 'P-A': 17.36, 'H-A': 21.36 }, 'cam360 epb', 'The strong hybrid comes only in this trim.'],
    ],
    notes: 'May 2026 facelift. No powered driver seat.' },
  { model: 'Elevate', body: 'Mid-size SUV', seats: [5], eff: { Petrol: 15.31 },
    airbags: 6, launch: 2023, updated: 2026,
    variants: [
      ['SV', { 'P-M': 11.8 }, `${HY_BASE} autoAC rearAC keyless ledHeadlamps digitalCluster`],
      ['V', { 'P-M': 12.29, 'P-A': 13.79 }, 'rearCam wirelessAA connected rearDisc epb', 'Rear discs and EPB on the CVT only.'],
      ['VX', { 'P-M': 13.93, 'P-A': 15.39 }, 'autoHeadlamps autoFoldORVM wirelessCharger rearWiper bsm cruise tpms', 'LaneWatch camera for the blind spot.'],
      ['ZX', { 'P-M': 15.39, 'P-A': 16.89 }, 'ventSeats autoIRVM screen10 adas sunroof rainWipers rearHeadrests rearArmrest'],
      ['ZX Plus', { 'P-M': 16.8, 'P-A': 18.3 }, 'powerSeat cam360 frontSensors', 'Adds ventilated rear seats.'],
    ],
    notes: 'Facelift launched October 2026.' },
]);

const mg = brand('MG', [
  { model: 'Comet EV', body: 'Hatchback', u4: 1, seats: [4], ev: { kwh: 17.3, range: 230 },
    airbags: 2, launch: 2023, updated: 2025,
    variants: [
      ['Executive', { 'E-A': 7.9 }, 'belts3pt tpms isofix digitalCluster keyless'],
      ['Excite', { 'E-A': 9.0 }, 'ledHeadlamps screen10 wirelessAA rearCam connected autoFoldORVM', 'Fast-charging Excite FC ₹9.27 L.'],
      ['Exclusive', { 'E-A': 9.9 }, 'esc hillHold epb rearDisc', 'Fast-charging Exclusive FC ₹10.17 L.'],
    ],
    notes: 'ESC only on the top variant. Also sold with a battery rental plan at a lower upfront price.' },
  { model: 'Windsor EV', body: 'MPV/MUV', seats: [5], ev: { kwh: 52.9, range: 449 },
    airbags: 6, launch: 2024, updated: 2025,
    variants: [
      ['Excite', { 'E-A': 14.85 }, 'airbags6 esc hillHold belts3pt tpms isofix epb rearDisc ledHeadlamps autoAC rearAC cruise wirelessAA screen10 rainWipers keyless autoHeadlamps connected', '38 kWh battery (332 km claimed).'],
      ['Exclusive', { 'E-A': 16.15 }, 'cam360 powerSeat digitalCluster wirelessCharger autoFoldORVM rearArmrest'],
      ['Essence', { 'E-A': 17.15 }, 'panoSunroof ventSeats premiumSound'],
      ['Essence Pro', { 'E-A': 19.15 }, 'adas', '52.9 kWh battery; Exclusive Pro ₹18.05 L.'],
    ],
    notes: 'Also sold with a battery rental plan. The glass roof does not open.' },
  { model: 'Astor', body: 'Mid-size SUV', seats: [5], eff: { Petrol: 15.43 },
    airbags: 6, launch: 2021, updated: 2025,
    variants: [
      ['Sprint', { 'P-M': 9.79 }, 'esc hillHold belts3pt isofix rearDisc autoAC rearAC rearArmrest ledHeadlamps screen10', '2 airbags.'],
      ['Shine', { 'P-M': 11.34 }, 'panoSunroof keyless cruise rearCam'],
      ['Select', { 'P-M': 12.4, 'P-A': 13.56 }, 'airbags6 wirelessAA digitalCluster connected autoHeadlamps autoFoldORVM rainWipers tpms', 'Wireless charger on the CVT.'],
      ['Sharp Pro', { 'P-M': 13.37, 'P-A': 14.52 }, 'cam360 powerSeat ventSeats autoIRVM premiumSound wirelessCharger'],
      ['Savvy Pro', { 'P-A': 15.3 }, 'adas bsm'],
    ] },
  { model: 'Hector', body: 'Mid-size SUV', seats: [5], eff: { Petrol: 13.79 },
    airbags: 6, launch: 2019, updated: 2026,
    variants: [
      ['Style', { 'P-M': 12.14 }, 'airbags6 esc hillHold belts3pt isofix rearDisc rearAC'],
      ['Select Pro', { 'P-M': 14.95 }, 'ledHeadlamps sunroof screen10 wirelessAA digitalCluster wirelessCharger cruise rearCam autoAC'],
      ['Smart Pro', { 'P-M': 15.95, 'P-A': 17.15 }, 'connected keyless autoFoldORVM premiumSound panoSunroof frontSensors tpms epb rearWiper rearArmrest', 'EPB on the CVT.'],
      ['Sharp Pro', { 'P-M': 17.65, 'P-A': 18.75 }, 'powerSeat autoIRVM autoHeadlamps ventSeats rainWipers', 'Partial ADAS; diesel MT ₹18.60 L when available.'],
      ['Savvy Pro', { 'P-A': 19.65 }, 'adas cam360'],
    ],
    notes: 'Petrol only for now; a diesel was due to return in 2026.' },
  { model: 'Hector Plus', body: 'Mid-size SUV', seats: [6, 7], eff: { Petrol: 13.79 },
    airbags: 6, launch: 2020, updated: 2026,
    variants: [
      ['Sharp Pro', { 'P-M': 17.49, 'P-A': 18.79 }, 'airbags6 esc hillHold belts3pt isofix rearDisc rearAC ledHeadlamps sunroof panoSunroof screen10 wirelessAA digitalCluster wirelessCharger cruise rearCam autoAC connected keyless autoFoldORVM premiumSound frontSensors tpms rearWiper rearArmrest powerSeat autoIRVM autoHeadlamps rainWipers cam360', 'Ventilated seats and EPB on the CVT.'],
      ['Savvy Pro', { 'P-A': 19.69 }, 'adas ventSeats epb'],
    ],
    notes: 'Three-row Hector, sold only in the top two trims.' },
  { model: 'ZS EV', body: 'Mid-size SUV', seats: [5], ev: { kwh: 50.3, range: 461 },
    airbags: 6, launch: 2020, updated: 2024,
    variants: [
      ['Executive', { 'E-A': 17.99 }, 'airbags6 esc hillHold belts3pt tpms rearCam isofix rearDisc epb autoAC rearAC cruise screen10 digitalCluster keyless autoHeadlamps ledHeadlamps rearWiper rearArmrest'],
      ['Excite Pro', { 'E-A': 18.75 }, 'panoSunroof wirelessAA connected'],
      ['Exclusive Plus', { 'E-A': 20.0 }, 'wirelessCharger cam360 powerSeat autoFoldORVM rainWipers'],
      ['Essence', { 'E-A': 20.75 }, 'adas'],
    ],
    notes: 'No ventilated seats.' },
  { model: 'Majestor', body: 'Full-size SUV', seats: [6, 7], eff: { Diesel: 11 },
    airbags: 7, launch: 2026,
    variants: [
      ['Savvy 4x2', { 'D-A': 42.49 }, 'airbags6 esc hillHold belts3pt isofix cam360 rearCam powerSeat wirelessCharger wirelessAA tpms autoAC rearAC cruise keyless ledHeadlamps autoHeadlamps screen10 digitalCluster connected rearDisc frontSensors rearArmrest autoFoldORVM rearWiper adas panoSunroof ventSeats premiumSound epb', '6- or 7-seat.'],
      ['Savvy 4x4', { 'D-A': 44.99 }, '', '4WD with low range and three locking differentials.'],
    ],
    notes: 'Replaced the Gloster in May 2026. MG lists mileage only as an estimate. No rear sunshades.' },
]);

const skoda = brand('Skoda', [
  { model: 'Kylaq', body: 'Compact SUV', u4: 1, seats: [5], eff: { Petrol: 19.68 },
    ncap: B(5, 2025), airbags: 6, launch: 2025,
    variants: [
      ['Classic', { 'P-M': 7.59 }, 'airbags6 esc belts3pt isofix autoAC ledHeadlamps'],
      ['Classic Plus', { 'P-M': 8.29, 'P-A': 9.29 }, 'cruise rainWipers sunroof hillHold tpms'],
      ['Signature', { 'P-M': 9.49, 'P-A': 10.49 }, 'rearAC rearWiper'],
      ['Signature Plus', { 'P-M': 10.79, 'P-A': 11.79 }, 'screen10 wirelessAA digitalCluster keyless autoHeadlamps rearCam rearArmrest'],
      ['Sportline', { 'P-M': 11.35, 'P-A': 12.35 }, 'wirelessCharger'],
      ['Prestige', { 'P-M': 11.85, 'P-A': 12.85 }, 'ventSeats premiumSound autoIRVM'],
      ['Prestige Plus', { 'P-M': 12.09, 'P-A': 13.09 }, 'powerSeat'],
    ],
    notes: 'No ADAS or 360° camera.' },
  { model: 'Kushaq', body: 'Mid-size SUV', seats: [5], eff: { Petrol: 19.76 },
    ncap: G(5, 2022), airbags: 6, launch: 2021, updated: 2026,
    variants: [
      ['Classic+', { 'P-M': 10.69, 'P-A': 13.04 }, 'airbags6 esc hillHold belts3pt tpms isofix rearWiper rainWipers autoIRVM ledHeadlamps sunroof autoAC rearAC'],
      ['Signature', { 'P-M': 14.69, 'P-A': 15.69 }, 'rearCam frontSensors wirelessAA screen10 wirelessCharger rearArmrest digitalCluster cruise keyless autoHeadlamps autoFoldORVM connected rearHeadrests'],
      ['Sportline', { 'P-M': 14.89, 'P-A': 15.89 }, ''],
      ['Prestige', { 'P-M': 16.94, 'P-A': 17.79 }, 'panoSunroof ventSeats powerSeat premiumSound rearDisc', '1.5 DSG ₹18.99 L (rear discs with the 1.5 only).'],
    ],
    notes: 'March 2026 facelift; the crash rating is for the pre-facelift car. No ADAS.' },
  { model: 'Slavia', body: 'Sedan', seats: [5], eff: { Petrol: 20.32 },
    ncap: G(5, 2023), airbags: 6, launch: 2022, updated: 2026,
    variants: [
      ['Classic', { 'P-M': 10.0 }, 'airbags6 esc belts3pt tpms isofix ledHeadlamps'],
      ['Classic Plus', { 'P-M': 10.99, 'P-A': 12.49 }, 'sunroof hillHold'],
      ['Signature', { 'P-M': 13.94, 'P-A': 14.94 }, 'rearCam wirelessAA screen10 digitalCluster wirelessCharger rearArmrest autoAC rearAC cruise keyless autoHeadlamps rainWipers'],
      ['Prestige', { 'P-M': 15.89, 'P-A': 16.89 }, 'ventSeats powerSeat cam360 connected autoFoldORVM autoIRVM rearHeadrests rearDisc', '1.5 DSG ₹18.59 L.'],
    ],
    notes: 'October 2026 facelift; the crash rating is for the pre-facelift car. No ADAS. The page did not split features by trim, so the split follows the Kushaq.' },
  { model: 'Kodiaq', body: 'Full-size SUV', seats: [5, 7], eff: { Petrol: 14.86 },
    airbags: 9, launch: 2025,
    variants: [
      ['Lounge', { 'P-A': 36.99 }, 'airbags6 esc hillHold belts3pt isofix tpms rearCam rearDisc epb frontSensors autoAC rearAC cruise rearHeadrests powerSeat keyless autoHeadlamps rainWipers autoIRVM autoFoldORVM ledHeadlamps rearArmrest connected digitalCluster screen10 wirelessAA wirelessCharger panoSunroof sunshades rearWiper', '5-seat.'],
      ['Sportline', { 'P-A': 44.99 }, 'adas cam360 premiumSound', '7-seat.'],
      ['Selection L&K', { 'P-A': 46.99 }, 'ventSeats', '7-seat.'],
    ] },
]);

const vw = brand('Volkswagen', [
  { model: 'Virtus', body: 'Sedan', seats: [5], eff: { Petrol: 20.8 },
    ncap: G(5, 2023), airbags: 6, launch: 2022,
    variants: [
      ['Comfortline', { 'P-M': 10.71 }, 'airbags6 esc hillHold belts3pt isofix tpms ledHeadlamps rearHeadrests'],
      ['Highline', { 'P-M': 13.51, 'P-A': 14.71 }, 'cruise screen10 wirelessAA rearCam autoAC rearAC'],
      ['Highline Plus', { 'P-M': 13.91, 'P-A': 15.0 }, 'keyless sunroof digitalCluster autoHeadlamps rainWipers autoFoldORVM rearArmrest'],
      ['Topline', { 'P-M': 15.16, 'P-A': 16.35 }, 'ventSeats wirelessCharger powerSeat connected autoIRVM'],
      ['GT Plus', { 'P-A': 18.85 }, 'rearDisc', '1.5 turbo DSG.'],
    ],
    notes: 'No ADAS, 360° camera or branded audio. A facelift is expected around December 2026.' },
  { model: 'Taigun', body: 'Mid-size SUV', seats: [5], eff: { Petrol: 19.98 },
    ncap: G(5, 2022), airbags: 6, launch: 2021, updated: 2026,
    variants: [
      ['Comfortline', { 'P-M': 11.0 }, 'airbags6 esc belts3pt isofix autoAC rearAC cruise ledHeadlamps rearWiper'],
      ['Highline', { 'P-M': 13.0, 'P-A': 14.1 }, 'screen10 wirelessAA hillHold rearCam frontSensors rearArmrest tpms'],
      ['Highline Plus', { 'P-M': 14.42, 'P-A': 15.57 }, 'sunroof keyless digitalCluster autoHeadlamps rainWipers autoFoldORVM wirelessCharger connected autoIRVM rearHeadrests'],
      ['Topline', { 'P-M': 16.22, 'P-A': 17.38 }, 'panoSunroof ventSeats powerSeat'],
      ['GT Plus', { 'P-A': 19.17 }, 'rearDisc', '1.5 turbo DSG.'],
    ],
    notes: 'April 2026 facelift; the crash rating is for the pre-facelift car. No ADAS or 360° camera.' },
  { model: 'Tiguan R-Line', body: 'Mid-size SUV', seats: [5], eff: { Petrol: 12.58 }, airbags: 9, launch: 2025,
    variants: [['Single version', { 'P-A': 47.11 }, 'airbags6 esc hillHold belts3pt isofix tpms rearCam rearDisc epb adas bsm frontSensors autoAC rearAC cruise rearHeadrests powerSeat ventSeats keyless autoHeadlamps rainWipers autoIRVM autoFoldORVM ledHeadlamps rearArmrest connected digitalCluster screen10 wirelessCharger wirelessAA panoSunroof hud rearWiper']] },
  { model: 'Tayron', body: 'Full-size SUV', seats: [5, 7], eff: { Petrol: 12 },
    airbags: 9, launch: 2026,
    variants: [
      ['Life', { 'P-A': 41.99 }, 'airbags6 esc hillHold belts3pt isofix tpms rearCam adas ventSeats powerSeat wirelessCharger wirelessAA autoAC rearAC cruise keyless autoHeadlamps ledHeadlamps digitalCluster screen10 connected rearDisc epb frontSensors panoSunroof sunshades', '5-seat.'],
      ['R-Line', { 'P-A': 47.74 }, 'cam360 hud premiumSound', '7-seat.'],
    ],
    notes: 'VW has not published claimed mileage; the figure is an estimate.' },
]);

const renault = brand('Renault', [
  { model: 'Kwid', body: 'Hatchback', u4: 1, seats: [5], eff: { Petrol: 21.46 },
    ncap: G(1, 2016), airbags: 6, launch: 2015, updated: 2025,
    variants: [
      ['Authentic', { 'P-A': 4.3 }, 'esc belts3pt', 'Dual airbags.'],
      ['Evolution', { 'P-M': 4.53, 'P-A': 4.9 }, ''],
      ['Techno', { 'P-M': 4.9 }, 'keyless autoAC wirelessAA rearWiper'],
      ['Climber', { 'P-M': 5.15, 'P-A': 5.61 }, 'airbags6 rearCam hillHold', '6 airbags and rear camera on the Climber AMT.'],
    ],
    notes: 'Crash rating is from 2016, when it had one airbag.' },
  { model: 'Kiger', body: 'Compact SUV', u4: 1, seats: [5], eff: { Petrol: 19.71 },
    ncap: G(4, 2022), airbags: 6, launch: 2021, updated: 2025,
    variants: [
      ['Authentic', { 'P-M': 5.81 }, `${HY_BASE} tpms`],
      ['Evolution', { 'P-M': 6.59, 'P-A': 7.03 }, 'rearCam rearAC'],
      ['Evolution Plus', { 'P-M': 7.03, 'P-A': 7.49 }, 'wirelessAA autoAC keyless', 'Turbo manual ₹7.93 L.'],
      ['Techno', { 'P-M': 7.6, 'P-A': 8.1 }, 'ledHeadlamps rearWiper autoFoldORVM', 'Turbo CVT ₹9.40 L.'],
      ['Emotion', { 'P-M': 8.5, 'P-A': 10.4 }, 'ventSeats cam360 cruise wirelessCharger autoHeadlamps rainWipers premiumSound digitalCluster', 'Automatic is the turbo CVT.'],
    ],
    notes: 'No sunroof. Crash rating predates the 2025 facelift.' },
  { model: 'Triber', body: 'MPV/MUV', u4: 1, seats: [7], eff: { Petrol: 21 },
    ncap: G(4, 2021), airbags: 6, launch: 2019, updated: 2025,
    variants: [
      ['Authentic', { 'P-M': 5.81 }, `${HY_BASE} tpms rearAC`],
      ['Evolution', { 'P-M': 6.74 }, 'rearCam wirelessAA', 'Turbo manual ₹7.85 L.'],
      ['Techno', { 'P-M': 7.44 }, 'rearWiper autoAC'],
      ['Emotion', { 'P-M': 8.05, 'P-A': 8.53 }, 'ledHeadlamps autoHeadlamps digitalCluster wirelessCharger keyless cruise autoFoldORVM rainWipers'],
    ],
    notes: 'Crash rating is from 2021 (2 airbags).' },
  { model: 'Duster', body: 'Mid-size SUV', seats: [5], eff: { Petrol: 19.41, 'Strong hybrid': 29 },
    ncap: B(5, 2026), airbags: 6, launch: 2026,
    variants: [
      ['Authentic', { 'P-M': 10.49 }, `${HY_BASE} tpms autoHeadlamps ledHeadlamps rearAC`],
      ['Evolution', { 'P-M': 11.69, 'P-A': 14.49, 'H-A': 16.99 }, 'screen10 wirelessAA premiumSound rearCam cruise rearWiper'],
      ['Techno', { 'P-M': 13.49, 'H-A': 18.99 }, 'keyless panoSunroof autoAC autoFoldORVM wirelessCharger autoIRVM connected epb'],
      ['Techno Plus', { 'P-M': 15.29, 'P-A': 16.69 }, 'digitalCluster bsm frontSensors', '1.3 turbo only.'],
      ['Iconic', { 'P-M': 16.99, 'P-A': 18.49 }, 'cam360 adas ventSeats powerSeat rainWipers', '1.3 turbo only.'],
      ['Emotion', { 'H-A': 19.49 }, '', 'Strong hybrid only.'],
    ],
    notes: 'New generation launched 2026; the strong hybrid arrived on 17 October 2026. Petrol automatics use the 1.3 turbo DCT.' },
]);

const nissan = brand('Nissan', [
  { model: 'Magnite', body: 'Compact SUV', u4: 1, seats: [5], eff: { Petrol: 19.4, CNG: 24 },
    ncap: G(5, 2025), airbags: 6, launch: 2020, updated: 2024,
    variants: [
      ['Visia', { 'P-M': 5.69, 'P-A': 6.3, 'C-M': 6.43 }, `${HY_BASE} tpms`],
      ['Visia Plus', { 'P-M': 6.26, 'C-M': 6.97 }, 'rearAC'],
      ['Acenta', { 'P-M': 6.87, 'P-A': 7.42, 'C-M': 7.58 }, 'wirelessAA keyless'],
      ['N Connecta', { 'P-M': 7.5, 'P-A': 8.05, 'C-M': 8.21 }, 'ledHeadlamps autoAC rearCam', 'Turbo from ₹8.81 L.'],
      ['Tekna', { 'P-M': 8.43, 'P-A': 8.98, 'C-M': 9.14 }, 'cam360 premiumSound digitalCluster autoHeadlamps autoFoldORVM rearWiper wirelessCharger cruise'],
      ['Tekna Plus', { 'P-M': 8.76, 'P-A': 9.31, 'C-M': 9.47 }, 'ventSeats', 'Turbo CVT ₹10.99 L.'],
    ],
    notes: 'No sunroof. CNG may be a dealer-fitted kit (sources disagree).' },
  { model: 'Gravite', body: 'MPV/MUV', u4: 1, seats: [7], eff: { Petrol: 19.3 },
    airbags: 6, launch: 2026,
    variants: [
      ['Visia', { 'P-M': 5.73 }, `${HY_BASE} tpms`],
      ['Acenta', { 'P-M': 6.68 }, 'rearAC wirelessAA'],
      ['N-Connecta', { 'P-M': 7.38, 'P-A': 7.95 }, 'autoAC keyless rearCam rearWiper'],
      ['Tekna', { 'P-M': 8.08, 'P-A': 8.64 }, 'digitalCluster wirelessCharger cruise autoHeadlamps ledHeadlamps', 'Cruise control on the manual only.'],
    ],
    notes: 'Seven-seat MPV launched February 2026, related to the Renault Triber. A dealer-fitted CNG kit adds about ₹0.86 L.' },
  { model: 'Tekton', body: 'Mid-size SUV', seats: [5], eff: { Petrol: 19.4 },
    ncap: B(5, 2026), airbags: 6, launch: 2026,
    variants: [
      ['Visia', { 'P-M': 10.49 }, `${HY_BASE} tpms ledHeadlamps rearAC`],
      ['Visia Plus', { 'P-M': 11.14 }, 'wirelessAA rearCam'],
      ['Acenta', { 'P-M': 11.79, 'P-A': 14.99 }, 'screen10 keyless rearWiper'],
      ['N-Connecta', { 'P-M': 13.69, 'P-A': 16.49 }, 'panoSunroof autoAC cruise digitalCluster premiumSound'],
      ['Tekna', { 'P-M': 15.39, 'P-A': 17.79 }, 'adas ventSeats powerSeat wirelessCharger autoHeadlamps autoIRVM rearArmrest'],
      ['Tekna Plus', { 'P-M': 16.49, 'P-A': 18.59 }, 'cam360 connected'],
    ],
    notes: 'Launched July 2026; shares its platform with the Renault Duster. Automatics use the 1.3 turbo DCT.' },
]);

const citroen = brand('Citroën', [
  { model: 'C3', body: 'Hatchback', u4: 1, seats: [5], eff: { Petrol: 19.3, CNG: 28.1 },
    airbags: 6, launch: 2022, updated: 2025,
    variants: [
      ['Live', { 'P-M': 4.99, 'C-M': 5.73 }, 'belts3pt', 'Dual airbags.'],
      ['Live (O)', { 'P-M': 5.69 }, 'rearCam'],
      ['Feel', { 'P-M': 6.0 }, 'rearAC'],
      ['Feel (O)', { 'P-M': 7.03, 'C-M': 7.58 }, 'airbags6 isofix wirelessAA screen10'],
      ['Shine', { 'P-M': 7.86, 'C-M': 8.16 }, 'ledHeadlamps autoAC rearWiper digitalCluster cam360'],
      ['Shine Turbo', { 'P-M': 8.97, 'P-A': 9.68 }, 'cruise esc hillHold tpms autoFoldORVM', 'ESC, hill-hold and TPMS come only with the turbo (from Turbo Feel, ₹7.58 L).'],
    ],
    notes: 'Sold as the C3 X. Not crash-tested in India.' },
  { model: 'Basalt', body: 'Mid-size SUV', seats: [5], eff: { Petrol: 18 },
    ncap: B(4, 2024), airbags: 6, launch: 2024, updated: 2025,
    variants: [
      ['You', { 'P-M': 8.55 }, 'airbags6 esc hillHold belts3pt isofix'],
      ['Plus', { 'P-M': 9.99, 'P-A': 12.82 }, 'digitalCluster screen10 wirelessAA keyless autoAC rearAC', 'Automatic is the turbo.'],
      ['Max', { 'P-M': 11.34 }, 'rearCam tpms wirelessCharger ledHeadlamps', 'Page does not itemise this trim; split estimated.'],
      ['Max Turbo X', { 'P-M': 12.62, 'P-A': 13.89 }, 'cam360 cruise ventSeats powerSeat premiumSound'],
    ],
    notes: 'Sold as the Basalt X. No sunroof or ADAS.' },
  { model: 'Aircross', body: 'Mid-size SUV', seats: [5, 7], eff: { Petrol: 17.5 },
    ncap: B(5, 2025), airbags: 6, launch: 2023, updated: 2025,
    variants: [
      ['You', { 'P-M': 8.89 }, 'airbags6 esc hillHold belts3pt isofix'],
      ['Plus', { 'P-M': 9.99 }, 'screen10 wirelessAA digitalCluster keyless tpms'],
      ['Turbo Plus', { 'P-M': 11.99 }, 'autoAC rearAC ledHeadlamps', '7-seat.'],
      ['Turbo Max', { 'P-M': 12.97 }, 'ventSeats rearCam wirelessCharger', '7-seat ₹13.35 L.'],
      ['Turbo Max AT', { 'P-A': 14.14 }, 'connected cruise', '7-seat ₹14.52 L.'],
    ],
    notes: 'Sold as the Aircross X. Crash rating is for the 5-seater. No sunroof.' },
  { model: 'e-C3', body: 'Hatchback', u4: 1, seats: [5], ev: { kwh: 29.2, range: 320 },
    airbags: 6, launch: 2023, updated: 2025,
    variants: [
      ['Live', { 'E-A': 12.09 }, 'belts3pt wirelessAA screen10 digitalCluster', '4 airbags.'],
      ['Shine', { 'E-A': 13.36 }, 'airbags6 isofix rearCam ledHeadlamps'],
    ],
    notes: 'Sold as the e-C3 X. No hill-hold or automatic climate control.' },
]);

const byd = brand('BYD', [
  { model: 'Atto 3', body: 'Mid-size SUV', seats: [5], ev: { kwh: 60.48, range: 521 },
    airbags: 7, launch: 2022, updated: 2024,
    variants: [
      ['Dynamic', { 'E-A': 24.99 }, 'airbags6 esc hillHold belts3pt isofix tpms rearCam rearDisc epb panoSunroof powerSeat autoAC rearAC cruise keyless ledHeadlamps autoHeadlamps rainWipers connected digitalCluster screen10 autoIRVM autoFoldORVM rearArmrest rearWiper rearHeadrests', '49.92 kWh battery (468 km claimed).'],
      ['Premium', { 'E-A': 30.35 }, 'adas bsm cam360 ventSeats premiumSound wirelessCharger frontSensors'],
      ['Superior', { 'E-A': 34.49 }, '', 'Adds a card key and one-touch tailgate.'],
    ],
    notes: 'Android Auto/CarPlay is wired only.' },
  { model: 'Seal', body: 'Sedan', seats: [5], ev: { kwh: 82.56, range: 650 },
    airbags: 9, launch: 2024,
    variants: [
      ['Dynamic', { 'E-A': 41.5 }, `${PREMIUM_ALL} panoSunroof hud`, '61.44 kWh battery (510 km claimed).'],
      ['Premium', { 'E-A': 46.2 }, ''],
      ['Performance', { 'E-A': 53.65 }, '', 'Dual-motor AWD.'],
    ] },
  { model: 'Sealion 7', body: 'Mid-size SUV', seats: [5], ev: { kwh: 82.56, range: 567 },
    airbags: 11, launch: 2025,
    variants: [
      ['Dynamic', { 'E-A': 41.9 }, `${PREMIUM_ALL} panoSunroof hud wirelessAA`, '71.8 kWh battery (520 km claimed); equipment not confirmed.'],
      ['Premium', { 'E-A': 49.9 }, ''],
      ['Performance', { 'E-A': 55.9 }, '', 'Dual-motor AWD.'],
    ] },
  { model: 'eMax 7', body: 'MPV/MUV', seats: [6, 7], ev: { kwh: 71.8, range: 530 },
    airbags: 6, launch: 2024,
    variants: [
      ['Premium', { 'E-A': 26.9 }, 'airbags6 esc hillHold belts3pt isofix tpms rearCam cam360 rearDisc epb powerSeat autoAC rearAC cruise keyless ledHeadlamps autoHeadlamps rainWipers connected digitalCluster screen10 wirelessCharger autoIRVM autoFoldORVM rearArmrest frontSensors rearWiper rearHeadrests', '55.4 kWh battery (420 km claimed).'],
      ['Comfort', { 'E-A': 27.9 }, '', '71.8 kWh battery.'],
      ['Superior', { 'E-A': 29.3 }, 'adas panoSunroof ventSeats bsm'],
    ],
    notes: 'The glass roof does not open.' },
]);

export const CARS = [...maruti, ...hyundai, ...tata, ...mahindra, ...kia, ...toyota, ...honda, ...mg, ...skoda, ...vw, ...renault, ...nissan, ...citroen, ...byd];

/** Brands come from the dataset, so a new brand block adds its own filter chip. */
export const BRANDS = [...new Set(CARS.map((c) => c.brand))];
