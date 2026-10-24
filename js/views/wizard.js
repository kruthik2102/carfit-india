import { CARS, BRANDS, BODY_TYPES } from '../data/cars.js';
import { FEATURE_GROUPS, GROUP_NAMES } from '../features.js';
import { FUELS, budgetGuide, normWeights } from '../scoring.js';
import { ctcToInHand } from '../finance.js';
import { getState, subscribe, CURRENT_YEAR } from '../state.js';
import { compute, podium } from '../compute.js';
import { bindInputs, syncChoices } from '../bind.js';
import { plate, chips, segmented, scorePill, variantLabel } from '../components.js';
import { inr, inrShort, esc } from '../format.js';

const STEPS = [
  { name: 'Money', title: 'What can you put towards a car?', lede: 'Your pay, existing loans and savings set the budget. Everything stays in this browser.' },
  { name: 'Usage', title: 'How will you use it?', lede: 'Distance and fuel decide the running cost, which often matters more than the sticker price.' },
  { name: 'Car', title: 'What kind of car?', lede: 'These filters remove cars that do not fit. Leave any of them on "Any".' },
  { name: 'Must-haves', title: 'Features you will not compromise on', lede: 'Cars without a must-have are not hidden, but they score lower. If a feature is only on higher variants, we price that variant.' },
];

const money = (key, value, step = 1000) =>
  `<span class="money"><span aria-hidden="true">₹</span><input type="number" inputmode="numeric" min="0" step="${step}" data-k="${key}" value="${value}"></span>`;

function stepMoney(i) {
  const years = Array.from({ length: 5 }, (_, n) => [CURRENT_YEAR + n, n === 0 ? `This year` : String(CURRENT_YEAR + n)]);
  return `
    <div class="field">
      <span class="label" id="lbl-mode">Enter your pay as</span>
      ${segmented('salaryMode', [['inhand', 'Monthly take-home'], ['ctc', 'Annual CTC']], i.salaryMode)}
    </div>
    <label class="field" data-show-if="inhand"><span class="label">Monthly take-home pay</span>${money('salary', i.salary)}<small class="hint" data-out="salaryYear"></small></label>
    <label class="field" data-show-if="ctc"><span class="label">Annual CTC</span>${money('ctc', i.ctc, 10000)}<small class="hint" data-out="ctcInHand"></small></label>
    <label class="field"><span class="label">EMIs you already pay each month</span>${money('existingEmi', i.existingEmi, 500)}<small class="hint">Home, personal or other loans. Enter 0 if none.</small></label>
    <label class="field"><span class="label">Savings for the down payment</span>${money('savings', i.savings, 10000)}<small class="hint" data-out="savings"></small></label>
    <div class="field">
      <span class="label">When do you plan to buy?</span>
      ${segmented('buyYear', years, i.buyYear, { type: 'number' })}
    </div>
    <div class="field-row" data-show-if="future">
      <label class="field"><span class="label">Expected raise each year</span><span class="unit"><input type="number" min="0" max="50" step="0.5" data-k="hike" value="${i.hike}"><span>%</span></span></label>
      <label class="field"><span class="label">Saved each month toward the car</span>${money('monthlySave', i.monthlySave, 1000)}</label>
      <p class="callout" data-out="projection"></p>
    </div>
    <div class="field-row">
      <label class="field"><span class="label">Loan tenure</span><input type="range" min="1" max="7" step="1" data-k="tenure" value="${i.tenure}"><small class="hint" data-out="tenure"></small></label>
      <label class="field"><span class="label">Interest rate</span><span class="unit"><input type="number" min="0" max="25" step="0.1" data-k="rate" value="${i.rate}"><span>% a year</span></span></label>
    </div>`;
}

function stepUsage(i) {
  return `
    <label class="field"><span class="label">Kilometres you drive a month</span><input type="range" min="250" max="5000" step="50" data-k="kmPerMonth" value="${i.kmPerMonth}"><small class="hint" data-out="km"></small></label>
    <label class="field"><span class="label">City or highway</span><input type="range" min="0" max="100" step="5" data-k="cityMix" value="${i.cityMix}"><small class="hint" data-out="mix"></small></label>
    <div class="field"><span class="label">Fuel</span>${chips('fuels', [['Any', 'Any'], ...FUELS.map((f) => [f, f])], i.fuels)}<small class="hint">Pick more than one to compare them.</small></div>
    <div class="field"><span class="label">Gearbox</span>${segmented('transmission', [['Any', 'Any'], ['Manual', 'Manual'], ['Automatic', 'Automatic']], i.transmission)}</div>
    <div class="field" data-show-if="charging">
      <span class="label">Can you charge an EV at home?</span>
      ${segmented('homeCharging', [['true', 'Yes, at home'], ['false', 'No, public chargers only']], String(i.homeCharging), { type: 'bool' })}
      <small class="hint">Public fast charging costs about three times as much per km.</small>
    </div>`;
}

