// Indian number formatting: ₹12,34,567 for exact amounts, ₹8.45 L / ₹1.2 Cr for prices.

export const inr = (n) => (Number.isFinite(n) ? '₹' + Math.round(n).toLocaleString('en-IN') : '—');

const trim = (x) => String(+x.toFixed(2));

export function inrShort(rupees) {
  if (!Number.isFinite(rupees)) return '—';
  if (rupees >= 1e7) return `₹${trim(rupees / 1e7)} Cr`;
  if (rupees >= 1e5) return `₹${trim(rupees / 1e5)} L`;
  return inr(rupees);
}

/** Ex-showroom range from lakh figures: "₹5.99–9.1 L", or "₹1.3 Cr" for a single price. */
export function lakhRange(min, max) {
  if (max >= 100) return min === max ? inrShort(min * 1e5) : `${inrShort(min * 1e5)} – ${inrShort(max * 1e5)}`;
  return min === max ? `₹${trim(min)} L` : `₹${trim(min)}–${trim(max)} L`;
}

/** Fuel name for use mid-sentence: "petrol", "CNG", "strong hybrid". */
export const fuelWord = (f) => (f === 'CNG' ? 'CNG' : f.toLowerCase());

export const pct = (x) => (Number.isFinite(x) ? `${Math.round(x * 100)}%` : '—');

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
