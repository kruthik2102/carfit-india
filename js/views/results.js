import { CARS, BRANDS, BODY_TYPES, DATA_LAST_REVIEWED } from '../data/cars.js';
import { ALL_FEATURES, GROUP_NAMES, FEATURE_LABEL, AVAIL_TEXT } from '../features.js';
import { FUELS, whyBullets, claimedEff } from '../scoring.js';
import { getState, setUi, subscribe, toggleCompare, shareUrl, CURRENT_YEAR } from '../state.js';
import { compute, podium } from '../compute.js';
import { bindInputs, rerender } from '../bind.js';
import { plate, gauge, scorePill, availMark, legend, stars, chips, segmented, variantLabel } from '../components.js';
import { inr, inrShort, lakhRange, pct, esc } from '../format.js';
import { openSheet } from './sheet.js';

const UNIT = { Petrol: 'kmpl', Diesel: 'kmpl', CNG: 'km/kg', 'Strong hybrid': 'kmpl' };

export function mileageText(car) {
  return car.fuels
    .map((f) => (f === 'Electric' ? `${car.ev.range} km range` : `${f === 'Strong hybrid' ? 'Hybrid' : f} ${+claimedEff(car, f).toFixed(1)} ${UNIT[f]}`))
    .join(' · ');
}

const AVAIL_RANK = { std: 2, higher: 1, no: 0 };

// Table columns after the sticky Car column. `dir` is the first sort direction when clicked.
const COLS = [
  { key: 'buyable', label: 'Buyable', group: 'Scores', num: 1, dir: 'desc', val: (r) => r.buyable, cell: (r) => scorePill(r.buyable) },
  {
    key: 'affordability', label: 'Afford&shy;ability', group: 'Scores', num: 1, dir: 'desc', val: (r) => r.affordability,
    cell: (r) => `${scorePill(r.affordability)}<small class="cell-sub">${r.affLabel}</small>`,
  },
  { key: 'monthly', label: 'Monthly cost', group: 'Scores', num: 1, dir: 'asc', val: (r) => r.monthly, cell: (r) => `${inr(r.monthly)}<small class="cell-sub">${pct(r.r)} of pay</small>` },
  { key: 'emi', label: 'EMI', group: 'Scores', num: 1, dir: 'asc', val: (r) => r.emi, cell: (r) => inr(r.emi) },
  { key: 'onRoad', label: 'On-road (est.)', group: 'Scores', num: 1, dir: 'asc', val: (r) => r.onRoad, cell: (r) => `${inrShort(r.onRoad)}<small class="cell-sub">${r.tier}</small>` },
  { key: 'price', label: 'Ex-showroom', group: 'Scores', num: 1, dir: 'asc', val: (r) => r.car.priceMin, cell: (r) => lakhRange(r.car.priceMin, r.car.priceMax) },
  { key: 'body', label: 'Body', group: 'Specs', dir: 'asc', val: (r) => r.car.body, cell: (r) => esc(r.car.body) },
  { key: 'fuel', label: 'Fuel', group: 'Specs', dir: 'asc', val: (r) => r.car.fuels.join(), cell: (r) => r.car.fuels.map((f) => `<span class="tag tag-fuel">${f === 'Strong hybrid' ? 'Hybrid' : f}</span>`).join(' ') },
  { key: 'trans', label: 'Gearbox', group: 'Specs', dir: 'asc', val: (r) => r.car.trans.join(), cell: (r) => r.car.trans.map((t) => (t === 'Manual' ? 'MT' : 'AT')).join(' / ') },
  { key: 'mileage', label: 'Claimed mileage', group: 'Specs', num: 1, dir: 'asc', val: (r) => r.perKm, cell: (r) => `<span class="cell-wrap">${mileageText(r.car)}</span>` },
  { key: 'perKm', label: 'Cost per km', group: 'Specs', num: 1, dir: 'asc', val: (r) => r.perKm, cell: (r) => `₹${r.perKm.toFixed(2)}<small class="cell-sub">${r.fuelUsed === 'Strong hybrid' ? 'Hybrid' : r.fuelUsed}</small>` },
  { key: 'seats', label: 'Seats', group: 'Specs', num: 1, dir: 'desc', val: (r) => Math.max(...r.car.seats), cell: (r) => r.car.seats.join(' / ') },
  { key: 'ncap', label: 'Crash test', group: 'Specs', dir: 'desc', val: (r) => r.car.ncap?.stars ?? -1, cell: (r) => (r.car.ncap ? `${stars(r.car.ncap.stars)}<small class="cell-sub">${r.car.ncap.agency.replace(' NCAP', '')} ${r.car.ncap.year}</small>` : stars(null)) },
  { key: 'airbags', label: 'Airbags', group: 'Specs', num: 1, dir: 'desc', val: (r) => r.car.airbags, cell: (r) => `up to ${r.car.airbags}` },
  { key: 'updated', label: 'Updated', group: 'Specs', num: 1, dir: 'desc', val: (r) => r.car.updated, cell: (r) => r.car.updated },
  ...ALL_FEATURES.map((f) => ({
    key: f.key, label: f.short, group: f.group, feat: 1, dir: 'desc', val: (r) => AVAIL_RANK[r.car.features[f.key]],
    cell: (r) => availMark(r.car.features[f.key]),
  })),
];

