import { test } from 'node:test';
import assert from 'node:assert/strict';

import { emi, ctcToInHand, projectFinances, maintenancePerMonth } from '../js/finance.js';
import {
  scoreA1, scoreA2, scoreA3, runningScore, affordabilityLabel, scoreCar, scoreAll, effectiveFinances,
  exclusionReason, defaultInputs, DEFAULT_SETTINGS, FUELS, claimedEff, rule20410,
} from '../js/scoring.js';
import { CARS, BRANDS, BODY_TYPES, feats } from '../js/data/cars.js';
import { ALL_FEATURES } from '../js/features.js';
import { inr, inrShort, lakhRange } from '../js/format.js';

const YEAR = 2026;
const close = (a, b, tol = 1) => assert.ok(Math.abs(a - b) <= tol, `${a} not within ${tol} of ${b}`);
const byId = (id) => CARS.find((c) => c.id === id);
// The same car without its trim ladder, to exercise the estimate used when trim data is missing.
const noTrims = (id) => ({ ...byId(id), variants: null });

test('EMI matches the reducing-balance formula', () => {
  close(emi(500000, 9, 5), 10379); // ₹5 L at 9% for 5 years
  close(emi(1000000, 8.5, 7), 15836);
  assert.equal(emi(0, 9, 5), 0);
  close(emi(120000, 0, 1), 10000, 0.001);
});

test('CTC converts to take-home and projects forward', () => {
  assert.equal(ctcToInHand(1200000), 75000);
  const p = projectFinances({ monthlySalary: 100000, savings: 200000, yearsAhead: 2, hikePct: 10, monthlySave: 10000 });
  close(p.salary, 121000, 0.01);
  assert.equal(p.downPayment, 440000);
});

test('maintenance bands and EV discount', () => {
  assert.equal(maintenancePerMonth(9.99, false), 1000);
  assert.equal(maintenancePerMonth(10, false), 1500);
  assert.equal(maintenancePerMonth(35, false), 2500);
  assert.equal(maintenancePerMonth(36, false), 4000);
  assert.equal(maintenancePerMonth(15, true), 900);
});

test('affordability sub-scores follow the spec breakpoints', () => {
  assert.equal(scoreA1(0.15), 100);
  assert.equal(scoreA1(0.2), 80);
  assert.equal(scoreA1(0.25), 60);
  close(scoreA1(0.325), 35, 0.001);
  assert.equal(scoreA1(0.41), 0);
  assert.equal(scoreA2(0.5), 100);
  assert.equal(scoreA2(0.75), 60);
  assert.equal(scoreA2(1.25), 10);
  assert.equal(scoreA2(2), 0);
  assert.equal(scoreA3(0.2), 100);
  assert.equal(scoreA3(0.1), 65);
  assert.equal(scoreA3(0), 30);
  assert.equal(runningScore(2), 100);
  assert.equal(runningScore(5), 60);
  assert.equal(runningScore(9), 10);
  assert.equal(affordabilityLabel(85, false), 'Comfortable');
  assert.equal(affordabilityLabel(60, false), 'Manageable');
  assert.equal(affordabilityLabel(45, false), 'Stretch');
  assert.equal(affordabilityLabel(39, false), 'Not advisable');
  assert.equal(affordabilityLabel(95, true), 'Over your cap');
});

test('without trim data, must-haves on higher variants push the price to the upper tier', () => {
  const inp = defaultInputs(YEAR);
  const fin = effectiveFinances(inp, YEAR);
  const nexon = noTrims('tata-nexon');
  const base = scoreCar(nexon, inp, DEFAULT_SETTINGS, fin);
  assert.equal(base.tier, 'Base/Mid');
  close(base.exShowroom, (nexon.priceMin + (nexon.priceMax - nexon.priceMin) * 0.25) * 1e5, 0.01);
  const withSunroof = scoreCar(nexon, { ...inp, mustHaves: ['sunroof'] }, DEFAULT_SETTINGS, fin);
  assert.equal(withSunroof.tier, 'Upper');
  assert.ok(withSunroof.onRoad > base.onRoad);
  assert.deepEqual(withSunroof.needsHigher, ['sunroof']);
});

test('without trim data, feature match scores standard 1, higher 0.7, missing 0', () => {
  const inp = { ...defaultInputs(YEAR), mustHaves: ['airbags6', 'sunroof', 'hud'] };
  const fin = effectiveFinances(inp, YEAR);
  const r = scoreCar(noTrims('tata-nexon'), inp, DEFAULT_SETTINGS, fin); // airbags std, sunroof higher, no HUD
  assert.equal(r.feature, Math.round((100 * 1.7) / 3));
  assert.deepEqual(r.missing, ['hud']);
});