function stepCar(i) {
  const years = [[0, 'Any year'], ...Array.from({ length: 7 }, (_, n) => [CURRENT_YEAR - n, `${CURRENT_YEAR - n} or newer`])];
  return `
    <div class="field"><span class="label">Body type</span>${chips('bodyTypes', [['Any', 'Any'], ...BODY_TYPES.map((b) => [b, b])], i.bodyTypes)}</div>
    <div class="field"><span class="label">Seats you need</span>${segmented('seats', [[4, '4+'], [5, '5+'], [6, '6+'], [7, '7+']], i.seats, { type: 'number' })}</div>
    <div class="field"><span class="label">Brands</span>${chips('makes', [['Any', 'All brands'], ...BRANDS.map((b) => [b, b])], i.makes)}</div>
    <label class="field"><span class="label">Launched or last updated</span>
      <select data-k="minYear" data-type="number">${years.map(([v, l]) => `<option value="${v}" ${v === i.minYear ? 'selected' : ''}>${l}</option>`).join('')}</select>
    </label>
    <div class="field"><span class="label">Minimum crash-test rating</span>${segmented('minNcap', [[0, 'Any'], [3, '3★ +'], [4, '4★ +'], [5, '5★']], i.minNcap, { type: 'number' })}<small class="hint">Bharat NCAP or Global NCAP adult rating. Cars never tested are excluded by any star filter.</small></div>
    <label class="field"><span class="label">Maximum on-road price (optional)</span>${money('budgetCap', i.budgetCap, 50000)}<small class="hint" data-out="cap"></small></label>`;
}

function stepMust(i) {
  const w = i.weights;
  const slider = (k, label) =>
    `<label class="field weight"><span class="label">${label} <b data-out="w-${k}"></b></span><input type="range" min="0" max="100" step="5" data-k="weights.${k}" value="${w[k]}"></label>`;
  return `
    ${GROUP_NAMES.map(
      (g) => `<fieldset class="field"><legend class="label">${g}</legend>${chips('mustHaves', FEATURE_GROUPS[g], i.mustHaves)}</fieldset>`,
    ).join('')}
    <p class="hint" data-out="mustCount"></p>
    <fieldset class="field weights">
      <legend class="label">What matters most to you?</legend>
      <p class="hint">These set how the Buyable score is weighted. They are balanced to add up to 100%.</p>
      ${slider('aff', 'Affordability')}${slider('safety', 'Safety')}${slider('feature', 'Feature match')}${slider('running', 'Running cost')}
    </fieldset>`;
}

const RENDER = [stepMoney, stepUsage, stepCar, stepMust];

const SHOW = {
  inhand: (i) => i.salaryMode === 'inhand',
  ctc: (i) => i.salaryMode === 'ctc',
  future: (i) => i.buyYear > CURRENT_YEAR,
  charging: (i) => i.fuels.includes('Any') || i.fuels.includes('Electric'),
};

function outputs(i, fin) {
  const w = normWeights(i.weights);
  return {
    salaryYear: `${inrShort(i.salary * 12)} a year`,
    ctcInHand: `About ${inr(ctcToInHand(i.ctc))} take-home a month (75% of CTC ÷ 12)`,
    savings: i.savings ? `${inrShort(i.savings)}` : 'No down payment — the full price would be on loan',
    projection: `By ${i.buyYear}: take-home about ${inr(fin.salary)} a month, and ${inr(fin.downPayment)} saved for the down payment.`,
    tenure: `${i.tenure} year${i.tenure > 1 ? 's' : ''}${i.tenure > 4 ? ' — longer than the 4-year rule of thumb' : ''}`,
    km: `${i.kmPerMonth.toLocaleString('en-IN')} km a month · about ${Math.round(i.kmPerMonth / 30)} km a day`,
    mix: `${i.cityMix}% city · ${100 - i.cityMix}% highway`,
    cap: i.budgetCap ? `Cars above ${inrShort(i.budgetCap)} on-road are marked "Over your cap"` : 'No cap — affordability decides',
    mustCount: i.mustHaves.length ? `${i.mustHaves.length} must-have${i.mustHaves.length > 1 ? 's' : ''} selected` : 'No must-haves yet — cars are compared on all features.',
    'w-aff': `${Math.round(w.aff * 100)}%`,
    'w-safety': `${Math.round(w.safety * 100)}%`,
    'w-feature': `${Math.round(w.feature * 100)}%`,
    'w-running': `${Math.round(w.running * 100)}%`,
  };
}

