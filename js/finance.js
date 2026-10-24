// Loan and ownership-cost arithmetic. Pure functions, no DOM.

/** Monthly EMI on a reducing-balance loan. */
export function emi(principal, annualRatePct, years) {
  if (principal <= 0) return 0;
  const n = Math.round(years * 12);
  const r = annualRatePct / 12 / 100;
  if (r === 0) return principal / n;
  const f = Math.pow(1 + r, n);
  return (principal * r * f) / (f - 1);
}

/** Rough take-home from annual CTC: 75% of CTC, spread over 12 months. */
export const ctcToInHand = (ctc) => (ctc * 0.75) / 12;

/** Salary and down-payment savings projected forward to the purchase year. */
export function projectFinances({ monthlySalary, savings, yearsAhead, hikePct, monthlySave }) {
  const n = Math.max(0, yearsAhead);
  return {
    salary: monthlySalary * Math.pow(1 + hikePct / 100, n),
    downPayment: savings + monthlySave * 12 * n,
  };
}

/** Service + wear parts per month, by ex-showroom price band. EVs need about 40% less. */
export function maintenancePerMonth(exShowroomLakh, isEv) {
  const base = exShowroomLakh < 10 ? 1000 : exShowroomLakh < 20 ? 1500 : exShowroomLakh <= 35 ? 2500 : 4000;
  return isEv ? base * 0.6 : base;
}

/** Comprehensive insurance at roughly 3% of on-road price a year. */
export const insurancePerMonth = (onRoad) => (onRoad * 0.03) / 12;