test('EVs use the EV on-road multiplier and home vs public charging', () => {
  const inp = defaultInputs(YEAR);
  const fin = effectiveFinances(inp, YEAR);
  const ev = byId('tata-nexon-ev');
  const home = scoreCar(ev, inp, DEFAULT_SETTINGS, fin);
  close(home.onRoad, home.exShowroom * DEFAULT_SETTINGS.evOnRoadMult, 0.01);
  const pub = scoreCar(ev, { ...inp, homeCharging: false }, DEFAULT_SETTINGS, fin);
  assert.ok(pub.running > home.running * 2);
  assert.equal(pub.publicChargingWarning, true);
});

test('fuel choice: variant cars cost every version, others use the preferred or cheapest-to-run fuel', () => {
  const inp = defaultInputs(YEAR);
  const fin = effectiveFinances(inp, YEAR);
  const swift = byId('maruti-suzuki-swift');
  // At 1,000 km a month the base petrol costs less to own than the cheapest CNG trim.
  assert.equal(scoreCar(swift, inp, DEFAULT_SETTINGS, fin).fuelUsed, 'Petrol');
  assert.equal(scoreCar(swift, { ...inp, fuels: ['CNG'] }, DEFAULT_SETTINGS, fin).variant.name, 'VXi');
  // At 4,000 km a month CNG wins.
  assert.equal(scoreCar(swift, { ...inp, kmPerMonth: 4000 }, DEFAULT_SETTINGS, fin).fuelUsed, 'CNG');
  const fallback = CARS.find((c) => !c.variants && c.fuels.includes('CNG') && c.fuels.includes('Petrol'));
  if (fallback) {
    assert.equal(scoreCar(fallback, inp, DEFAULT_SETTINGS, fin).fuelUsed, 'CNG');
    assert.equal(scoreCar(fallback, { ...inp, fuels: ['Petrol'] }, DEFAULT_SETTINGS, fin).fuelUsed, 'Petrol');
  }
});

test('hard filters exclude cars with a reason', () => {
  const inp = defaultInputs(YEAR);
  assert.equal(exclusionReason(byId('mahindra-thar'), { ...inp, seats: 5 }), 'Seats');
  assert.equal(exclusionReason(byId('maruti-suzuki-swift'), { ...inp, fuels: ['Diesel'] }), 'Fuel');
  assert.equal(exclusionReason(byId('mahindra-bolero'), { ...inp, transmission: 'Automatic' }), 'Transmission');
  assert.equal(exclusionReason(byId('kia-sonet'), { ...inp, minNcap: 3 }), 'Safety rating');
  assert.equal(exclusionReason(byId('tata-nexon'), inp), null);
});

test('scoreAll ranks eligible cars first by Buyable score', () => {
  const inp = { ...defaultInputs(YEAR), bodyTypes: ['Sedan'] };
  const { results } = scoreAll(CARS, inp, DEFAULT_SETTINGS, YEAR);
  const firstExcluded = results.findIndex((r) => r.excluded);
  assert.ok(firstExcluded > 0);
  assert.ok(results.slice(firstExcluded).every((r) => r.excluded));
  const eligible = results.slice(0, firstExcluded);
  assert.ok(eligible.every((r) => r.car.body === 'Sedan'));
  for (let i = 1; i < eligible.length; i++) assert.ok(eligible[i - 1].buyable >= eligible[i].buyable);
});

test('variant pick: cheapest trim that has the must-haves, within fuel and gearbox', () => {
  const venue = byId('hyundai-venue');
  const base = defaultInputs(YEAR);
  const fin = effectiveFinances(base, YEAR);
  // No must-haves: the cheapest-to-own option overall.
  assert.equal(scoreCar(venue, base, DEFAULT_SETTINGS, fin).variant.name, 'HX 2');
  // Sunroof first appears on HX 5.
  const sun = scoreCar(venue, { ...base, mustHaves: ['sunroof'] }, DEFAULT_SETTINGS, fin);
  assert.deepEqual([sun.variant.name, sun.variant.trans, sun.missing], ['HX 5', 'Manual', []]);
  assert.equal(sun.feature, 100);
  // Ventilated seats + automatic petrol: HX 8 turbo DCT.
  const vent = scoreCar(venue, { ...base, mustHaves: ['ventSeats'], fuels: ['Petrol'], transmission: 'Automatic' }, DEFAULT_SETTINGS, fin);
  assert.deepEqual([vent.variant.name, vent.variant.fuel, vent.variant.trans, vent.variant.price], ['HX 8', 'Petrol', 'Automatic', 13.03]);
  close(vent.exShowroom, 13.03e5, 0.01);
  // ADAS only on HX 10; with a manual gearbox it can't be had, so the best manual misses it.
  const adasManual = scoreCar(venue, { ...base, mustHaves: ['adas', 'sunroof'], transmission: 'Manual' }, DEFAULT_SETTINGS, fin);
  assert.equal(adasManual.variant.trans, 'Manual');
  assert.deepEqual(adasManual.missing, ['adas']);
  assert.equal(adasManual.feature, 50);
});

