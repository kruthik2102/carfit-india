# CarFit India — original build spec

Written as a brief for Lovable's agent (first attempt, abandoned after the Free plan ran out of credits).
The local build in this folder follows the same inputs, screens and scoring formulas, with these changes:
plain HTML/CSS/JS instead of React, a number-plate nameplate instead of car silhouettes, and mileage
stored as the claimed figure with real-world city/highway factors applied in `js/scoring.js`.

---

## Message 1 — app, screens, scoring, first batch of cars

Build **CarFit India**, a car buying guide and affordability calculator for buyers in India. The user enters their finances, usage and preferences; the app scores every new car on sale in India and shows the best match, plus a full comparison table where every feature is a column with a tick/cross.

### Tech + conventions
- React + TypeScript + Tailwind + shadcn/ui. No backend needed: the car dataset lives in typed static files under `src/data/cars/` (one file per brand, re-exported from `src/data/cars/index.ts`), so it can be edited and extended easily.
- Put all scoring/finance logic in pure functions in `src/lib/scoring.ts` and `src/lib/finance.ts`, so it is testable and separate from UI.
- Indian number formatting everywhere: ₹ with lakh/crore (₹8.45 L, ₹1.2 Cr; ₹12,34,567 for exact amounts).
- Persist the user's inputs in localStorage so a refresh keeps them. Make inputs shareable via URL query params too.
- Fully responsive (works at 375px phone width). Light and dark mode.
- Design: clean, trustworthy, automotive. Deep navy/ink primary, one warm accent (amber) for scores, generous whitespace, large score numbers. Avoid generic purple gradients.

### Screen 1 — Landing
Hero: "Find the car that fits your salary, your commute and your must-haves." One CTA "Start" → wizard. Three small explainer tiles (Affordability score, Buyable score, Feature-by-feature comparison). Disclaimer line in the footer.

### Screen 2 — Wizard (4 steps, progress bar, back/next, every field has a sensible default so the user can skip ahead)
**Step 1 — Money**
- Monthly in-hand salary (₹) — with a toggle to enter annual CTC instead (convert CTC→in-hand at ~75% / 12, show the estimate).
- Existing EMIs per month (₹), default 0.
- Savings available for down payment (₹).
- Year you plan to buy (current year … +4). If it is a future year, also ask: expected annual salary hike % (default 8%) and amount saved per month toward the car (₹). Project salary and down-payment savings forward to that year and use the projected numbers in all scores (show "Projected for 2028: salary ₹X/month, down payment ₹Y").
- Loan tenure in years (slider 1–7, default 5) and interest rate % (default 9.0).

**Step 2 — Usage**
- Monthly running kilometres (slider 250–5,000, default 1,000) plus a city/highway mix slider (default 70% city).
- Fuel preference (multi-select chips): Any, Petrol, Diesel, CNG, Strong hybrid, Electric.
- Transmission: Any, Manual, Automatic.
- If the user picks Electric or Any: "Can you charge at home?" yes/no (no → EVs get a running-cost penalty and a warning badge).

**Step 3 — Car preferences**
- Body type (multi-select): Hatchback, Sedan, Compact SUV (<4m), Mid-size SUV, Full-size SUV, MPV/MUV, Off-roader, Pickup.
- Seats needed: 4+, 5+, 7+.
- Make (multi-select brand logos/chips, default all).
- Model year: "Launched or last updated in or after" (year select, default any).
- Minimum safety rating: Any / 3★ / 4★ / 5★ (Bharat NCAP or Global NCAP adult rating).
- Max budget override (optional ₹ on-road cap).

**Step 4 — Must-have features + priorities**
- Feature chips grouped by Safety / Comfort / Tech / Convenience (the same list as the table columns below). Tapping a chip marks it "must-have". Cars that lack a must-have are not hidden, but lose feature-match points and show a "missing: TPMS, ADAS" note.
- Priority sliders that set the Buyable-score weights (must sum to 100, auto-normalise): Affordability 35, Safety 25, Feature match 25, Running cost 15.
- "Show my best car" button → Results.

