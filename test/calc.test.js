import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as calc from "../site/js/calc.js";
import { validatePortfolio } from "../site/js/validate.js";

const sample = JSON.parse(readFileSync(new URL("../site/data.sample.json", import.meta.url)));
const close = (a, b, eps = 1) => assert.ok(Math.abs(a - b) <= eps, `${a} ≈ ${b}`);

test("sample data is valid", () => {
  assert.deepEqual(validatePortfolio(sample), []);
});

test("validation catches mistakes", () => {
  const errors = validatePortfolio({ properties: [{ id: "x", name: "X", purchase: { price: "1", date: "2020" } }, { id: "x", name: "Y", purchase: { price: 1, date: "2020-01-01" } }] });
  assert.equal(errors.length, 2);
  assert.deepEqual(validatePortfolio({ properties: [], goals: { name: "x" } }), ["`goals` must be an array"]);
  const blank = validatePortfolio({ properties: [{ id: "a", name: "A", purchase: { price: 1, date: "2020-01-01" }, loans: [{ balance: 1, rate: 5, repayment: "" }] }] });
  assert.equal(blank.length, 1);
});

test("annualise", () => {
  assert.equal(calc.annualise(100, "weekly"), 5200);
  assert.equal(calc.annualise(100, "quarterly"), 400);
  assert.throws(() => calc.annualise(1, "daily"));
});

test("IO loan repayments equal interest net of offset", () => {
  close(calc.loanAnnualRepayments({ balance: 500000, offset: 100000, rate: 6, type: "IO" }), 24000);
});

test("explicit zero repayment is respected", () => {
  assert.equal(calc.loanAnnualRepayments({ balance: 500000, rate: 6, type: "P&I", repayment: 0 }), 0);
});

test("amortised repayment matches standard formula", () => {
  close(calc.amortisedRepayment(500000, 6, 30), 2997.75, 0.01);
});

test("property metrics", () => {
  const p = sample.properties.find((x) => x.id === "brisbane-unit");
  const m = calc.propertyMetrics(p, "2026-11-26");
  assert.equal(m.value, 760000);
  assert.equal(m.equity, 760000 - 448000);
  close(m.rent, 720 * 50);
  close(m.lvr, 448000 / 760000, 1e-9);
  close(m.cashFlow, m.rent - m.expenses - 448000 * 0.0619);
});

test("portfolio history uses latest known valuation per date", () => {
  const h = calc.portfolioHistory(sample.properties, "2026-11-26");
  const at = (d) => h.find((x) => x.date === d).value;
  assert.equal(at("2018-03-15"), 1350000);
  assert.equal(at("2020-09-01"), 1420000 + 560000);
  assert.equal(h[h.length - 1].value, 1950000 + 760000 + 765000);
});