test('variant ladders derive features, prices and gearboxes', () => {
  const venue = byId('hyundai-venue');
  assert.equal(venue.priceMin, 8.0);
  assert.equal(venue.priceMax, 15.65);
  assert.equal(venue.features.airbags6, 'std');
  assert.equal(venue.features.adas, 'higher');
  assert.equal(venue.features.hud, 'no');
  for (const c of CARS.filter((x) => x.variants)) {
    for (const v of c.variants) {
      assert.ok(v.options.length, `${c.id} ${v.name}: no powertrains`);
      for (const o of v.options) {
        assert.ok(c.fuels.includes(o.fuel), `${c.id} ${v.name}: ${o.fuel} not in fuels`);
        assert.ok(o.price > 0 && o.price < 300, `${c.id} ${v.name}: price ${o.price}`);
      }
    }
  }
});

test('20/4/10 rule checks all three conditions', () => {
  const inp = { ...defaultInputs(YEAR), tenure: 4, salary: 300000, savings: 2000000 };
  const fin = effectiveFinances(inp, YEAR);
  const r = scoreCar(byId('maruti-suzuki-alto-k10'), inp, DEFAULT_SETTINGS, fin);
  assert.equal(rule20410(r, inp, fin.income).pass, true);
  assert.equal(rule20410(r, { ...inp, tenure: 5 }, fin.income).tenure, false);
});

test('dataset: every car is complete and consistent', () => {
  assert.ok(CARS.length >= 90, `only ${CARS.length} cars`);
  assert.equal(new Set(CARS.map((c) => c.id)).size, CARS.length, 'duplicate ids');
  assert.ok(BRANDS.length >= 14);
  for (const c of CARS) {
    const where = c.id;
    assert.ok(BODY_TYPES.includes(c.body), `${where}: body ${c.body}`);
    assert.ok(c.priceMin > 0 && c.priceMin <= c.priceMax, `${where}: price`);
    assert.ok(c.fuels.length > 0 && c.fuels.every((f) => FUELS.includes(f)), `${where}: fuels`);
    for (const f of c.fuels) assert.ok(claimedEff(c, f) > 0, `${where}: efficiency for ${f}`);
    assert.ok(c.trans?.length, `${where}: transmission`);
    assert.ok(c.seats.length && c.seats.every((n) => n >= 2 && n <= 9), `${where}: seats`);
    assert.ok(c.airbags >= 0 && c.airbags <= 12, `${where}: airbags`);
    if (c.features.airbags6 === 'std') assert.ok(c.airbags >= 6, `${where}: 6 airbags std but max ${c.airbags}`);
    assert.ok(c.launch >= 1990 && c.updated >= c.launch && c.updated <= 2026, `${where}: years`);
    if (c.ncap) assert.ok([0, 1, 2, 3, 4, 5].includes(c.ncap.stars), `${where}: ncap`);
    assert.equal(Object.keys(c.features).length, ALL_FEATURES.length, `${where}: feature count`);
  }
});

test('feats() rejects unknown keys and implies sunroof from panoramic', () => {
  assert.throws(() => feats('airbags6 sunrooof'), /Unknown feature key "sunrooof"/);
  assert.equal(feats('', 'panoSunroof').sunroof, 'higher');
  assert.equal(feats('panoSunroof').sunroof, 'std');
});

test('Indian number formatting', () => {
  assert.equal(inr(1234567), '₹12,34,567');
  assert.equal(inrShort(845000), '₹8.45 L');
  assert.equal(inrShort(12000000), '₹1.2 Cr');
  assert.equal(lakhRange(5.99, 9.1), '₹5.99–9.1 L');
  assert.equal(lakhRange(130, 130), '₹1.3 Cr');
});