function visibleRows(results, ui) {
  const q = ui.q.trim().toLowerCase();
  let rows = results.filter((r) => (ui.showExcluded || !r.excluded) && (!ui.hideOver || !r.overBudget || r.excluded));
  if (q) rows = rows.filter((r) => `${r.car.brand} ${r.car.model} ${r.car.body}`.toLowerCase().includes(q));
  const col = COLS.find((c) => c.key === ui.sort.key) ?? COLS[0];
  const sign = ui.sort.dir === 'asc' ? 1 : -1;
  return rows.slice().sort((a, b) => {
    if (!!a.excluded !== !!b.excluded) return a.excluded ? 1 : -1;
    const va = col.val(a);
    const vb = col.val(b);
    const c = typeof va === 'string' ? va.localeCompare(vb) : va - vb;
    return c * sign || b.buyable - a.buyable;
  });
}

function heroHtml(st, fin, results) {
  const { picks, eligible, affordable } = podium(results, 5);
  if (!eligible.length) {
    const reasons = {};
    results.forEach((r) => (reasons[r.excluded] = (reasons[r.excluded] ?? 0) + 1));
    const top = Object.entries(reasons).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, n]) => `${k} (${n} cars)`).join(', ');
    return `<div class="card empty"><h2>No car passes all your filters</h2><p>The filters removing the most cars: ${esc(top)}. Loosen one of them below, or <a href="#/wizard/3">change your car preferences</a>.</p></div>`;
  }
  const [best, ...runners] = picks;
  const share = (x) => (best.monthly > 0 ? (x / best.monthly) * 100 : 0);
  const why = whyBullets(best);
  const inCompare = st.compare.includes(best.car.id);
  return `
    ${affordable.length ? '' : `<p class="callout warn">None of the cars that fit your filters is comfortably affordable on ${inr(fin.salary)} a month. These are the closest — see how a larger down payment, longer saving period or lower budget changes things in <a href="#/wizard/1">Money</a>.</p>`}
    <article class="best card">
      <div class="best-id">
        <p class="eyebrow">Best match for you</p>
        ${plate(best.car, 'lg')}
        <h2>${esc(best.car.brand)} ${esc(best.car.model)}</h2>
        <p class="variant-line">${best.variant ? 'Buy the' : 'Price based on'} <b>${esc(variantLabel(best))}</b> · ${inrShort(best.exShowroom)} ex-showroom</p>
        <ul class="why">${why.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>
        ${best.missing.length ? `<p class="missing">Missing your must-haves: ${best.missing.map((k) => esc(FEATURE_LABEL[k])).join(', ')}</p>` : ''}
        ${best.publicChargingWarning ? `<p class="missing">Running cost assumes public fast charging.</p>` : ''}
        <div class="actions">
          <button class="btn btn-primary" data-open="${best.car.id}">See the full breakdown</button>
          <button class="btn btn-ghost" data-cmp-btn="${best.car.id}">${inCompare ? 'Remove from compare' : 'Add to compare'}</button>
        </div>
      </div>
      <div class="best-nums">
        <div class="gauges">${gauge(best.buyable, 'Buyable')}${gauge(best.affordability, 'Affordability', best.affLabel)}</div>
        <dl class="kv">
          <div><dt>On-road price</dt><dd>${inrShort(best.onRoad)}</dd></div>
          <div><dt>Loan</dt><dd>${inrShort(best.loan)}<small> after ${inrShort(fin.downPayment)} down</small></dd></div>
          <div><dt>EMI</dt><dd>${inr(best.emi)}<small>/mo · ${st.inputs.tenure} yrs @ ${st.inputs.rate}%</small></dd></div>
          <div class="kv-total"><dt>Total monthly cost</dt><dd>${inr(best.monthly)}<small> · ${pct(best.r)} of take-home</small></dd></div>
        </dl>
        <div class="costbar" role="img" aria-label="Monthly cost split: EMI ${inr(best.emi)}, fuel ${inr(best.running)}, insurance ${inr(best.insurance)}, servicing ${inr(best.maintenance)}">
          <span class="cb-emi" style="width:${share(best.emi)}%"></span><span class="cb-fuel" style="width:${share(best.running)}%"></span><span class="cb-ins" style="width:${share(best.insurance)}%"></span><span class="cb-mnt" style="width:${share(best.maintenance)}%"></span>
        </div>
        <ul class="costkey">
          <li><i class="cb-emi"></i>EMI ${inr(best.emi)}</li><li><i class="cb-fuel"></i>${best.fuelUsed === 'Electric' ? 'Charging' : 'Fuel'} ${inr(best.running)}</li>
          <li><i class="cb-ins"></i>Insurance ${inr(best.insurance)}</li><li><i class="cb-mnt"></i>Servicing ${inr(best.maintenance)}</li>
        </ul>
      </div>
    </article>
    ${
      runners.length
        ? `<h2 class="sec-h">Also worth a look</h2>
      <ol class="runners" start="2">
        ${runners
          .map(
            (r) => `<li class="card runner">
              <button class="runner-btn" data-open="${r.car.id}">
                ${plate(r.car, 'md')}
                <span class="runner-name">${esc(r.car.brand)} <b>${esc(r.car.model)}</b></span>
                <span class="runner-nums">${scorePill(r.buyable, 'buyable')}<span>${inr(r.monthly)}/mo</span><span class="muted">${r.affLabel}</span></span>
              </button>
            </li>`,
          )
          .join('')}
      </ol>`
        : ''
    }`;
}

