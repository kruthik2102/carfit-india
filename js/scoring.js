// Affordability, safety, feature-match, running-cost and Buyable scores.
// Pure functions: every number shown in the UI comes from here.

import { ALL_FEATURES } from './features.js';
import { emi, insurancePerMonth, maintenancePerMonth, projectFinances, ctcToInHand } from './finance.js';
import { fuelWord } from './format.js';

export const FUELS = ['Petrol', 'Diesel', 'CNG', 'Strong hybrid', 'Electric'];

export const DEFAULT_SETTINGS = {
  petrol: 103, // ₹ per litre
  diesel: 90, // ₹ per litre
  cng: 80, // ₹ per kg
  homeKwh: 8, // ₹ per unit
  publicKwh: 22, // ₹ per unit, DC fast charging
  onRoadMult: 1.14, // road tax + registration + insurance
  evOnRoadMult: 1.06, // most states waive road tax on EVs
};

export function defaultInputs(currentYear) {
  return {
    salaryMode: 'inhand',
    salary: 80000,
    ctc: 1200000,
    existingEmi: 0,
    savings: 200000,
    buyYear: currentYear,
    hike: 8,
    monthlySave: 10000,
    tenure: 5,
    rate: 9,
    kmPerMonth: 1000,
    cityMix: 70,
    fuels: ['Any'],
    transmission: 'Any',
    homeCharging: true,
    bodyTypes: [],
    seats: 4,
    makes: [],
    minYear: 0,
    minNcap: 0,
    budgetCap: 0,
    mustHaves: [],
    weights: { aff: 35, safety: 25, feature: 25, running: 15 },
  };
}

// Claimed (ARAI / MIDC) figures are optimistic. Real-world share of the claim, [city, highway].
export const REAL_WORLD = {
  Petrol: [0.7, 0.88],
  Diesel: [0.72, 0.9],
  CNG: [0.75, 0.88],
  'Strong hybrid': [0.82, 0.8],
  Electric: [0.78, 0.66],
};

const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const lerp = (x, x0, x1, y0, y1) => y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);

/** Claimed efficiency: kmpl, km/kg (CNG) or km/kWh (EV, from claimed range ÷ battery). */
export function claimedEff(car, fuel) {
  if (fuel === 'Electric') return car.ev ? car.ev.range / car.ev.kwh : NaN;
  return car.eff[fuel] ?? NaN;
}

export function realEff(car, fuel, cityMix) {
  const mix = cityMix / 100;
  const [c, h] = REAL_WORLD[fuel];
  return claimedEff(car, fuel) * (c * mix + h * (1 - mix));
}

export function energyPrice(fuel, s, homeCharging) {
  switch (fuel) {
    case 'Petrol':
    case 'Strong hybrid':
      return s.petrol;
    case 'Diesel':
      return s.diesel;
    case 'CNG':
      return s.cng;
    case 'Electric':
      return homeCharging ? s.homeKwh : s.publicKwh;
  }
  return NaN;
}

export function scoreA1(r) {
  if (r <= 0.15) return 100;
  if (r <= 0.25) return lerp(r, 0.15, 0.25, 100, 60);
  if (r <= 0.4) return lerp(r, 0.25, 0.4, 60, 10);
  return 0;
}
export function scoreA2(p) {
  if (p <= 0.5) return 100;
  if (p <= 1) return lerp(p, 0.5, 1, 100, 20);
  if (p <= 1.5) return lerp(p, 1, 1.5, 20, 0);
  return 0;
}
export function scoreA3(d) {
  if (d >= 0.2) return 100;
  return lerp(Math.max(0, d), 0, 0.2, 30, 100);
}
export function runningScore(perKm) {
  if (perKm <= 2) return 100;
  if (perKm <= 8) return lerp(perKm, 2, 8, 100, 20);
  return 10;
}

export function affordabilityLabel(score, overCap) {
  if (overCap) return 'Over your cap';
  if (score >= 80) return 'Comfortable';
  if (score >= 60) return 'Manageable';
  if (score >= 40) return 'Stretch';
  return 'Not advisable';
}

/** Take-home (projected to the purchase year), down payment and income left after existing EMIs. */
export function effectiveFinances(inp, currentYear) {
  const baseSalary = inp.salaryMode === 'ctc' ? ctcToInHand(inp.ctc) : inp.salary;
  const yearsAhead = Math.max(0, inp.buyYear - currentYear);
  const p = projectFinances({
    monthlySalary: baseSalary,
    savings: inp.savings,
    yearsAhead,
    hikePct: inp.hike,
    monthlySave: inp.monthlySave,
  });
  return { baseSalary, salary: p.salary, downPayment: p.downPayment, yearsAhead, income: p.salary - inp.existingEmi };
}

/** Rule-of-thumb limits shown beside the wizard. */
export function budgetGuide(fin) {
  return {
    comfortableMonthly: Math.max(0, fin.income * 0.15),
    stretchMonthly: Math.max(0, fin.income * 0.25),
    sensibleOnRoad: Math.max(0, fin.salary * 12 * 0.5),
    twentyPctCar: fin.downPayment / 0.2,
  };
}

