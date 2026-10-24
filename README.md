# CarFit India

A car buying guide for India. Enter your salary, how far you drive and the features you need; CarFit scores
every new car on sale for **affordability** and overall **buyability**, tells you which **variant** of each car
to buy (e.g. Venue HX 8 petrol automatic vs HX 10), and lays out a feature-by-feature comparison table
(✓ standard · ◐ higher variants only · ✗ not offered).

No backend, no build step, no accounts — plain HTML, CSS and JavaScript modules. Inputs stay in your browser
(localStorage) and can be shared as a link.

## Run it

```bash
node scripts/serve.mjs        # http://localhost:5190
node --test tests/scoring.test.mjs
```

Any static host works (GitHub Pages: serve the folder root).

## What's where

| Path | What it holds |
| --- | --- |
| `js/data/cars.js` | The dataset: 108 models, 14 brands, each with its trim ladder (prices per fuel/gearbox and what each trim adds). Shorthand notes at the top. |
| `js/features.js` | The 37 feature columns, grouped Safety / Comfort / Tech / Convenience. |
| `js/scoring.js` | Every formula: variant choice, EMI, on-road price, running cost, Affordability, Safety, Feature match, Running-cost and Buyable scores. |
| `js/finance.js` | Loan, salary projection, insurance and servicing arithmetic. |
| `js/state.js` | Saved inputs, price settings, compare list, share links. |
| `js/views/` | Home, 4-step wizard, results + comparison table, detail panel, compare, How scores work. |
| `docs/spec.md` | The original spec (written for a Lovable build that was abandoned). |

## Inputs

- **Money:** monthly take-home or annual CTC, existing EMIs, down-payment savings, loan tenure and rate.
- **Year,** three ways: the year you plan to buy (projects salary and savings forward), loan tenure, and a
  "launched or updated in or after" filter.
- **Usage:** km a month, city/highway mix, fuel, gearbox, home charging.
- **Car:** body type, seats, brands, minimum crash-test rating, optional on-road price cap.
- **Must-haves:** any of the 37 features, plus sliders that weight the Buyable score.

## How the variant is chosen

For each car, every trim × fuel × gearbox that matches your choices is costed (EMI, fuel, insurance, servicing).
The recommendation is the version with the most of your must-haves, then the lowest monthly cost. The car's
detail panel shows the full ladder, the price and monthly cost of each trim, which must-haves it has, and what
stepping up or down a trim adds or loses.

## Updating the data

Prices, ratings, features and trim ladders were checked model by model on 24–25 October 2026 against CarDekho's
listings and Bharat NCAP / Global NCAP results — see `docs/data-review.md` for sources, what changed and what is
still estimated. They change often: verify with the maker or a dealer before buying. To change a car, edit its
`variants` in `js/data/cars.js`; feature keys and powertrain codes are validated, so a typo fails the tests
instead of silently showing ✗. Bump `DATA_LAST_REVIEWED` when you do a review pass.