function filtersHtml(st) {
  const i = st.inputs;
  const ui = st.ui;
  return `
    <div class="filter-grid">
      <div class="field"><span class="label">Body type</span>${chips('bodyTypes', [['Any', 'Any'], ...BODY_TYPES.map((b) => [b, b])], i.bodyTypes)}</div>
      <div class="field"><span class="label">Fuel</span>${chips('fuels', [['Any', 'Any'], ...FUELS.map((f) => [f, f])], i.fuels)}</div>
      <div class="field"><span class="label">Gearbox</span>${segmented('transmission', [['Any', 'Any'], ['Manual', 'Manual'], ['Automatic', 'Automatic']], i.transmission)}</div>
      <div class="field"><span class="label">Seats</span>${segmented('seats', [[4, '4+'], [5, '5+'], [6, '6+'], [7, '7+']], i.seats, { type: 'number' })}</div>
      <div class="field"><span class="label">Crash test</span>${segmented('minNcap', [[0, 'Any'], [3, '3★ +'], [4, '4★ +'], [5, '5★']], i.minNcap, { type: 'number' })}</div>
      <div class="field"><span class="label">Brands</span>${chips('makes', [['Any', 'All'], ...BRANDS.map((b) => [b, b])], i.makes)}</div>
      <div class="field"><span class="label">Columns</span>
        <div class="chips" role="group" data-uigroup="groups">${['Specs', ...GROUP_NAMES].map((g) => `<button type="button" class="chip" data-v="${g}" aria-pressed="${ui.groups[g]}">${g}</button>`).join('')}</div>
      </div>
    </div>`;
}