export function normWeights(w) {
  const t = w.aff + w.safety + w.feature + w.running || 1;
  return { aff: w.aff / t, safety: w.safety / t, feature: w.feature / t, running: w.running / t };
}

export const isEv = (car) => car.fuels.length === 1 && car.fuels[0] === 'Electric';

export function exclusionReason(car, inp) {
  if (inp.bodyTypes.length && !inp.bodyTypes.includes(car.body)) return 'Body type';
  if (Math.max(...car.seats) < inp.seats) return 'Seats';
  const fuelPrefs = inp.fuels.filter((f) => f !== 'Any');
  if (fuelPrefs.length && !car.fuels.some((f) => fuelPrefs.includes(f))) return 'Fuel';
  if (inp.transmission !== 'Any' && !car.trans.includes(inp.transmission)) return 'Transmission';
  if (inp.makes.length && !inp.makes.includes(car.brand)) return 'Make';
  if (inp.minYear && Math.max(car.launch, car.updated) < inp.minYear) return 'Model year';
  if (inp.minNcap && (car.ncap?.stars ?? -1) < inp.minNcap) return 'Safety rating';
  return null;
}

const featPts = (v, higherPts) => (v === 'std' ? 1 : v === 'higher' ? higherPts : 0);

/** EMI, running and ownership costs for one price point (₹ lakh ex-showroom) on one fuel. */
export function costFor(car, exLakh, fuel, inp, s, fin) {
  const ev = fuel === 'Electric';
  const exShowroom = exLakh * 1e5;
  const onRoad = exShowroom * (ev ? s.evOnRoadMult : s.onRoadMult);
  const loan = Math.max(0, onRoad - fin.downPayment);
  const emiAmt = emi(loan, inp.rate, inp.tenure);
  const perKm = energyPrice(fuel, s, inp.homeCharging) / realEff(car, fuel, inp.cityMix);
  const running = perKm * inp.kmPerMonth;
  const insurance = insurancePerMonth(onRoad);
  const maintenance = maintenancePerMonth(exLakh, ev);
  return { exShowroom, onRoad, loan, emi: emiAmt, perKm, running, insurance, maintenance, monthly: emiAmt + running + insurance + maintenance };
}

const fuelOk = (inp, fuel) => inp.fuels.includes('Any') || inp.fuels.includes(fuel);
const transOk = (inp, trans) => inp.transmission === 'Any' || inp.transmission === trans;

/**
 * Every trim + powertrain the buyer could pick, costed. `fits` = matches their fuel and gearbox choice.
 * Rows are in ladder order; within a trim, cheapest monthly cost first.
 */
export function variantOptions(car, inp, s, fin) {
  if (!car.variants) return [];
  return car.variants.flatMap((v, index) =>
    v.options
      .map((o) => ({
        variant: v,
        index,
        fuel: o.fuel,
        trans: o.trans,
        price: o.price,
        fits: fuelOk(inp, o.fuel) && transOk(inp, o.trans),
        has: inp.mustHaves.filter((k) => v.has.has(k)),
        cost: costFor(car, o.price, o.fuel, inp, s, fin),
      }))
      .sort((a, b) => a.cost.monthly - b.cost.monthly),
  );
}

/** Recommended variant: most must-haves first, then the lowest monthly cost. */
export function pickVariant(options) {
  const pool = options.some((o) => o.fits) ? options.filter((o) => o.fits) : options;
  return pool.reduce(
    (best, o) => (!best || o.has.length > best.has.length || (o.has.length === best.has.length && o.cost.monthly < best.cost.monthly) ? o : best),
    null,
  );
}

