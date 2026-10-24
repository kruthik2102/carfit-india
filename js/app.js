// Hash router: #/  #/wizard/1-4  #/results  #/compare  #/method. Share links add ?s=… to #/results.

import { home } from './views/home.js';
import { wizard } from './views/wizard.js';
import { results } from './views/results.js';
import { compare } from './views/compare.js';
import { method } from './views/method.js';
import { closeSheet } from './views/sheet.js';
import { getState, subscribe, importShared } from './state.js';

const ROUTES = { '': home, wizard, results, compare, method };
const main = document.getElementById('main');
let cleanup = null;
let lastPath = null;

function notFound(root) {
  document.title = 'Page not found · CarFit India';
  root.innerHTML = `<section class="wrap"><div class="card empty"><h1>That page does not exist</h1><p><a href="#/">Go to the start</a></p></div></section>`;
}

function route() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, qs] = raw.split('?');
  const parts = path.split('/').filter(Boolean);
  const shared = new URLSearchParams(qs || '').get('s');
  if (shared) {
    importShared(shared);
    history.replaceState(null, '', `#/${parts.join('/')}`);
  }

  closeSheet(false);
  cleanup?.();
  const view = ROUTES[parts[0] ?? ''] ?? notFound;
  cleanup = view(main, parts.slice(1)) || null;

  const section = parts[0] ?? '';
  document.querySelectorAll('[data-nav]').forEach((a) => {
    if (a.dataset.nav === section) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  const pathKey = parts.join('/');
  if (pathKey !== lastPath) {
    window.scrollTo(0, 0);
    if (lastPath !== null) main.focus({ preventScroll: true });
  }
  lastPath = pathKey;
}

function updateCompareBadge() {
  const n = getState().compare.length;
  document.getElementById('nav-compare-count').textContent = n ? String(n) : '';
}

window.addEventListener('hashchange', route);
subscribe(updateCompareBadge);
updateCompareBadge();
route();
