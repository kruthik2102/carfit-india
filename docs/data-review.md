# Data review — 24–25 October 2026

Every car in `js/data/cars.js` was checked against current public listings. The first version of the dataset
was written from memory (knowledge up to mid-2026) and had drifted badly: many models had been replaced,
facelifted or discontinued, and a lot of features were marked standard when they are only on higher variants.

## Sources

| What | Source | Notes |
| --- | --- | --- |
| Prices | CarDekho brand pages (`cardekho.com/<brand>-cars`) | Delhi ex-showroom, as listed on 24 Oct 2026. Makers' own sites don't show prices on their landing pages. |
| Features, mileage, launch dates | CarDekho model pages, one per car | Read variant-by-variant: a feature is **standard** only if the cheapest variant has it. Where the page didn't mention a feature, the earlier value was kept. |
| Bharat NCAP ratings | [Autocar India — every car tested by Bharat NCAP](https://www.autocarindia.com/auto-features/every-car-tested-by-bharat-ncap-so-far-431936) | All 34 results to July 2026. The official site (bharatncap.gov.in / bncap.in) could not be reached. |
| Global NCAP ratings | [Global NCAP India results](https://www.globalncap.org/results) plus news reports for star counts | e.g. [Celerio 3★ (2025)](https://www.globalncap.org/news/mixed-results-for-maruti-suzuki), [Bolero Neo 1★ (2024)](https://autocarpro.in/news/mahindra-bolero-neo-scores-one-star-in-gncap-rating-120215), [Carens 3★ (2024)](https://autocarpro.in/news-national/kia-carens-gets-3-star-global-ncap-rating-in-fresh-tests-120229), Magnite 5★ (2025). |

CarDekho pages are sometimes internally inconsistent. Where they conflicted, the variant-by-variant breakdown
won over summary text, and the car's `notes` say so when it mattered (for example the Syros's ADAS).

## Lineup changes

- **Removed (discontinued or replaced):** Maruti Ignis, Hyundai Tucson, Tata Tigor, Mahindra XUV700 (→ XUV 7XO),
  Honda City e:HEV (now the top City variant), MG Gloster (→ Majestor).
- **Added (new launches):** Tata Sierra, Sierra EV, Aeris · Mahindra XUV 7XO, XUV 3XO EV, XUV400 EV · Kia Syros EV,
  Sorento · Toyota Urban Cruiser Ebella · MG Majestor · VW Tayron · Renault Duster · Nissan Tekton, Gravite ·
  Citroën e-C3 · BYD Sealion 7.
- **New generations / facelifts in 2026:** Brezza, Baleno, Glanza, Exter, Verna, Ioniq 5, Tiago, Tiago EV, Punch,
  Punch EV, Thar (now "Thar OG"), Scorpio N, Seltos, City, Elevate, Kushaq, Slavia, Taigun, Hilux.
- Result: 98 → **108 cars**, still 14 brands. Luxury and niche models (Land Cruiser, Vellfire, M9, Cyberster,
  Golf GTI, Octavia RS, ZR-V, X-Trail, Hector Tomahawk) are left out.

## Crash-rating corrections

- **Wrong rating removed:** Hyundai Alcazar was listed as Bharat NCAP 5★ — it has not been tested by any agency.
- **Ratings that were missing:** Celerio 3★ (GNCAP 2025), Bolero Neo 1★ (GNCAP 2024), Ertiga 3★ (GNCAP 2019).
- **Newer Bharat NCAP results replacing old/absent ones:** Brezza, Venue, Seltos, Punch, Punch EV, Sierra,
  Duster, Tekton, XUV 7XO (all 5★, 2026); Dzire, Amaze, Aircross (5★, 2025); Baleno (4★, 2025).
- **Wrong test years:** Harrier and Safari 2023 (not 2024), XUV 3XO and Basalt 2024 (not 2025), Invicto and
  Innova Hycross 2025 (not 2024), Triber 2021 (not 2022), Kwid 2016 (not 2021).
- Ratings carried over from a pre-facelift car are flagged in that car's notes (Baleno, Verna, Kushaq, Slavia,
  Taigun, Scorpio N, Kiger, Tiago, Thar).

## Biggest feature corrections

Features marked standard that are actually higher-variant only (or missing):
- **ESC not on base variants:** Grand i10 Nios, Aura, Tiago, Aeris, Comet EV, Citroën C3, Innova Crysta.
- **Six airbags not standard:** Kwid, Scorpio N, Thar, Astor, Citroën C3, e-C3, Innova Crysta.
- **TPMS / rear camera / rear discs not standard:** Nexon, Curvv, Thar Roxx, Sonet, Kylaq, Punch EV (rear drums).
- **ADAS not offered:** Syros (dropped in 2026), Fronx, Brezza, Kylaq, Kushaq, Slavia, Virtus, Taigun, Hyryder,
  Fortuner, Innova Crysta.

Features that are now standard (were marked higher or missing): Tiago/Tiago EV/Punch six airbags (2026
facelifts), Venue 10.25" screen + wireless Android Auto, Seltos cruise + 10.25" screen, Kushaq sunroof,
Fronx auto AC.

## Prices that were estimates and are now real

e Vitara ₹16.19–20.21 L (was guessed at 17.5–25.5), XEV 9S ₹20.65–30.15 L, Kodiaq ₹36.99–46.99 L,
Ioniq 5 ₹55.70 L (facelift; was 46.05), Carnival ₹59.65 L. Nearly every other price moved by a few thousand rupees.

## Still estimated

Makers haven't published a claimed mileage for these, so the figure is an estimate and the car's notes say so:
Tiago and Aeris petrol (Tiago 1.2 claim used), Thar (Thar Roxx claim used), Seltos (previous generation),
Curvv, Harrier and Safari petrol, XUV 7XO, Sorento diesel, Innova Crysta, Hilux, Majestor, Tayron.

Other known gaps: features CarDekho didn't mention were left as they were; Hector Plus equipment is assumed to
follow the Hector; the Sealion 7's new base variant equipment isn't confirmed.

## Variant ladders (25 October 2026)

Every car now carries its trim ladder, gathered from each CarDekho model page's variant list: trim names in
order, the ex-showroom price of every fuel/gearbox combination in that trim, and the features each trim adds
over the one below. Colour and edition-only versions (Knight, Dark, Dual Tone, Blackstorm, ACFC, etc.) are left
out; 6/7-seat, AWD and battery-size price differences are kept as trim notes.

- 101 cars have multi-trim ladders; 7 are sold in a single version (Ioniq 5, Carnival, EV6, EV9, Camry,
  Urban Cruiser Ebella, Tiguan R-Line).
- The ✓ / ◐ / ✗ marks are now derived from the ladders, which corrected more cars: e.g. Nexon ESC only from
  Smart Plus, Scorpio N six airbags only from Z8S, Innova Crysta ESC only from VX, Kwid six airbags only on the
  Climber AMT, Majestor ADAS/panoramic roof/vented seats standard.
- Simplifications: a ladder assumes each trim includes everything below it. Where a maker splits features by
  engine instead (Brezza turbo vs NA, Verna turbo HX8, strong-hybrid trims of the Grand Vitara/Hyryder/Victoris,
  Duster hybrid, XUV 3XO's REVX line), the difference is noted on the trim or car. Slavia and Basalt "Max" trims
  were not itemised by trim on their pages; their splits follow the Kushaq and the Basalt's neighbouring trims.
- A few prices were missing on the page (some Tiago petrol trims, Carens Clavis CNG upper trims, Fortuner
  Legender per-variant prices) and are simply not offered as options in the app.
