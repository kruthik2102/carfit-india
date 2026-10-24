// Small HTML builders shared by the views.

import { esc } from './format.js';
import { AVAIL_TEXT } from './features.js';

/** The car's nameplate: an Indian high-security registration plate with the model name. */
export function plate(car, size = 'md') {
  return `<span class="plate plate-${size}" aria-hidden="true"><span class="plate-ind"><i></i>IND</span><span class="plate-txt">${esc(car.model)}</span></span>`;
}

/** Score out of 100 drawn as a ten-segment gauge. */
export function gauge(score, label, sub = '') {
  const on = Math.round(score / 10);
  const segs = Array.from({ length: 10 }, (_, i) => `<i class="${i < on ? 'on' : ''}"></i>`).join('');
  return `<div class="gauge ${tone(score)}" role="img" aria-label="${esc(label)} ${score} out of 100${sub ? ', ' + esc(sub) : ''}">
    <div class="gauge-top"><span class="gauge-num">${score}</span><span class="gauge-lbl">${esc(label)}</span></div>
    <div class="gauge-bar">${segs}</div>
    ${sub ? `<div class="gauge-sub">${esc(sub)}</div>` : ''}
  </div>`;
}

export const tone = (score) => (score >= 80 ? 't-good' : score >= 60 ? 't-ok' : score >= 40 ? 't-warn' : 't-bad');

export function scorePill(score, extra = '') {
  return `<span class="pill ${tone(score)}">${score}${extra ? ` <small>${esc(extra)}</small>` : ''}</span>`;
}

const GLYPH = { std: '✓', higher: '◐', no: '✗' };

/** ✓ / ◐ / ✗ with its meaning for screen readers and on hover. */
export function availMark(v) {
  return `<span class="mark mark-${v}" title="${AVAIL_TEXT[v]}"><span aria-hidden="true">${GLYPH[v]}</span><span class="sr">${AVAIL_TEXT[v]}</span></span>`;
}

export function legend() {
  return `<div class="legend" aria-label="Legend">
    <span>${availMark('std')} Standard</span><span>${availMark('higher')} Higher variants only</span><span>${availMark('no')} Not offered</span>
  </div>`;
}

export function stars(n) {
  if (n == null) return '<span class="muted">Not tested</span>';
  return `<span class="stars" aria-label="${n} stars">${'★'.repeat(n)}<span class="stars-off">${'★'.repeat(5 - n)}</span></span>`;
}

/** Chip group. `items` = [value, label]; `selected` = array of values. */
export function chips(name, items, selected, { multi = true } = {}) {
  return `<div class="chips" role="group" data-chips="${name}" data-multi="${multi ? 1 : 0}">
    ${items
      .map(([v, l]) => `<button type="button" class="chip" data-v="${esc(v)}" aria-pressed="${selected.includes(v)}">${esc(l)}</button>`)
      .join('')}
  </div>`;
}

/** Segmented control for single choices. `type` ("number" | "bool") says how to read the value back. */
export function segmented(name, items, value, { type = '' } = {}) {
  return `<div class="seg" role="radiogroup" data-seg="${name}"${type ? ` data-type="${type}"` : ''}>
    ${items
      .map(
        ([v, l]) =>
          `<button type="button" role="radio" class="seg-btn" data-v="${esc(v)}" aria-checked="${String(v) === String(value)}">${esc(l)}</button>`,
      )
      .join('')}
  </div>`;
}

/** "HX 8 · petrol automatic" for cars with trim data, "Upper variant (estimate)" otherwise. */
export function variantLabel(r) {
  if (!r.variant) return `${r.tier} variant (estimate)`;
  const fuel = r.variant.fuel === 'CNG' ? 'CNG' : r.variant.fuel.toLowerCase();
  const name = r.variant.name === 'Single version' ? r.car.model : r.variant.name;
  return `${name} · ${fuel} ${r.variant.trans.toLowerCase()}`;
}

/** Toggle for multi-select chips where "Any" (empty list) clears the others. */
export function toggleInList(list, v) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}
