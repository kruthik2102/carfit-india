// Car detail panel: slides in from the right (bottom sheet on phones).

import { FEATURE_GROUPS, GROUP_NAMES, FEATURE_LABEL, ALL_FEATURES } from '../features.js';
import { REAL_WORLD, claimedEff, realEff, normWeights, rule20410, variantOptions } from '../scoring.js';
import { getState, toggleCompare, subscribe } from '../state.js';
import { compute } from '../compute.js';
import { plate, gauge, availMark, stars, variantLabel } from '../components.js';
import { inr, inrShort, lakhRange, pct, esc, fuelWord } from '../format.js';

const UNIT = { Petrol: 'kmpl', Diesel: 'kmpl', CNG: 'km/kg', 'Strong hybrid': 'kmpl', Electric: 'km/kWh' };
let opener = null;
let unsub = null;

const check = (ok) => `<span class="${ok ? 'ok' : 'bad'}">${ok ? '✓' : '✗'}</span>`;
const bar = (label, score, weight, note) => `
  <div class="sbar">
    <div class="sbar-top"><span>${label}</span><span><b>${score}</b>/100 · counts ${Math.round(weight * 100)}%</span></div>
    <div class="sbar-track"><i style="width:${score}%"></i></div>
    <p class="fine">${note}</p>
  </div>`;

const SHORT = Object.fromEntries(ALL_FEATURES.map((f) => [f.key, f.short]));
// Mid-sentence feature names: "ventilated front seats", but "ADAS" and "LED headlamps" keep their capitals.
const inSentence = (k) => FEATURE_LABEL[k].replace(/^([A-Z])(?![A-Z])/, (m) => m.toLowerCase());
const listOf = (keys, max = 6) =>
  keys.length > max ? `${keys.slice(0, max).map(inSentence).join(', ')} and ${keys.length - max} more` : keys.map(inSentence).join(', ');
const hasMark = (yes) => `<span class="mark mark-${yes ? 'std' : 'no'}" title="${yes ? 'Included' : 'Not included'}"><span aria-hidden="true">${yes ? '✓' : '✗'}</span><span class="sr">${yes ? 'Included' : 'Not included'}</span></span>`;
const ptWord = (o) => `${o.fuel === 'CNG' ? 'CNG' : o.fuel.toLowerCase()} ${o.trans.toLowerCase()}`;

