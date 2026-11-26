const FREQUENCIES = ["weekly", "fortnightly", "monthly", "quarterly", "annual", "annually", "yearly"];
const isDate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const isNum = (n) => typeof n === "number" && Number.isFinite(n);

export function validatePortfolio(data) {
  const errors = [];
  if (!data || typeof data !== "object") return ["Data must be a JSON object"];
  if (!Array.isArray(data.properties)) return ["`properties` must be an array"];
  const ids = new Set();
  data.properties.forEach((p, i) => {
    const at = `properties[${i}]${p && p.name ? ` (${p.name})` : ""}`;
    if (!p || typeof p !== "object") return errors.push(`${at}: must be an object`);
    if (!p.id) errors.push(`${at}: missing id`);
    else if (ids.has(p.id)) errors.push(`${at}: duplicate id "${p.id}"`);
    ids.add(p.id);
    if (!p.name) errors.push(`${at}: missing name`);
    if (!p.purchase || !isNum(p.purchase.price) || !isDate(p.purchase.date)) {
      errors.push(`${at}: purchase needs a numeric price and a YYYY-MM-DD date`);
    }
    (p.valuations || []).forEach((v, j) => {
      if (!isDate(v.date) || !isNum(v.value)) errors.push(`${at}.valuations[${j}]: needs YYYY-MM-DD date and numeric value`);
    });
    (p.loans || []).forEach((l, j) => {
      if (!isNum(l.balance)) errors.push(`${at}.loans[${j}]: balance must be a number`);
      if (!isNum(l.rate)) errors.push(`${at}.loans[${j}]: rate must be a number (e.g. 6.19)`);
      if (l.repaymentFrequency && !FREQUENCIES.includes(l.repaymentFrequency)) errors.push(`${at}.loans[${j}]: unknown repaymentFrequency`);
    });
    if (p.rent && p.rent.frequency && !FREQUENCIES.includes(p.rent.frequency)) errors.push(`${at}.rent: unknown frequency`);
    (p.expenses || []).forEach((e, j) => {
      if (!isNum(e.amount)) errors.push(`${at}.expenses[${j}]: amount must be a number`);
      if (!FREQUENCIES.includes(e.frequency)) errors.push(`${at}.expenses[${j}]: frequency must be one of ${FREQUENCIES.join(", ")}`);
    });
  });
  return errors;
}
