// Scores every car for the current state, plus the helpers views use to pick what to show.

import { CARS } from './data/cars.js';
import { scoreAll } from './scoring.js';
import { getState, CURRENT_YEAR } from './state.js';

export function compute(state = getState()) {
  return scoreAll(CARS, state.inputs, state.settings, CURRENT_YEAR);
}

/** Best match + runner-ups: eligible cars that are within budget, by Buyable score. */
export function podium(results, n = 5) {
  const eligible = results.filter((r) => !r.excluded);
  const affordable = eligible.filter((r) => !r.overBudget);
  return { picks: (affordable.length ? affordable : eligible).slice(0, n), eligible, affordable };
}