/** Which trim to buy: the recommendation, what stepping up or down changes, and the whole ladder. */
function variantSection(r, st, fin) {
  const c = r.car;
  const i = st.inputs;
  if (!c.variants) {
    const why = r.needsHigher.length ? ` because ${listOf(r.needsHigher)} ${r.needsHigher.length > 1 ? 'are' : 'is'} only on higher variants` : '';
    return `<section><h3>Which variant to buy</h3>
      <p>Trim-by-trim data hasn't been added for this car yet. Costs use an estimated ${r.tier === 'Upper' ? 'upper' : 'mid-low'} variant at ${inrShort(r.exShowroom)} ex-showroom${why}.</p></section>`;
  }
  if (c.variants.length === 1) {
    const n = i.mustHaves.length;
    const musts = n ? (r.missing.length ? ` It doesn't have ${esc(listOf(r.missing))}.` : ` It has ${n === 1 ? 'your must-have' : `all ${n} of your must-haves`}.`) : '';
    return `<section><h3>Which variant to buy</h3>
      <p class="variant-pick">Sold in one version (${ptWord(r.variant)}) at ${inrShort(r.exShowroom)} ex-showroom, about ${inr(r.monthly)} a month all-in.${musts}</p></section>`;
  }
  const opts = variantOptions(c, i, st.settings, fin);
  const rows = c.variants.map((v, idx) => {
    const mine = opts.filter((o) => o.index === idx);
    const fit = mine.filter((o) => o.fits);
    return { v, idx, best: (fit.length ? fit : mine)[0], fits: fit.length > 0 };
  });
  const rec = rows[r.variant.index];
  const n = i.mustHaves.length;
  const up = rows.slice(rec.idx + 1).find((x) => x.fits);
  const down = rows.slice(0, rec.idx).reverse().find((x) => x.fits);
  const prefs = [
    i.fuels.includes('Any') ? '' : i.fuels.map((f) => (f === 'CNG' ? 'CNG' : f.toLowerCase())).join(' / '),
    i.transmission === 'Any' ? '' : i.transmission.toLowerCase(),
  ]
    .filter(Boolean)
    .join(' ');
  const kind = `${prefs ? prefs + ' ' : ''}version`;
  const allOf = n === 1 ? 'your must-have' : n === 2 ? 'both your must-haves' : `all ${n} of your must-haves`;
  const why = n
    ? r.missing.length
      ? `It has ${n - r.missing.length} of your ${n} must-haves. No ${kind} has ${listOf(r.missing)}.`
      : `It's the cheapest ${kind} with ${allOf}.`
    : `You haven't picked must-haves, so this is the cheapest ${kind} to own.`;
  const upAdds = up ? [...up.v.has].filter((k) => !rec.v.has.has(k)) : [];
  const downLoses = down ? i.mustHaves.filter((k) => rec.v.has.has(k) && !down.v.has.has(k)) : [];

  return `<section>
    <h3>Which variant to buy</h3>
    <p class="variant-pick">Buy the <b>${esc(variantLabel(r))}</b> at ${inrShort(r.exShowroom)} ex-showroom, about ${inr(r.monthly)} a month all-in. ${esc(why)}</p>
    ${up && upAdds.length ? `<p class="fine">Step up to <b>${esc(up.v.name)}</b> (${ptWord(up.best)}) for +${inrShort((up.best.price - r.variant.price) * 1e5)}, or +${inr(up.best.cost.monthly - r.monthly)} a month: adds ${esc(listOf(upAdds))}.</p>` : ''}
    ${n && down && downLoses.length ? `<p class="fine"><b>${esc(down.v.name)}</b> saves ${inrShort((r.variant.price - down.best.price) * 1e5)} but loses ${esc(listOf(downLoses))}.</p>` : ''}
    <div class="vtable-wrap" tabindex="0" aria-label="Variants, scrolls sideways">
      <table class="vtable">
        <thead><tr><th scope="col">Variant</th><th scope="col">For you</th><th scope="col" class="num">Ex-showroom</th><th scope="col" class="num">Monthly</th>${n ? '<th scope="col">Must-haves</th>' : ''}<th scope="col">Adds over the one below</th></tr></thead>
        <tbody>
          ${rows
            .map((x) => {
              const isRec = x.idx === rec.idx;
              const marks = n ? `<td class="musts">${x.best.has.length}/${n} ${i.mustHaves.map((k) => hasMark(x.v.has.has(k))).join('')}</td>` : '';
              return `<tr class="${isRec ? 'rec' : ''}${x.fits ? '' : ' nofit'}">
                <th scope="row">${esc(x.v.name)}${isRec ? ' <span class="rec-tag">Pick</span>' : ''}</th>
                <td>${x.fits ? ptWord(x.best) : `<span class="muted">No ${prefs || 'match'}</span>`}</td>
                <td class="num">${inrShort(x.best.price * 1e5)}</td>
                <td class="num">${inr(x.best.cost.monthly)}</td>
                ${marks}
                <td class="adds">${x.v.adds.map((k) => SHORT[k]).join(', ')}${x.v.note ? ` <span class="muted">(${esc(x.v.note)})</span>` : ''}</td>
              </tr>`;
            })
            .join('')}
        </tbody>
      </table>
    </div>
    <p class="fine">Monthly = EMI + fuel + insurance + servicing for that version. Colour and edition variants are left out.</p>
  </section>`;
}