### Screen 3 — Results
- **Hero card "Best match for you"**: car name, image placeholder (brand-coloured silhouette by body type — no external images), recommended variant tier, on-road price estimate, EMI/month, total monthly cost of ownership, big Buyable score and Affordability score rings, 3 "why this car" bullets, and the missing must-haves (if any).
- **Runner-ups**: next 4 cars as cards.
- **Full comparison table** (the core of the app):
  - Sticky left columns: Car (brand + model), Body type, Price range (ex-showroom), Est. on-road, EMI/month, Monthly cost, Affordability score, Buyable score.
  - Then spec columns: Fuel types, Transmission, Mileage/range, Seats, NCAP rating, Airbags, Launch/update year.
  - Then one column per feature (list below). Cell values are tri-state: **✓ green = standard on all variants**, **◐ amber = available on higher variants only**, **✗ grey = not offered**. Tooltip on hover explains which.
  - Sortable by any column (default: Buyable score desc). Search box. Filter chips that mirror the wizard choices (edit inline without going back). Toggle "Hide cars over my budget" (default on — over-budget cars otherwise show with a red "Over budget" tag). Column picker to show/hide feature groups. Horizontal scroll on mobile with sticky first column. "Export CSV" button.
  - Row checkbox → "Compare (up to 3)".
- **Car detail drawer** (click a row): score breakdown bars with the formula shown, monthly cost breakdown (EMI, fuel/charging, insurance, maintenance), down payment vs. the 20% rule, the 20/4/10 rule verdict, full feature list grouped, which variant tier you'd need for your must-haves.
- **Compare page**: up to 3 cars side by side, differences highlighted.

### Screen 4 — How scores work
Plain-language methodology page with the formulas below, fuel price assumptions (editable in a small Settings panel: petrol ₹103/L, diesel ₹90/L, CNG ₹80/kg, home electricity ₹8/kWh, public fast charging ₹22/kWh), and the disclaimer: "Prices and features are approximate and change often. Check the manufacturer's website or a dealer before buying."

### Scoring logic (implement exactly; all scores 0–100, rounded)
**Variant tier & price used**: each car has ex-showroom `priceMin` and `priceMax` (₹ lakh). If none of the user's must-have features are "higher variants only" on that car, price = priceMin + 25% of the range (a sensible mid-low variant). If any must-have is ◐, price = priceMin + 80% of the range (upper variant). Show the tier used ("Base/Mid" or "Upper variant").
**On-road price** = ex-showroom × 1.14 (road tax + registration + insurance; multiplier editable in Settings). EVs use × 1.06 (most states waive road tax).
**Loan** = max(0, on-road − down payment). **EMI** = standard reducing-balance formula with the user's rate and tenure.
**Running cost/month** = km/month ÷ efficiency × energy price. Use the car's city/highway efficiency blended by the user's mix (if only one figure, use it for both). EV without home charging → use the public fast-charging price.
**Insurance/month** = on-road × 3% ÷ 12. **Maintenance/month** = ₹1,000 for cars under ₹10 L ex-showroom, ₹1,500 for ₹10–20 L, ₹2,500 for ₹20–35 L, ₹4,000 above; EVs × 0.6.
**Total monthly cost** = EMI + running + insurance + maintenance.

**Affordability score** = 0.5 × A1 + 0.3 × A2 + 0.2 × A3, where income = projected monthly in-hand salary − existing EMIs:
- A1 (monthly burden) from r = total monthly cost ÷ income: r ≤ 0.15 → 100; 0.15–0.25 → linear 100→60; 0.25–0.40 → linear 60→10; > 0.40 → 0.
- A2 (price vs income) from p = on-road ÷ (annual in-hand income): p ≤ 0.5 → 100; 0.5–1.0 → linear 100→20; > 1.0 → linear 20→0 by 1.5.
- A3 (down payment) from d = down payment ÷ on-road: d ≥ 0.20 → 100; 0–0.20 → linear 30→100.
- Label: 80+ "Comfortable", 60–79 "Manageable", 40–59 "Stretch", < 40 "Not advisable". Over budget cap → label "Over your cap".

**Safety score** = NCAP adult stars × 14 (unrated → 35, flagged "Not crash-tested") + 6 airbags standard 10 (◐ 5) + ESC standard 6 + ADAS (standard 4, ◐ 2) capped at 100.
**Feature match** = 100 × (Σ points over must-haves) ÷ number of must-haves, with ✓ = 1, ◐ = 0.7, ✗ = 0. If no must-haves, use the share of all features available (✓ = 1, ◐ = 0.5).
**Running-cost score** = from running cost per km: ≤ ₹2/km → 100; ₹2–8/km → linear 100→20; > ₹8 → 10. Plus: if km/month > 1,500, diesel/CNG/strong-hybrid/EV-with-home-charging get +10 (cap 100).
**Buyable score** = weighted sum of Affordability, Safety, Feature match and Running cost using the priority slider weights. Cars failing a hard filter (body type, seats, fuel, transmission, make, model year, min NCAP) are excluded from the ranking (the table can toggle "show excluded" in grey).

