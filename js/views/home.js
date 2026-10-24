import { CARS, BRANDS, BODY_TYPES, DATA_LAST_REVIEWED } from '../data/cars.js';
import { ALL_FEATURES } from '../features.js';
import { getState, setInputs, subscribe } from '../state.js';
import { compute, podium } from '../compute.js';
import { bindInputs } from '../bind.js';
import { plate, gauge, scorePill, variantLabel } from '../components.js';
import { inr, inrShort, pct, esc } from '../format.js';

export function home(root) {
  document.title = 'CarFit India — which car can your salary carry?';
  const { inputs } = getState();
  const body1 = inputs.bodyTypes.length === 1 ? inputs.bodyTypes[0] : '';

  root.innerHTML = `
  <section class="hero wrap">
    <div class="hero-copy">
      <p class="eyebrow">Car buying guide for India</p>
      <h1>Which new car can your salary actually carry?</h1>
      <p class="lede">Enter your take-home pay and how far you drive. CarFit prices all ${CARS.length} cars on sale — EMI, fuel or charging, insurance and servicing — and ranks them against what you need.</p>
      <form class="quick card" id="quick" novalidate>
        <label class="field">
          <span class="label">Monthly take-home pay</span>
          <span class="money"><span aria-hidden="true">₹</span><input type="number" inputmode="numeric" min="0" step="1000" data-k="salary" value="${inputs.salaryMode === 'inhand' ? inputs.salary : Math.round((inputs.ctc * 0.75) / 12)}"></span>
          <small class="hint" data-out="salaryYear"></small>
        </label>
        <label class="field">
          <span class="label">Kilometres you drive a month</span>
          <input type="range" min="250" max="5000" step="50" data-k="kmPerMonth" value="${inputs.kmPerMonth}">
          <small class="hint" data-out="km"></small>
        </label>
        <label class="field">
          <span class="label">Body type</span>
          <select data-k="body1">
            <option value="">Any body type</option>
            ${BODY_TYPES.map((b) => `<option ${b === body1 ? 'selected' : ''}>${b}</option>`).join('')}
          </select>
        </label>
        <div class="actions">
          <a class="btn btn-primary" href="#/results">Show my matches</a>
          <a class="btn btn-ghost" href="#/wizard/1">Fine-tune in 4 steps</a>
        </div>
      </form>
    </div>
    <aside class="hero-live card" id="live" aria-live="polite"></aside>
  </section>

  <section class="band">
    <div class="wrap explain">
      <article>
        <h2>Affordability score</h2>
        <p>What the car costs you each month — EMI, fuel or charging, insurance and servicing — against what you take home, plus the price against a year's pay and how much you can put down.</p>
      </article>
      <article>
        <h2>Buyable score</h2>
        <p>Affordability, crash-test safety, your must-have features and running cost, weighted the way you choose. The highest score within your budget is your best match.</p>
      </article>
      <article>
        <h2>Every feature, side by side</h2>
        <p>${ALL_FEATURES.length} features as columns — TPMS, ADAS, rear sunshades, cruise control and more — each marked standard, higher variants only, or not offered.</p>
      </article>
    </div>
    <p class="wrap facts">${CARS.length} cars · ${BRANDS.length} brands · data reviewed ${DATA_LAST_REVIEWED} · <a href="#/method">How the scores work</a></p>
  </section>`;

  const form = root.querySelector('#quick');
  const live = root.querySelector('#live');

  const unbind = bindInputs(form, {
    onKey(key, value) {
      if (key === 'salary') return setInputs({ salary: value, salaryMode: 'inhand' }), true;
      if (key === 'body1') return setInputs({ bodyTypes: value ? [value] : [] }), true;
      return false;
    },
  });

  function refresh() {
    const st = getState();
    const i = st.inputs;
    const salary = i.salaryMode === 'inhand' ? i.salary : (i.ctc * 0.75) / 12;
    form.querySelector('[data-out="salaryYear"]').textContent = `${inrShort(salary * 12)} a year`;
    form.querySelector('[data-out="km"]').textContent = `${i.kmPerMonth.toLocaleString('en-IN')} km · about ${Math.round(i.kmPerMonth / 30)} km a day`;

    const { fin, results } = compute(st);
    const { picks, affordable } = podium(results, 3);
    if (!picks.length) {
      live.innerHTML = `<p class="eyebrow">Your best match</p><p>No car matches that body type with your other filters. <a href="#/wizard/3">Change your filters</a></p>`;
      return;
    }
    const [top, ...rest] = picks;
    live.innerHTML = `
      <p class="eyebrow">${affordable.length ? 'Your best match right now' : 'Closest match — nothing is comfortably affordable yet'}</p>
      <div class="live-top">
        ${plate(top.car, 'lg')}
        <p class="live-name">${esc(top.car.brand)} <b>${esc(top.car.model)}</b> <span class="muted">· ${esc(variantLabel(top))}</span></p>
        <div class="live-stats">
          ${gauge(top.buyable, 'Buyable')}
          <dl class="kv kv-tight">
            <div><dt>Monthly cost</dt><dd>${inr(top.monthly)}<small> · ${pct(top.r)} of pay</small></dd></div>
            <div><dt>On-road price</dt><dd>${inrShort(top.onRoad)}</dd></div>
            <div><dt>Affordability</dt><dd>${top.affLabel}</dd></div>
          </dl>
        </div>
      </div>
      <ol class="live-next" start="2">
        ${rest
          .map(
            (r) => `<li><a href="#/results">${plate(r.car, 'sm')}<span class="live-next-name">${esc(r.car.brand)} ${esc(r.car.model)}</span><span class="live-next-cost">${inr(r.monthly)}/mo</span>${scorePill(r.buyable)}</a></li>`,
          )
          .join('')}
      </ol>
      <p class="fine">Assumes ${inr(fin.downPayment)} down and a ${i.tenure}-year loan at ${i.rate}%. <a href="#/wizard/1">Change these</a></p>`;
  }

  refresh();
  const unsub = subscribe(refresh);
  return () => {
    unsub();
    unbind();
  };
}
