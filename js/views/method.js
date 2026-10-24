import { CARS, DATA_LAST_REVIEWED } from '../data/cars.js';
import { REAL_WORLD, DEFAULT_SETTINGS } from '../scoring.js';
import { ALL_FEATURES } from '../features.js';
import { getState, setSettings, resetSettings } from '../state.js';

const SETTINGS = [
  ['petrol', 'Petrol', '₹ per litre', 1],
  ['diesel', 'Diesel', '₹ per litre', 1],
  ['cng', 'CNG', '₹ per kg', 1],
  ['homeKwh', 'Home electricity', '₹ per unit', 0.5],
  ['publicKwh', 'Public fast charging', '₹ per unit', 0.5],
  ['onRoadMult', 'On-road multiplier (petrol, diesel, CNG, hybrid)', '× ex-showroom', 0.01],
  ['evOnRoadMult', 'On-road multiplier (EVs)', '× ex-showroom', 0.01],
];

export function method(root) {
  document.title = 'How scores work · CarFit India';
  const s = getState().settings;
  root.innerHTML = `
  <section class="wrap method">
    <p class="eyebrow">How scores work</p>
    <h1>Every number, and where it comes from</h1>
    <p class="lede">All scores run from 0 to 100. Nothing is sponsored, and the maths runs in your browser.</p>

    <div class="method-grid">
      <div class="prose">
        <h2>What each car costs you</h2>
        <p><b>Which variant.</b> Every car has its real trim list: each trim's price for every fuel and gearbox, and what it adds over the trim below. We cost every version that matches your fuel and gearbox, then recommend the one with the most of your must-haves, and among those the lowest monthly cost. That version's actual price is used everywhere below. Open a car to see the whole ladder and what stepping up or down changes. Colour and special editions are left out.</p>
        <p><b>On-road price</b> = ex-showroom × ${DEFAULT_SETTINGS.onRoadMult} for road tax, registration and insurance (× ${DEFAULT_SETTINGS.evOnRoadMult} for EVs, which most states exempt from road tax). Change both under Prices used.</p>
        <p><b>EMI</b> is the standard reducing-balance formula on on-road price minus your down payment.</p>
        <p><b>Monthly cost</b> = EMI + fuel or charging + insurance (3% of on-road a year) + servicing (₹1,000 a month under ₹10 L, ₹1,500 up to ₹20 L, ₹2,500 up to ₹35 L, ₹4,000 above; EVs 40% less).</p>
        <p><b>Fuel or charging</b> = your kilometres ÷ real-world mileage × the price below. If a car comes in several fuels, we use the one you picked, or else the cheapest to run.</p>

        <h2>Real-world mileage</h2>
        <p>Claimed ARAI and MIDC figures are measured in a lab. We expect this share of the claim, blended by your city/highway mix:</p>
        <table class="mini">
          <thead><tr><th scope="col">Fuel</th><th scope="col">City</th><th scope="col">Highway</th></tr></thead>
          <tbody>${Object.entries(REAL_WORLD).map(([f, [c, h]]) => `<tr><td>${f}</td><td>${Math.round(c * 100)}%</td><td>${Math.round(h * 100)}%</td></tr>`).join('')}</tbody>
        </table>

        <h2>Affordability score</h2>
        <p>Income here is take-home pay (projected to the year you buy) minus EMIs you already pay.</p>
        <ul>
          <li><b>Monthly burden (50%)</b> — monthly cost ÷ income. Up to 15% scores 100, 25% scores 60, 40% scores 10, beyond that 0.</li>
          <li><b>Price against a year's pay (30%)</b> — on-road ÷ 12 months of take-home. Half a year's pay or less scores 100, one year scores 20, 1.5 years scores 0.</li>
          <li><b>Down payment (20%)</b> — 20% of on-road or more scores 100; nothing down scores 30.</li>
        </ul>
        <p>Labels: 80+ Comfortable, 60–79 Manageable, 40–59 Stretch, under 40 Not advisable. Cars under 40, or above your on-road cap, count as over budget.</p>

        <h2>Safety score</h2>
        <p>Adult crash-test stars × 14 (Bharat NCAP or Global NCAP; never tested = 35), plus 10 for six airbags as standard (5 if only on higher variants), 6 for standard ESC and 4 for ADAS (2 on higher variants). Capped at 100. Older Global NCAP results were for older versions of some cars; the car's notes say so.</p>

        <h2>Feature match</h2>
        <p>With must-haves: standard on every variant = full marks, higher variants only = 70%, not offered = 0, averaged over your must-haves. Without must-haves: the share of all ${ALL_FEATURES.length} features offered, with higher-variant features counting half.</p>

        <h2>Running-cost score</h2>
        <p>₹2 a km or less scores 100, falling to 20 at ₹8 a km; above that 10. If you drive more than 1,500 km a month, diesel, CNG, strong hybrids and home-charged EVs get 10 extra points.</p>

        <h2>Buyable score</h2>
        <p>A weighted average of the four scores above, using the priorities you set (35 / 25 / 25 / 15 by default). Cars your filters exclude are not ranked. The best match is the highest Buyable score among cars that are not over budget.</p>

        <h2>About the data</h2>
        <p>${CARS.length} cars, last checked ${DATA_LAST_REVIEWED}. Prices are Delhi ex-showroom ranges as listed by CarDekho; crash ratings come from Bharat NCAP and Global NCAP results. Features are marked per model from each car's variant list: a feature counts as standard only if the cheapest variant has it.</p>
        <p>Where a maker has not published a claimed mileage, the car's notes say the figure is an estimate. Crash ratings for facelifted cars sometimes come from the earlier version; the notes flag those too. Prices and equipment change often. <b>Check with the maker or a dealer before you buy.</b></p>
      </div>

      <aside class="card settings">
        <h2>Prices used</h2>
        <form id="settings" novalidate>
          ${SETTINGS.map(
            ([k, label, unit, step]) => `<label class="field"><span class="label">${label}</span><span class="unit"><input type="number" min="0" step="${step}" data-s="${k}" value="${s[k]}"><span>${unit}</span></span></label>`,
          ).join('')}
          <button type="button" class="btn btn-ghost" id="reset">Reset to defaults</button>
          <p class="fine" id="saved" aria-live="polite"></p>
        </form>
      </aside>
    </div>
  </section>`;

  const form = root.querySelector('#settings');
  const saved = root.querySelector('#saved');
  form.addEventListener('input', (e) => {
    const k = e.target.dataset.s;
    const v = Number(e.target.value);
    if (k && Number.isFinite(v) && v > 0) {
      setSettings({ [k]: v });
      saved.textContent = 'Saved. Results use the new prices.';
    }
  });
  root.querySelector('#reset').addEventListener('click', () => {
    resetSettings();
    form.querySelectorAll('[data-s]').forEach((el) => (el.value = DEFAULT_SETTINGS[el.dataset.s]));
    saved.textContent = 'Back to default prices.';
  });
}
