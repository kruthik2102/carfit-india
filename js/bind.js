// Two-way binding between form controls and state.inputs (or settings).
//   <input data-k="salary">            number / range / select / checkbox → inputs.salary
//   <input data-k="weights.aff">       nested key
//   [data-seg="transmission"] buttons  single choice (data-type="number" | "bool" on the group)
//   [data-chips="fuels"] buttons       multi choice, see LIST_RULES
// Controls never get their value rewritten while you type; only pressed states and outputs refresh.

import { getState, setInputs } from './state.js';
import { toggleInList } from './components.js';

/** How a chip group edits its list. "anyEmpty": an empty list means Any. "anyToken": list holds 'Any'. */
const LIST_RULES = { fuels: 'anyToken', bodyTypes: 'anyEmpty', makes: 'anyEmpty', mustHaves: 'plain' };

function parse(el) {
  if (el.type === 'checkbox') return el.checked;
  if (el.type === 'number' || el.type === 'range' || el.dataset.type === 'number') {
    const n = Number(el.value);
    return Number.isFinite(n) ? n : 0;
  }
  return el.value;
}

function setKey(key, value) {
  const inputs = getState().inputs;
  if (key.includes('.')) {
    const [a, b] = key.split('.');
    setInputs({ [a]: { ...inputs[a], [b]: value } });
  } else setInputs({ [key]: value });
}

export function nextList(name, list, v) {
  const rule = LIST_RULES[name] ?? 'plain';
  if (rule === 'anyToken') {
    if (v === 'Any') return ['Any'];
    const next = toggleInList(list.filter((x) => x !== 'Any'), v);
    return next.length ? next : ['Any'];
  }
  if (rule === 'anyEmpty' && v === 'Any') return [];
  return toggleInList(list, v);
}

export function bindInputs(root, { onKey } = {}) {
  const onInput = (e) => {
    const el = e.target.closest('[data-k]');
    if (!el || !root.contains(el)) return;
    const key = el.dataset.k;
    if (onKey?.(key, parse(el), el)) return;
    setKey(key, parse(el));
  };
  const onClick = (e) => {
    const btn = e.target.closest('button[data-v]');
    if (!btn || !root.contains(btn)) return;
    const seg = btn.closest('[data-seg]');
    const chipGroup = btn.closest('[data-chips]');
    if (seg) {
      const type = seg.dataset.type;
      const raw = btn.dataset.v;
      const v = type === 'number' ? Number(raw) : type === 'bool' ? raw === 'true' : raw;
      if (onKey?.(seg.dataset.seg, v, btn)) return;
      setKey(seg.dataset.seg, v);
    } else if (chipGroup) {
      const name = chipGroup.dataset.chips;
      if (onKey?.(name, btn.dataset.v, btn)) return;
      setInputs({ [name]: nextList(name, getState().inputs[name] ?? [], btn.dataset.v) });
    }
  };
  root.addEventListener('input', onInput);
  root.addEventListener('change', onInput);
  root.addEventListener('click', onClick);
  return () => {
    root.removeEventListener('input', onInput);
    root.removeEventListener('change', onInput);
    root.removeEventListener('click', onClick);
  };
}

/** Refresh pressed/checked states of segmented controls and chips from the inputs. */
export function syncChoices(root, inputs) {
  root.querySelectorAll('[data-seg]').forEach((seg) => {
    const val = seg.dataset.seg.split('.').reduce((o, k) => o?.[k], inputs);
    seg.querySelectorAll('button[data-v]').forEach((b) => b.setAttribute('aria-checked', String(String(val) === b.dataset.v)));
  });
  root.querySelectorAll('[data-chips]').forEach((g) => {
    const name = g.dataset.chips;
    const list = inputs[name];
    if (!Array.isArray(list)) return;
    const rule = LIST_RULES[name] ?? 'plain';
    g.querySelectorAll('button[data-v]').forEach((b) => {
      const v = b.dataset.v;
      const on = rule === 'anyEmpty' && v === 'Any' ? list.length === 0 : list.includes(v);
      b.setAttribute('aria-pressed', String(on));
    });
  });
}

/** Re-render a container and put focus back on the control that had it. */
export function rerender(el, html) {
  const a = document.activeElement;
  let sel = null;
  if (a && el.contains(a)) {
    const group = a.closest('[data-chips],[data-seg],[data-uigroup]');
    if (group && a.dataset.v != null) {
      const attr = group.hasAttribute('data-chips') ? 'data-chips' : group.hasAttribute('data-seg') ? 'data-seg' : 'data-uigroup';
      sel = `[${attr}="${group.getAttribute(attr)}"] [data-v="${CSS.escape(a.dataset.v)}"]`;
    } else if (a.id) sel = `#${CSS.escape(a.id)}`;
    else if (a.dataset.sort) sel = `[data-sort="${CSS.escape(a.dataset.sort)}"]`;
    else if (a.dataset.cmp) sel = `[data-cmp="${CSS.escape(a.dataset.cmp)}"]`;
  }
  el.innerHTML = html;
  if (sel) el.querySelector(sel)?.focus();
}
