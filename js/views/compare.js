import { CARS } from '../data/cars.js';
import { FEATURE_GROUPS, GROUP_NAMES } from '../features.js';
import { getState, subscribe, toggleCompare } from '../state.js';
import { compute } from '../compute.js';
import { plate, availMark, scorePill, stars, variantLabel } from '../components.js';
import { inr, inrShort, lakhRange, esc } from '../format.js';
import { mileageText } from './results.js';
import { openSheet } from './sheet.js';

let onlyDiff = false;

function rowsFor(picked) {
  const val = (fn) => picked.map(fn);
  const sections = [
    ['Scores and cost', [
      ['Recommended variant', val((r) => variantLabel(r)), val((r) => `<b>${esc(variantLabel(r))}</b>`)],
      ['Buyable score', val((r) => r.buyable), val((r) => scorePill(r.buyable))],
      ['Affordability', val((r) => r.affordability), val((r) => `${scorePill(r.affordability)} <small>${r.affLabel}</small>`)],
      ['Safety score', val((r) => r.safety), val((r) => scorePill(r.safety))],
      ['Feature match', val((r) => r.feature), val((r) => scorePill(r.feature))],
      ['Running-cost score', val((r) => r.runScore), val((r) => scorePill(r.runScore))],
      ['Monthly cost', val((r) => Math.round(r.monthly)), val((r) => inr(r.monthly))],
      ['EMI', val((r) => Math.round(r.emi)), val((r) => inr(r.emi))],
      ['On-road estimate', val((r) => Math.round(r.onRoad)), val((r) => inrShort(r.onRoad))],
      ['Ex-showroom range', val((r) => r.car.priceMin + '-' + r.car.priceMax), val((r) => lakhRange(r.car.priceMin, r.car.priceMax))],
      ['Cost per km', val((r) => r.perKm.toFixed(2)), val((r) => `₹${r.perKm.toFixed(2)} <small>${r.fuelUsed}</small>`)],
    ]],
    ['Specs', [
      ['Body', val((r) => r.car.body), val((r) => esc(r.car.body))],
      ['Fuel', val((r) => r.car.fuels.join()), val((r) => r.car.fuels.join(', '))],
      ['Gearbox', val((r) => r.car.trans.join()), val((r) => r.car.trans.join(' / '))],
      ['Claimed mileage', val((r) => mileageText(r.car)), val((r) => mileageText(r.car))],
      ['Seats', val((r) => r.car.seats.join()), val((r) => r.car.seats.join(' / '))],
      ['Crash test', val((r) => r.car.ncap?.stars ?? 'none'), val((r) => (r.car.ncap ? `${stars(r.car.ncap.stars)} <small>${r.car.ncap.agency} ${r.car.ncap.year}</small>` : stars(null)))],
      ['Airbags', val((r) => r.car.airbags), val((r) => `up to ${r.car.airbags}`)],
      ['Launched / updated', val((r) => `${r.car.launch}/${r.car.updated}`), val((r) => `${r.car.launch} / ${r.car.updated}`)],
    ]],
    ...GROUP_NAMES.map((g) => [g, FEATURE_GROUPS[g].map(([k, l]) => [l, val((r) => r.car.features[k]), val((r) => availMark(r.car.features[k]))])]),
  ];
  return sections;
}

function html(st) {
  const { results } = compute(st);
  const picked = st.compare.map((id) => results.find((r) => r.car.id === id)).filter(Boolean);
  const addable = CARS.filter((c) => !st.compare.includes(c.id));
  const adder =
    picked.length < 3
      ? `<label class="field adder"><span class="label">Add a car</span>
          <select id="add"><option value="">Choose a car…</option>${addable.map((c) => `<option value="${c.id}">${esc(c.brand)} ${esc(c.model)}</option>`).join('')}</select></label>`
      : '';

  if (!picked.length) {
    return `<div class="card empty"><h2>Pick up to three cars</h2><p>Tick cars in the <a href="#/results">results table</a>, or add one here.</p>${adder}</div>`;
  }

  const sections = rowsFor(picked);
  const body = sections
    .map(([name, rows]) => {
      const shown = rows.filter(([, raw]) => !onlyDiff || new Set(raw.map(String)).size > 1);
      if (!shown.length) return '';
      return `<tbody><tr class="cmp-sec"><th scope="colgroup" colspan="${picked.length + 1}">${name}</th></tr>
        ${shown.map(([label, raw, cells]) => `<tr class="${new Set(raw.map(String)).size > 1 ? 'diff' : ''}"><th scope="row">${label}</th>${cells.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}
      </tbody>`;
    })
    .join('');

  return `
    <div class="cmp-tools">
      <label class="switch"><input type="checkbox" id="onlyDiff" ${onlyDiff ? 'checked' : ''}><span>Show only differences</span></label>
      ${adder}
    </div>
    <div class="tbl-wrap cmp-wrap">
      <table class="cmp">
        <thead><tr><td></td>${picked
          .map(
            (r) => `<th scope="col"><div class="cmp-car">${plate(r.car, 'md')}<b>${esc(r.car.brand)} ${esc(r.car.model)}</b>
              <span class="cmp-actions"><button type="button" class="link" data-open="${r.car.id}">Details</button><button type="button" class="link" data-remove="${r.car.id}">Remove</button></span></div></th>`,
          )
          .join('')}</tr></thead>
        ${body}
      </table>
    </div>
    <p class="fine">Highlighted rows differ between the cars.</p>`;
}

export function compare(root) {
  document.title = 'Compare · CarFit India';
  root.innerHTML = `<section class="wrap compare"><p class="eyebrow">Compare</p><h1>Side by side</h1><div id="cmp-body"></div></section>`;
  const el = root.querySelector('#cmp-body');
  const draw = () => (el.innerHTML = html(getState()));
  const onClick = (e) => {
    const rm = e.target.closest('[data-remove]');
    if (rm) toggleCompare(rm.dataset.remove);
    const open = e.target.closest('[data-open]');
    if (open) openSheet(open.dataset.open, open);
  };
  const onChange = (e) => {
    if (e.target.id === 'onlyDiff') ((onlyDiff = e.target.checked), draw());
    if (e.target.id === 'add' && e.target.value) toggleCompare(e.target.value);
  };
  el.addEventListener('click', onClick);
  el.addEventListener('change', onChange);
  draw();
  const unsub = subscribe(draw);
  return () => {
    unsub();
    el.removeEventListener('click', onClick);
    el.removeEventListener('change', onChange);
  };
}