function body(r, st, fin) {
  const c = r.car;
  const i = st.inputs;
  const w = normWeights(i.weights);
  const rule = rule20410(r, i, fin.income);
  const sp = r.safetyParts;
  const inCompare = st.compare.includes(c.id);
  const mustRows = i.mustHaves.map((k) => `<li>${availMark(c.features[k])} ${esc(FEATURE_LABEL[k])}</li>`).join('');

  return `
  <header class="sheet-head">
    ${plate(c, 'lg')}
    <div>
      <h2 id="sheet-title">${esc(c.brand)} ${esc(c.model)}</h2>
      <p class="muted">${esc(c.body)} · ${c.seats.join(' / ')} seats · ${c.fuels.join(', ')} · ${c.trans.join(' / ')}</p>
      ${c.notes ? `<p class="fine">${esc(c.notes)}</p>` : ''}
    </div>
    <button type="button" class="icon-btn" data-close aria-label="Close">✕</button>
  </header>

  <div class="sheet-body">
    <div class="gauges">${gauge(r.buyable, 'Buyable')}${gauge(r.affordability, 'Affordability', r.affLabel)}</div>
    ${r.excluded ? `<p class="callout">Your filters exclude this car (${esc(r.excluded)}), so it is not ranked.</p>` : ''}

    ${variantSection(r, st, fin)}

    <section>
      <h3>Price and loan</h3>
      <dl class="kv">
        <div><dt>Ex-showroom range</dt><dd>${lakhRange(c.priceMin, c.priceMax)}</dd></div>
        <div><dt>Variant</dt><dd>${esc(variantLabel(r))} · ${inrShort(r.exShowroom)}</dd></div>
        <div><dt>On-road estimate</dt><dd>${inrShort(r.onRoad)}<small> · ex-showroom × ${(r.onRoad / r.exShowroom).toFixed(2)}</small></dd></div>
        <div><dt>Down payment</dt><dd>${inr(fin.downPayment)}<small> · ${pct(r.d)} of on-road</small></dd></div>
        <div><dt>Loan</dt><dd>${inr(r.loan)}</dd></div>
        <div><dt>EMI</dt><dd>${inr(r.emi)}<small>/mo for ${i.tenure} yrs at ${i.rate}%</small></dd></div>
      </dl>
    </section>

    <section>
      <h3>Monthly cost of owning it</h3>
      <dl class="kv">
        <div><dt>EMI</dt><dd>${inr(r.emi)}</dd></div>
        <div><dt>${r.fuelUsed === 'Electric' ? 'Charging' : 'Fuel'} (${fuelWord(r.fuelUsed)})</dt><dd>${inr(r.running)}<small> · ₹${r.perKm.toFixed(2)}/km × ${i.kmPerMonth.toLocaleString('en-IN')} km</small></dd></div>
        <div><dt>Insurance</dt><dd>${inr(r.insurance)}<small> · 3% of on-road a year</small></dd></div>
        <div><dt>Servicing</dt><dd>${inr(r.maintenance)}</dd></div>
        <div class="kv-total"><dt>Total</dt><dd>${inr(r.monthly)}<small> · ${pct(r.r)} of ${i.existingEmi ? 'take-home after EMIs' : 'take-home'}</small></dd></div>
      </dl>
      ${r.publicChargingWarning ? '<p class="callout">Assumes public fast charging, which costs far more per km than charging at home.</p>' : ''}
    </section>

    <section>
      <h3>Rules of thumb</h3>
      <ul class="checks">
        <li>${check(r.d >= 0.2)} At least 20% down payment <span class="muted">(${pct(r.d)})</span></li>
        <li>${check(rule.tenure)} Loan of 4 years or less <span class="muted">(${i.tenure} years)</span></li>
        <li>${check(rule.cost)} All car costs within 10% of take-home <span class="muted">(${pct(r.r)})</span></li>
      </ul>
      <p class="fine">${rule.pass ? 'Passes the 20/4/10 rule.' : 'The 20/4/10 rule is strict — most buyers in India miss at least one part. Treat it as a target, not a verdict.'}</p>
    </section>

    <section>
      <h3>How the Buyable score adds up</h3>
      ${bar('Affordability', r.affordability, w.aff, `Monthly burden ${pct(r.r)} → ${Math.round(r.a1)} × 50% · price ${r.p.toFixed(2)}× a year's pay → ${Math.round(r.a2)} × 30% · down payment ${pct(r.d)} → ${Math.round(r.a3)} × 20%`)}
      ${bar('Safety', r.safety, w.safety, `${sp.unrated ? 'Not crash-tested: 35' : `${c.ncap.stars}★ ${c.ncap.agency} (${c.ncap.year}): ${sp.ncap}`} + 6 airbags ${sp.airbags} + ESC ${sp.esc} + ADAS ${sp.adas}`)}
      ${bar('Feature match', r.feature, w.feature, i.mustHaves.length ? `Your ${i.mustHaves.length} must-haves: standard = full marks, higher variants = 70%, missing = 0` : 'No must-haves chosen: share of all features offered (higher variants count half)')}
      ${bar('Running cost', r.runScore, w.running, `₹${r.perKm.toFixed(2)} per km${i.kmPerMonth > 1500 && r.runScore > 0 ? ' · high-mileage bonus applies to diesel, CNG, hybrid and home-charged EVs' : ''}`)}
    </section>

    ${i.mustHaves.length ? `<section><h3>Your must-haves</h3><ul class="featlist">${mustRows}</ul></section>` : ''}

    <section>
      <h3>Mileage</h3>
      <table class="mini">
        <thead><tr><th scope="col">Fuel</th><th scope="col">Claimed</th><th scope="col">Expect (your mix)</th></tr></thead>
        <tbody>
          ${c.fuels
            .map((f) => `<tr><td>${f}</td><td>${f === 'Electric' ? `${c.ev.range} km on ${c.ev.kwh} kWh` : `${claimedEff(c, f)} ${UNIT[f]}`}</td><td>${realEff(c, f, i.cityMix).toFixed(1)} ${UNIT[f]}${f === 'Electric' ? ` · ~${Math.round(realEff(c, f, i.cityMix) * c.ev.kwh)} km` : ''}</td></tr>`)
            .join('')}
        </tbody>
      </table>
      <p class="fine">Real-world figures use ${Math.round(REAL_WORLD[c.fuels[0]][0] * 100)}% of the claim in the city and ${Math.round(REAL_WORLD[c.fuels[0]][1] * 100)}% on the highway for ${fuelWord(c.fuels[0])}; see How scores work.</p>
    </section>

    <section>
      <h3>Safety and specs</h3>
      <dl class="kv">
        <div><dt>Crash test</dt><dd>${c.ncap ? `${stars(c.ncap.stars)} <small>${c.ncap.agency}, ${c.ncap.year}</small>` : stars(null)}</dd></div>
        <div><dt>Airbags</dt><dd>up to ${c.airbags}</dd></div>
        <div><dt>Launched / last updated</dt><dd>${c.launch} / ${c.updated}</dd></div>
        <div><dt>Length</dt><dd>${c.under4m ? 'Under 4 metres' : 'Over 4 metres'}</dd></div>
      </dl>
    </section>

    <section>
      <h3>All features</h3>
      ${GROUP_NAMES.map(
        (g) => `<h4>${g}</h4><ul class="featlist">${FEATURE_GROUPS[g].map(([k, l]) => `<li class="${i.mustHaves.includes(k) ? 'is-must' : ''}">${availMark(c.features[k])} ${esc(l)}</li>`).join('')}</ul>`,
      ).join('')}
    </section>
  </div>

  <footer class="sheet-foot">
    <button type="button" class="btn btn-primary" data-cmp-sheet="${c.id}">${inCompare ? 'Remove from compare' : 'Add to compare'}</button>
    ${st.compare.length ? `<a class="btn btn-ghost" href="#/compare">Open compare (${st.compare.length})</a>` : ''}
  </footer>`;
}

function onKey(e) {
  if (e.key === 'Escape') closeSheet();
  if (e.key === 'Tab') {
    const sheet = document.querySelector('.sheet');
    const f = sheet?.querySelectorAll('button, a[href], input, [tabindex]:not([tabindex="-1"])');
    if (!f?.length) return;
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) (last.focus(), e.preventDefault());
    else if (!e.shiftKey && document.activeElement === last) (first.focus(), e.preventDefault());
  }
}

export function openSheet(id, from) {
  opener = from ?? document.activeElement;
  const root = document.getElementById('sheet-root');
  const draw = () => {
    const st = getState();
    const { fin, results } = compute(st);
    const r = results.find((x) => x.car.id === id);
    if (!r) return closeSheet();
    const scroll = root.querySelector('.sheet-body')?.scrollTop ?? 0;
    root.innerHTML = `<div class="sheet-backdrop" data-close></div><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">${body(r, st, fin)}</div>`;
    root.querySelector('.sheet-body').scrollTop = scroll;
  };
  draw();
  document.body.classList.add('sheet-open');
  unsub?.();
  unsub = subscribe(draw);
  root.onclick = (e) => {
    if (e.target.closest('[data-close]')) closeSheet();
    const cmp = e.target.closest('[data-cmp-sheet]');
    if (cmp) toggleCompare(cmp.dataset.cmpSheet);
    if (e.target.closest('a[href^="#/"]')) closeSheet(false);
  };
  document.addEventListener('keydown', onKey);
  root.querySelector('[data-close].icon-btn').focus();
}

export function closeSheet(restoreFocus = true) {
  const root = document.getElementById('sheet-root');
  if (!root?.innerHTML) return;
  unsub?.();
  unsub = null;
  root.innerHTML = '';
  document.body.classList.remove('sheet-open');
  document.removeEventListener('keydown', onKey);
  if (restoreFocus && opener?.isConnected) opener.focus();
  opener = null;
}
