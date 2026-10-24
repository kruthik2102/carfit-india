// App state: the buyer's inputs, price settings, compare list and table preferences.
// Saved to localStorage; inputs can also travel in a share link (#/results?s=…).

import { defaultInputs, DEFAULT_SETTINGS } from './scoring.js';
import { GROUP_NAMES } from './features.js';

export const CURRENT_YEAR = new Date().getFullYear();
const KEY = 'carfit-india-v1';

const defaultUi = () => ({
  sort: { key: 'buyable', dir: 'desc' },
  q: '',
  hideOver: true,
  showExcluded: false,
  groups: Object.fromEntries(['Specs', ...GROUP_NAMES].map((g) => [g, true])),
});

function load() {
  const base = { inputs: defaultInputs(CURRENT_YEAR), settings: { ...DEFAULT_SETTINGS }, compare: [], ui: defaultUi() };
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved) {
      base.inputs = { ...base.inputs, ...saved.inputs, weights: { ...base.inputs.weights, ...saved.inputs?.weights } };
      base.settings = { ...base.settings, ...saved.settings };
      base.compare = Array.isArray(saved.compare) ? saved.compare.slice(0, 3) : [];
      base.ui = { ...base.ui, ...saved.ui, groups: { ...base.ui.groups, ...saved.ui?.groups } };
    }
  } catch {
    /* storage blocked or corrupt: start fresh */
  }
  // A purchase year in the past (saved last year) rolls forward to this year.
  if (base.inputs.buyYear < CURRENT_YEAR) base.inputs.buyYear = CURRENT_YEAR;
  return base;
}

let state = load();
const subs = new Set();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* private mode: keep working without persistence */
  }
}

export const getState = () => state;

export function subscribe(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}

function commit(next) {
  state = next;
  save();
  subs.forEach((fn) => fn(state));
}

export const setInputs = (patch) => commit({ ...state, inputs: { ...state.inputs, ...patch } });
export const setSettings = (patch) => commit({ ...state, settings: { ...state.settings, ...patch } });
export const resetSettings = () => commit({ ...state, settings: { ...DEFAULT_SETTINGS } });
export const setUi = (patch) => commit({ ...state, ui: { ...state.ui, ...patch } });
export const resetInputs = () => commit({ ...state, inputs: defaultInputs(CURRENT_YEAR) });

export function toggleCompare(id) {
  const list = state.compare.includes(id) ? state.compare.filter((x) => x !== id) : [...state.compare, id].slice(-3);
  commit({ ...state, compare: list });
}
export const setCompare = (ids) => commit({ ...state, compare: ids.slice(0, 3) });

// Share links carry only the inputs, base64url-encoded.
export function encodeInputs(inputs) {
  const bytes = new TextEncoder().encode(JSON.stringify(inputs));
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function importShared(code) {
  try {
    const bin = atob(code.replace(/-/g, '+').replace(/_/g, '/'));
    const inputs = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
    if (inputs && typeof inputs === 'object') setInputs({ ...defaultInputs(CURRENT_YEAR), ...inputs });
    return true;
  } catch {
    return false;
  }
}

export const shareUrl = () => `${location.origin}${location.pathname}#/results?s=${encodeInputs(state.inputs)}`;