function aside(st, fin, results) {
  const i = st.inputs;
  const g = budgetGuide(fin);
  const { picks, eligible } = podium(results, 1);
  const top = picks[0];
  const future = fin.yearsAhead > 0;
  return `
    <div class="card aside-card">
      <p class="eyebrow">Your numbers${future ? ` in ${i.buyYear}` : ''}</p>
      <dl class="kv">
        <div><dt>Take-home</dt><dd>${inr(fin.salary)}<small>/mo</small></dd></div>
        ${i.existingEmi ? `<div><dt>After current EMIs</dt><dd>${inr(fin.income)}<small>/mo</small></dd></div>` : ''}
        <div><dt>Comfortable car spend</dt><dd>${inr(g.comfortableMonthly)}<small>/mo</small></dd></div>
        <div><dt>Stretch limit</dt><dd>${inr(g.stretchMonthly)}<small>/mo</small></dd></div>
        <div><dt>Sensible on-road price</dt><dd>up to ${inrShort(g.sensibleOnRoad)}</dd></div>
        <div><dt>Down payment</dt><dd>${inrShort(fin.downPayment)}<small> = 20% of ${inrShort(g.twentyPctCar)}</small></dd></div>
      </dl>
      <p class="fine">Car spend includes EMI, fuel, insurance and servicing: 15% of take-home is comfortable, 25% is a stretch.</p>
      <hr>
      <p class="eyebrow">Cars that pass your filters</p>
      <p class="count-big">${eligible.length}<span> of ${CARS.length}</span></p>
      ${
        top
          ? `<p class="eyebrow">Leading right now</p>
             <div class="aside-top">${plate(top.car, 'md')}<div><b>${esc(top.car.brand)} ${esc(top.car.model)}</b><br><span class="muted">${esc(variantLabel(top))} · ${inr(top.monthly)}/mo</span></div>${scorePill(top.buyable)}</div>`
          : `<p class="callout">No car passes all your filters. Loosen one to see matches.</p>`
      }
    </div>`;
}

export function wizard(root, [n = '1']) {
  const step = Math.min(4, Math.max(1, Number(n) || 1));
  const meta = STEPS[step - 1];
  document.title = `${meta.name} · Your details · CarFit India`;
  const st = getState();

  root.innerHTML = `
  <section class="wrap wizard">
    <nav aria-label="Steps"><ol class="steps">
      ${STEPS.map((s, k) => `<li><a href="#/wizard/${k + 1}" ${k + 1 === step ? 'aria-current="step"' : ''} class="${k + 1 < step ? 'done' : ''}"><span>${k + 1}</span>${s.name}</a></li>`).join('')}
    </ol></nav>
    <div class="wiz-grid">
      <form class="wiz-form card" id="wiz" novalidate>
        <h1>${meta.title}</h1>
        <p class="lede">${meta.lede}</p>
        ${RENDER[step - 1](st.inputs)}
        <div class="wiz-nav">
          ${step > 1 ? `<a class="btn btn-ghost" href="#/wizard/${step - 1}">Back</a>` : '<span></span>'}
          ${step < 4 ? `<a class="btn btn-primary" href="#/wizard/${step + 1}">Next: ${STEPS[step].name}</a>` : `<a class="btn btn-primary btn-big" href="#/results">Show my best car</a>`}
        </div>
      </form>
      <aside class="wiz-aside" id="aside" aria-live="polite"></aside>
    </div>
  </section>`;

  const form = root.querySelector('#wiz');
  const asideEl = root.querySelector('#aside');
  form.addEventListener('submit', (e) => e.preventDefault());
  const unbind = bindInputs(form);

  function refresh() {
    const s = getState();
    const { fin, results } = compute(s);
    syncChoices(form, s.inputs);
    form.querySelectorAll('[data-show-if]').forEach((el) => (el.hidden = !SHOW[el.dataset.showIf](s.inputs)));
    const out = outputs(s.inputs, fin);
    form.querySelectorAll('[data-out]').forEach((el) => (el.textContent = out[el.dataset.out] ?? ''));
    asideEl.innerHTML = aside(s, fin, results);
  }

  refresh();
  const unsub = subscribe(refresh);
  return () => {
    unsub();
    unbind();
  };
}