export function scoreCar(car, inp, s, fin) {
  let pick = null;
  let tier;
  let exLakh;
  let fuelUsed;
  let needsHigher;
  let missing;

  if (car.variants) {
    pick = pickVariant(variantOptions(car, inp, s, fin));
    tier = pick.variant.name;
    exLakh = pick.price;
    fuelUsed = pick.fuel;
    needsHigher = [];
    missing = inp.mustHaves.filter((k) => !pick.variant.has.has(k));
  } else {
    // No trim data: price a mid-low variant, or an upper one if a must-have needs it.
    needsHigher = inp.mustHaves.filter((k) => car.features[k] === 'higher');
    missing = inp.mustHaves.filter((k) => car.features[k] === 'no');
    tier = needsHigher.length ? 'Upper' : 'Base/Mid';
    exLakh = car.priceMin + (car.priceMax - car.priceMin) * (needsHigher.length ? 0.8 : 0.25);
    // Preferred fuel if the car offers it, otherwise whichever it offers that is cheapest per km.
    const preferred = car.fuels.filter((f) => inp.fuels.includes(f));
    const candidates = preferred.length ? preferred : car.fuels;
    const perKmOf = (f) => energyPrice(f, s, inp.homeCharging) / realEff(car, f, inp.cityMix);
    fuelUsed = candidates.reduce((a, b) => (perKmOf(b) < perKmOf(a) ? b : a));
  }

  const c = pick ? pick.cost : costFor(car, exLakh, fuelUsed, inp, s, fin);
  const { exShowroom, onRoad, loan, perKm, running, insurance, maintenance, monthly } = c;

  const r = fin.income > 0 ? monthly / fin.income : Infinity;
  const p = fin.salary > 0 ? onRoad / (12 * fin.salary) : Infinity;
  const d = onRoad > 0 ? fin.downPayment / onRoad : 1;
  const a1 = scoreA1(r);
  const a2 = scoreA2(p);
  const a3 = scoreA3(d);
  const affordability = Math.round(0.5 * a1 + 0.3 * a2 + 0.2 * a3);
  const overCap = inp.budgetCap > 0 && onRoad > inp.budgetCap;

  const unrated = car.ncap == null;
  const ncapPts = unrated ? 35 : car.ncap.stars * 14;
  const airbagPts = featPts(car.features.airbags6, 0.5) * 10;
  const escPts = car.features.esc === 'std' ? 6 : 0;
  const adasPts = featPts(car.features.adas, 0.5) * 4;
  const safety = Math.round(clamp(ncapPts + airbagPts + escPts + adasPts));

  let feature;
  if (inp.mustHaves.length && pick) {
    feature = Math.round((100 * pick.has.length) / inp.mustHaves.length);
  } else if (inp.mustHaves.length) {
    const pts = inp.mustHaves.reduce((a, k) => a + featPts(car.features[k], 0.7), 0);
    feature = Math.round((100 * pts) / inp.mustHaves.length);
  } else {
    const pts = ALL_FEATURES.reduce((a, f) => a + featPts(car.features[f.key], 0.5), 0);
    feature = Math.round((100 * pts) / ALL_FEATURES.length);
  }

  let rs = runningScore(perKm);
  const frugal = ['Diesel', 'CNG', 'Strong hybrid'].includes(fuelUsed) || (fuelUsed === 'Electric' && inp.homeCharging);
  if (inp.kmPerMonth > 1500 && frugal) rs += 10;
  const runScore = Math.round(clamp(rs));

  const w = normWeights(inp.weights);
  const buyable = Math.round(w.aff * affordability + w.safety * safety + w.feature * feature + w.running * runScore);

  return {
    car,
    excluded: exclusionReason(car, inp),
    tier,
    variant: pick ? { name: pick.variant.name, fuel: pick.fuel, trans: pick.trans, price: pick.price, index: pick.index } : null,
    exShowroom,
    onRoad,
    loan,
    emi: c.emi,
    fuelUsed,
    running,
    perKm,
    insurance,
    maintenance,
    monthly,
    a1,
    a2,
    a3,
    r,
    p,
    d,
    affordability,
    affLabel: affordabilityLabel(affordability, overCap),
    overCap,
    overBudget: overCap || (inp.budgetCap === 0 && affordability < 40),
    safety,
    safetyParts: { ncap: ncapPts, airbags: airbagPts, esc: escPts, adas: adasPts, unrated },
    feature,
    runScore,
    buyable,
    missing,
    needsHigher,
    publicChargingWarning: fuelUsed === 'Electric' && !inp.homeCharging,
  };
}

/** Score every car; ranked by Buyable score, excluded cars after eligible ones. */
export function scoreAll(cars, inp, s, currentYear) {
  const fin = effectiveFinances(inp, currentYear);
  const results = cars.map((c) => scoreCar(c, inp, s, fin));
  results.sort((a, b) => (!!a.excluded - !!b.excluded) || b.buyable - a.buyable);
  return { fin, results };
}

/** 20/4/10: at least 20% down, loan of 4 years or less, all car costs within 10% of take-home. */
export function rule20410(res, inp, income) {
  const down = res.d >= 0.2;
  const tenure = inp.tenure <= 4;
  const cost = income > 0 && res.monthly / income <= 0.1;
  return { down, tenure, cost, pass: down && tenure && cost };
}

export function whyBullets(res) {
  const out = [];
  if (res.affordability >= 60) out.push(`${res.affLabel} on your income: all running costs come to ${Math.round(res.r * 100)}% of take-home`);
  else out.push(`Best overall balance, but affordability is a ${res.affLabel.toLowerCase()} at ${Math.round(res.r * 100)}% of take-home`);
  if (res.car.ncap) out.push(`${res.car.ncap.stars}-star ${res.car.ncap.agency} adult rating (${res.car.ncap.year})`);
  else out.push(`Safety score ${res.safety}/100 — not crash-tested in India yet`);
  if (res.feature >= 80) out.push(`Strong feature match (${res.feature}/100)`);
  else out.push(`Runs for about ₹${res.perKm.toFixed(1)} a km on ${fuelWord(res.fuelUsed)}`);
  return out;
}