function tableHtml(st, results) {
  const ui = st.ui;
  const cols = COLS.filter((c) => c.group === 'Scores' || ui.groups[c.group]);
  const rows = visibleRows(results, ui);
  const groups = [];
  for (const c of cols) {
    const last = groups[groups.length - 1];
    if (last && last.name === c.group) last.span++;
    else groups.push({ name: c.group, span: 1 });
  }
  const sortBtn = (c) => {
    const active = ui.sort.key === c.key;
    const aria = active ? (ui.sort.dir === 'asc' ? 'ascending' : 'descending') : 'none';
    return `<th scope="col" class="${c.feat ? 'th-feat' : c.num ? 'th-num' : ''} g-${c.group}" aria-sort="${aria}">
      <button type="button" class="sort" data-sort="${c.key}" title="${c.feat ? esc(FEATURE_LABEL[c.key]) + ' — sort' : 'Sort'}"><span>${c.label}</span>${active ? `<i aria-hidden="true">${ui.sort.dir === 'asc' ? '▲' : '▼'}</i>` : ''}</button></th>`;
  };
  if (!rows.length) {
    return `<p class="card empty">No cars to show. ${ui.q ? `Nothing matches “${esc(ui.q)}”.` : 'Turn off "Hide cars over my budget" or loosen a filter.'}</p>`;
  }
  return `
  <table class="cars">
    <thead>
      <tr class="tr-groups"><th class="col-car" rowspan="2" scope="col">Car</th>${groups.map((g) => `<th colspan="${g.span}" class="g-${g.name}" scope="colgroup">${g.name === 'Scores' ? 'Scores and cost' : g.name}</th>`).join('')}</tr>
      <tr class="tr-cols">${cols.map(sortBtn).join('')}</tr>
    </thead>
    <tbody>
      ${rows
        .map((r) => {
          const c = r.car;
          const tags = [
            r.excluded ? `<span class="tag tag-ex">Excluded: ${esc(r.excluded)}</span>` : '',
            !r.excluded && r.overBudget ? `<span class="tag tag-over">${r.overCap ? 'Over your cap' : 'Over budget'}</span>` : '',
            r.missing.length ? `<span class="tag tag-miss" title="${esc(r.missing.map((k) => FEATURE_LABEL[k]).join(', '))}">Missing ${r.missing.length}</span>` : '',
          ].join('');
          return `<tr class="${r.excluded ? 'is-ex' : ''}">
            <th scope="row" class="col-car">
              <div class="carcell">
                <input type="checkbox" data-cmp="${c.id}" ${st.compare.includes(c.id) ? 'checked' : ''} aria-label="Compare ${esc(c.brand)} ${esc(c.model)}">
                <button type="button" class="rowlink" data-open="${c.id}">${plate(c, 'sm')}<span class="carname"><small>${esc(c.brand)}</small>${esc(c.model)}</span></button>
              </div>
              ${tags ? `<div class="tags">${tags}</div>` : ''}
            </th>
            ${cols.map((col) => `<td class="${col.feat ? 'td-feat' : col.num ? 'num' : ''} g-${col.group}">${col.cell(r)}</td>`).join('')}
          </tr>`;
        })
        .join('')}
    </tbody>
  </table>`;
}

