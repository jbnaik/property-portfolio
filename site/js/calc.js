const PER_YEAR = { weekly: 52, fortnightly: 26, monthly: 12, quarterly: 4, annual: 1, annually: 1, yearly: 1 };

export function annualise(amount, frequency = "annual") {
  const n = PER_YEAR[String(frequency).toLowerCase()];
  if (n === undefined) throw new Error(`Unknown frequency: ${frequency}`);
  return (Number(amount) || 0) * n;
}

const byDate = (a, b) => String(a.date).localeCompare(String(b.date));

export function valuations(p) {
  const list = [{ date: p.purchase.date, value: p.purchase.price, source: "Purchase price" }];
  for (const v of p.valuations || []) list.push(v);
  return list.sort(byDate);
}

export function currentValue(p) {
  const list = valuations(p);
  return list[list.length - 1].value;
}

export function valueAt(p, date) {
  if (date < p.purchase.date) return 0;
  if (p.sold && date >= p.sold.date) return 0;
  let value = 0;
  for (const v of valuations(p)) if (v.date <= date) value = v.value;
  return value;
}

export function totalDebt(p) {
  return (p.loans || []).reduce((s, l) => s + (Number(l.balance) || 0), 0);
}

export function totalOffset(p) {
  return (p.loans || []).reduce((s, l) => s + (Number(l.offset) || 0), 0);
}

export function loanInterest(loan) {
  const owing = Math.max(0, (Number(loan.balance) || 0) - (Number(loan.offset) || 0));
  return owing * (Number(loan.rate) || 0) / 100;
}

export function amortisedRepayment(balance, ratePct, years, periodsPerYear = 12) {
  const n = years * periodsPerYear;
  const r = ratePct / 100 / periodsPerYear;
  if (n <= 0) return 0;
  if (r === 0) return balance / n;
  return (balance * r) / (1 - Math.pow(1 + r, -n));
}

export function loanAnnualRepayments(loan) {
  if (loan.repayment) return annualise(loan.repayment, loan.repaymentFrequency || "monthly");
  if (String(loan.type || "").toUpperCase() === "IO") return loanInterest(loan);
  return amortisedRepayment(Number(loan.balance) || 0, Number(loan.rate) || 0, loan.termYearsRemaining ?? 30) * 12;
}

export function annualRent(p) {
  if (!p.rent || !p.rent.amount) return 0;
  const gross = annualise(p.rent.amount, p.rent.frequency || "weekly");
  const vacancy = Math.min(52, Math.max(0, Number(p.rent.vacancyWeeks) || 0));
  return gross * (52 - vacancy) / 52;
}

export function annualExpenses(p) {
  const rentFees = p.rent && p.rent.managementFeePct ? annualRent(p) * p.rent.managementFeePct / 100 : 0;
  return (p.expenses || []).reduce((s, e) => s + annualise(e.amount, e.frequency), 0) + rentFees;
}

export function expenseBreakdown(p) {
  const rows = (p.expenses || []).map((e) => ({ name: e.name, annual: annualise(e.amount, e.frequency) }));
  if (p.rent && p.rent.managementFeePct) {
    rows.push({ name: `Property management (${p.rent.managementFeePct}%)`, annual: annualRent(p) * p.rent.managementFeePct / 100 });
  }
  return rows;
}

export function annualRepayments(p) {
  return (p.loans || []).reduce((s, l) => s + loanAnnualRepayments(l), 0);
}

export function annualInterest(p) {
  return (p.loans || []).reduce((s, l) => s + loanInterest(l), 0);
}

function yearsBetween(from, to) {
  return (new Date(to) - new Date(from)) / (365.25 * 24 * 3600 * 1000);
}

export function propertyMetrics(p, today = new Date().toISOString().slice(0, 10)) {
  const value = currentValue(p);
  const debt = totalDebt(p);
  const rent = annualRent(p);
  const expenses = annualExpenses(p);
  const repayments = annualRepayments(p);
  const interest = annualInterest(p);
  const costBase = p.purchase.price + (p.purchase.costs || 0);
  const years = yearsBetween(p.purchase.date, today);
  const growth = value - p.purchase.price;
  return {
    value,
    debt,
    offset: totalOffset(p),
    equity: value - debt,
    lvr: value ? debt / value : 0,
    growth,
    growthPct: p.purchase.price ? growth / p.purchase.price : 0,
    cagr: years > 0.5 && p.purchase.price ? Math.pow(value / p.purchase.price, 1 / years) - 1 : null,
    costBase,
    yearsHeld: years,
    rent,
    expenses,
    repayments,
    interest,
    cashFlow: rent - expenses - repayments,
    grossYield: value ? rent / value : 0,
    netYield: value ? (rent - expenses) / value : 0,
  };
}

export function portfolioMetrics(properties, today) {
  const active = properties.filter((p) => !p.sold);
  const rows = active.map((p) => propertyMetrics(p, today));
  const sum = (k) => rows.reduce((s, r) => s + r[k], 0);
  const value = sum("value");
  const debt = sum("debt");
  const rent = sum("rent");
  const expenses = sum("expenses");
  const purchase = active.reduce((s, p) => s + p.purchase.price, 0);
  return {
    count: active.length,
    value,
    debt,
    offset: sum("offset"),
    equity: value - debt,
    lvr: value ? debt / value : 0,
    growth: value - purchase,
    growthPct: purchase ? (value - purchase) / purchase : 0,
    rent,
    expenses,
    repayments: sum("repayments"),
    interest: sum("interest"),
    cashFlow: sum("cashFlow"),
    grossYield: value ? rent / value : 0,
    netYield: value ? (rent - expenses) / value : 0,
  };
}

export function usableEquity(properties, maxLvr = 0.8) {
  return properties
    .filter((p) => !p.sold)
    .reduce((s, p) => s + Math.max(0, currentValue(p) * maxLvr - totalDebt(p)), 0);
}

export function portfolioHistory(properties, today = new Date().toISOString().slice(0, 10)) {
  const dates = new Set([today]);
  for (const p of properties) {
    dates.add(p.purchase.date);
    for (const v of p.valuations || []) dates.add(v.date);
    if (p.sold) dates.add(p.sold.date);
  }
  return [...dates].sort().map((date) => ({
    date,
    value: properties.reduce((s, p) => s + valueAt(p, date), 0),
    cost: properties.reduce((s, p) => s + (valueAt(p, date) ? p.purchase.price : 0), 0),
  }));
}