### Feature columns (tri-state per car)
Safety: 6 airbags, ESC/ESP, Hill-hold assist, TPMS, ADAS (Level 1/2), 360° camera, Rear parking camera, Front parking sensors, ISOFIX, Rear disc brakes, Blind-spot monitor, Electronic parking brake (with auto-hold), 3-point seatbelts for all seats.
Comfort: Rear window sunshades, Sunroof, Panoramic sunroof, Ventilated front seats, Powered driver seat, Automatic climate control, Rear AC vents, Cruise control, Adjustable rear headrests.
Tech: Wireless Android Auto/Apple CarPlay, Touchscreen ≥ 10", Digital instrument cluster, Connected-car tech, Wireless phone charger, Head-up display, Premium sound system.
Convenience: Keyless entry + push-button start, Auto headlamps, Rain-sensing wipers, Auto-dimming IRVM, Auto-fold electric ORVMs, LED headlamps, Rear wiper & defogger, Rear armrest with cup holders.

### Car data model (`src/data/cars/types.ts`)
`id, brand, model, bodyType, lengthUnder4m, seats (number[]), priceMin, priceMax (₹ lakh ex-showroom), fuels[] ("Petrol"|"Diesel"|"CNG"|"Strong hybrid"|"Electric"), transmissions[] ("Manual"|"Automatic"), efficiency: { [fuel]: { city, highway, unit: "kmpl"|"km/kg"|"km/kWh" } }, evRangeKm?, batteryKWh?, ncap: { agency: "Bharat NCAP"|"Global NCAP"|null, adultStars: number|null, year: number|null }, maxAirbags, launchYear, lastUpdateYear, groundClearanceMm?, bootLitres?, features: Record<FeatureKey, "std"|"higher"|"no">, notes?`

### Dataset — batch 1 (this message)
Fill data for these brands now, using the latest models on sale in India and your best knowledge of current ex-showroom price ranges, ARAI/claimed efficiency, NCAP results and variant-wise features:
- **Maruti Suzuki**: Alto K10, S-Presso, Celerio, Wagon R, Swift, Dzire, Baleno, Ignis, Fronx, Brezza, Grand Vitara, Victoris, Ertiga, XL6, Invicto, Jimny, Eeco, e Vitara
- **Hyundai**: Grand i10 Nios, Exter, i20, Aura, Venue, Verna, Creta, Creta Electric, Alcazar, Tucson, Ioniq 5
- **Tata**: Tiago, Tiago EV, Tigor, Altroz, Punch, Punch EV, Nexon, Nexon EV, Curvv, Curvv EV, Harrier, Harrier EV, Safari

If a listed model has been discontinued or replaced, use its current replacement and add a `notes` line. Put a visible "Data last reviewed: <month year>" note on the results page.

---

## Message 2 — dataset batch 2
Add data files for: **Mahindra** (Bolero, Bolero Neo, Thar, Thar Roxx, XUV 3XO, Scorpio Classic, Scorpio N, XUV700 or its current replacement, BE 6, XEV 9e, XEV 9S), **Kia** (Sonet, Syros, Seltos, Carens / Carens Clavis, Carnival, EV6, EV9), **Toyota** (Glanza, Urban Cruiser Taisor, Rumion, Urban Cruiser Hyryder, Innova Crysta, Innova Hycross, Fortuner, Hilux, Camry), **Honda** (Amaze, City, City e:HEV, Elevate). Same schema and rules as batch 1.

## Message 3 — dataset batch 3
Add: **MG** (Comet EV, Windsor EV, Astor, Hector, Hector Plus, ZS EV, Gloster), **Skoda** (Kylaq, Kushaq, Slavia, Kodiaq), **Volkswagen** (Virtus, Taigun, Tiguan R-Line), **Renault** (Kwid, Kiger, Triber), **Nissan** (Magnite), **Citroën** (C3, Basalt, Aircross), **BYD** (Atto 3, Seal, eMax 7). Same schema and rules. Then make sure the brand filter chips include every brand in the dataset.