function csv(st, results) {
  const rows = visibleRows(results, st.ui);
  const head = ['Brand', 'Model', 'Body', 'Ex-showroom min (₹ L)', 'Ex-showroom max (₹ L)', 'Variant priced', 'On-road est. (₹)', 'EMI (₹/mo)',
    'Monthly cost (₹)', 'Affordability', 'Affordability label', 'Safety', 'Feature match', 'Running cost score', 'Buyable', 'Excluded by',
    'Fuels', 'Gearbox', 'Claimed mileage', 'Seats', 'Crash test', 'Airbags', 'Launched', 'Updated', ...ALL_FEATURES.map((f) => f.label)];
  const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = rows.map((r) => {
    const c = r.car;
    return [c.brand, c.model, c.body, c.priceMin, c.priceMax, variantLabel(r), Math.round(r.onRoad), Math.round(r.emi), Math.round(r.monthly), r.affordability,
      r.affLabel, r.safety, r.feature, r.runScore, r.buyable, r.excluded ?? '', c.fuels.join(' / '), c.trans.join(' / '), mileageText(c),
      c.seats.join(' / '), c.ncap ? `${c.ncap.stars} star ${c.ncap.agency} ${c.ncap.year}` : 'Not tested', c.airbags, c.launch, c.updated,
      ...ALL_FEATURES.map((f) => AVAIL_TEXT[c.features[f.key]])].map(q).join(',');
  });
  const blob = new Blob(['﻿' + [head.map(q).join(','), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `carfit-india-${CURRENT_YEAR}.csv` });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function results(root) {
  document.title = 'Results · CarFit India';
  const st0 = getState();
  root.innerHTML = `
  <section class="wrap results">
    <header class="res-head">
      <div>
        <p class="eyebrow">Results</p>
        <h1>Your best car, and every other car scored</h1>
        <p class="muted" id="res-summary"></p>
      </div>
      <div class="actions">
        <a class="btn btn-ghost" href="#/wizard/1">Edit your details</a>
        <button type="button" class="btn btn-ghost" id="share">Copy share link</button>
      </div>
    </header>
    <div id="res-top"></div>
    <section class="tablesec" aria-labelledby="tbl-h">
      <div class="tbl-head">
        <h2 id="tbl-h">All cars, feature by feature</h2>
        <p class="muted" id="tbl-count"></p>
      </div>
      <div class="toolbar">
        <input type="search" id="q" placeholder="Search a car, brand or body type" value="${esc(st0.ui.q)}" aria-label="Search cars">
        <label class="switch"><input type="checkbox" id="hideOver" ${st0.ui.hideOver ? 'checked' : ''}><span>Hide cars over my budget</span></label>
        <label class="switch"><input type="checkbox" id="showEx" ${st0.ui.showExcluded ? 'checked' : ''}><span>Show cars my filters exclude</span></label>
        <span class="toolbar-end">
          <button type="button" class="btn btn-ghost btn-sm" id="csv">Export CSV</button>
          <a class="btn btn-primary btn-sm" id="cmp" href="#/compare"></a>
        </span>
      </div>
      <details class="filters"><summary>Filters and columns</summary><div id="filters"></div></details>
      <div class="tbl-meta">${legend()}<p class="fine">Data reviewed ${DATA_LAST_REVIEWED}. Prices and features are estimates — check with the maker or a dealer.</p></div>
      <div class="tbl-wrap" id="tbl" tabindex="0" aria-label="Comparison table, scrolls sideways"></div>
    </section>
  </section>`;

  const $ = (s) => root.querySelector(s);
  const top = $('#res-top');
  const filters = $('#filters');
  const tbl = $('#tbl');

  const unbind = bindInputs(filters);

  const onClick = (e) => {
    const open = e.target.closest('[data-open]');
    if (open) return openSheet(open.dataset.open, open);
    const sort = e.target.closest('[data-sort]');
    if (sort) {
      const col = COLS.find((c) => c.key === sort.dataset.sort);
      const cur = getState().ui.sort;
      const dir = cur.key === col.key ? (cur.dir === 'asc' ? 'desc' : 'asc') : col.dir;
      return setUi({ sort: { key: col.key, dir } });
    }
    const cmpBtn = e.target.closest('[data-cmp-btn]');
    if (cmpBtn) return toggleCompare(cmpBtn.dataset.cmpBtn);
    const colChip = e.target.closest('[data-uigroup] button[data-v]');
    if (colChip) {
      const groups = getState().ui.groups;
      setUi({ groups: { ...groups, [colChip.dataset.v]: !groups[colChip.dataset.v] } });
    }
  };
  const onChange = (e) => {
    const t = e.target;
    if (t.dataset.cmp) toggleCompare(t.dataset.cmp);
    else if (t.id === 'hideOver') setUi({ hideOver: t.checked });
    else if (t.id === 'showEx') setUi({ showExcluded: t.checked });
  };
  const onSearch = (e) => {
    if (e.target.id === 'q') setUi({ q: e.target.value });
  };
  root.addEventListener('click', onClick);
  root.addEventListener('change', onChange);
  root.addEventListener('input', onSearch);

  $('#csv').addEventListener('click', () => csv(getState(), compute().results));
  $('#share').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    try {
      await navigator.clipboard.writeText(shareUrl());
      btn.textContent = 'Link copied';
    } catch {
      prompt('Copy this link', shareUrl());
    }
    setTimeout(() => (btn.textContent = 'Copy share link'), 2000);
  });

  function refresh() {
    const st = getState();
    const { fin, results } = compute(st);
    const i = st.inputs;
    $('#res-summary').textContent =
      `${inr(fin.salary)} take-home a month${fin.yearsAhead ? ` by ${i.buyYear}` : ''} · ${i.kmPerMonth.toLocaleString('en-IN')} km a month · ` +
      `${inr(fin.downPayment)} down · ${i.tenure}-year loan at ${i.rate}%${i.mustHaves.length ? ` · ${i.mustHaves.length} must-haves` : ''}`;
    rerender(top, heroHtml(st, fin, results));
    rerender(filters, filtersHtml(st));
    const scrollLeft = tbl.scrollLeft;
    rerender(tbl, tableHtml(st, results));
    tbl.scrollLeft = scrollLeft;
    const shown = visibleRows(results, st.ui).length;
    const excluded = results.filter((r) => r.excluded).length;
    $('#tbl-count').textContent = `Showing ${shown} of ${CARS.length} cars${excluded ? ` · ${excluded} excluded by your filters` : ''}`;
    $('#cmp').textContent = st.compare.length ? `Compare ${st.compare.length} of 3` : 'Compare (tick up to 3)';
    $('#hideOver').checked = st.ui.hideOver;
    $('#showEx').checked = st.ui.showExcluded;
  }

  refresh();
  const unsub = subscribe(refresh);
  return () => {
    unsub();
    unbind();
    root.removeEventListener('click', onClick);
    root.removeEventListener('change', onChange);
    root.removeEventListener('input', onSearch);
  };
}

