import * as calc from "./calc.js";
import { money, signedMoney, pct, signedPct, date, escapeHtml as h } from "./format.js";
import { lineChart, donutChart, bar } from "./charts.js";

const stat = (label, value, sub = "", cls = "") =>
  `<div class="stat ${cls}"><div class="stat-label">${label}</div><div class="stat-value">${value}</div>${sub ? `<div class="stat-sub">${sub}</div>` : ""}</div>`;

const pill = (n, text) => `<span class="pill ${n >= 0 ? "pos" : "neg"}">${text}</span>`;
const tone = (n) => (n >= 0 ? "pos" : "neg");

function propertyLine(p) {
  return [p.address, p.suburb, p.state, p.postcode].filter(Boolean).map(h).join(", ");
}

function features(p) {
  const f = [];
  if (p.bedrooms) f.push(`${p.bedrooms} bed`);
  if (p.bathrooms) f.push(`${p.bathrooms} bath`);
  if (p.parking) f.push(`${p.parking} car`);
  if (p.landSizeSqm) f.push(`${p.landSizeSqm} m²`);
  return f.join(" · ");
}

export function overview(data) {
  const props = data.properties.filter((p) => !p.sold);
  const m = calc.portfolioMetrics(props);
  const maxLvr = data.settings?.maxLvr ?? 0.8;
  const usable = calc.usableEquity(props, maxLvr);
  const history = calc.portfolioHistory(data.properties);

  const goals = (data.goals || []).map((g) => {
    const progress = g.targetEquity ? m.equity / g.targetEquity : 0;
    return `<div class="goal"><div class="goal-head"><span>${h(g.name)}</span><span class="muted">${pct(progress, 0)}${g.targetDate ? ` · by ${date(g.targetDate)}` : ""}</span></div>${bar(progress, "accent")}</div>`;
  }).join("");

  const rows = props.map((p) => {
    const pm = calc.propertyMetrics(p);
    return `<tr data-href="#/property/${encodeURIComponent(p.id)}">
      <td><div class="strong">${h(p.name)}</div><div class="muted small">${h(p.suburb || "")} ${h(p.state || "")}</div></td>
      <td class="num">${money(pm.value)}</td>
      <td class="num">${money(pm.debt)}</td>
      <td class="num">${money(pm.equity)}</td>
      <td class="num">${pct(pm.lvr)}</td>
      <td class="num ${tone(pm.growth)}">${signedPct(pm.growthPct)}</td>
      <td class="num ${tone(pm.cashFlow)}">${signedMoney(pm.cashFlow / 12)}</td>
    </tr>`;
  }).join("");

  return `
  <section class="card hero">
    <div class="eyebrow">Overview</div>
    <div class="hero-label">Net equity</div>
    <div class="hero-value">${money(m.equity)}</div>
    ${pill(m.growth, `${signedMoney(m.growth)} capital growth`)}
    <div class="stat-grid">
      ${stat("Property value", money(m.value), `${m.count} propert${m.count === 1 ? "y" : "ies"}`)}
      ${stat("Debt", money(-m.debt), m.offset ? `${money(m.offset)} in offset` : "")}
      ${stat("Portfolio LVR", pct(m.lvr), `Usable equity at ${pct(maxLvr, 0)}: ${money(usable)}`)}
      ${stat("Rental income", `${money(m.rent)}<small>/yr</small>`, `Gross yield ${pct(m.grossYield, 2)}`)}
      ${stat("Expenses + repayments", `${money(-(m.expenses + m.repayments))}<small>/yr</small>`, `Interest ${money(m.interest)}/yr`)}
      ${stat("Net cash flow", `<span class="${tone(m.cashFlow)}">${signedMoney(m.cashFlow / 12)}</span><small>/mo</small>`, `${signedMoney(m.cashFlow)}/yr pre-tax`)}
    </div>
  </section>

  <div class="grid-2">
    <section class="card">
      <div class="card-title">Portfolio value</div>
      ${lineChart([
        { name: "Value", points: history.map((d) => ({ date: d.date, value: d.value })), fill: true, dots: true },
        { name: "Purchase price", points: history.map((d) => ({ date: d.date, value: d.cost })), dashed: true },
      ])}
    </section>
    <section class="card">
      <div class="card-title">Equity by property</div>
      ${donutChart(props.map((p) => ({ label: p.name, value: calc.currentValue(p) - calc.totalDebt(p) })), { centerLabel: "Equity", centerValue: money(m.equity) })}
    </section>
  </div>

  <section class="card">
    <div class="card-title">Properties</div>
    <div class="table-wrap"><table class="table clickable">
      <thead><tr><th>Property</th><th class="num">Value</th><th class="num">Loan</th><th class="num">Equity</th><th class="num">LVR</th><th class="num">Growth</th><th class="num">Cash flow /mo</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="7" class="empty">No properties yet. Add some on the Data page.</td></tr>`}</tbody>
    </table></div>
  </section>

  ${goals ? `<section class="card"><div class="card-title">Goals</div>${goals}</section>` : ""}`;
}

export function properties(data) {
  const cards = data.properties.map((p) => {
    const m = calc.propertyMetrics(p);
    return `<a class="card prop-card" href="#/property/${encodeURIComponent(p.id)}">
      <div class="prop-head">
        <div><div class="prop-name">${h(p.name)}</div><div class="muted small">${propertyLine(p)}</div></div>
        <span class="tag">${p.sold ? "Sold" : h(p.status === "owner-occupied" ? "Home" : "Investment")}</span>
      </div>
      <div class="muted small">${h(p.type || "")}${features(p) ? ` · ${features(p)}` : ""}</div>
      <div class="prop-value">${money(m.value)} ${pill(m.growth, signedPct(m.growthPct))}</div>
      <div class="mini-grid">
        ${stat("Equity", money(m.equity))}
        ${stat("LVR", pct(m.lvr))}
        ${stat(p.rent?.amount ? "Yield" : "Loan", p.rent?.amount ? pct(m.grossYield, 2) : money(m.debt))}
        ${stat("Cash flow", `<span class="${tone(m.cashFlow)}">${signedMoney(m.cashFlow / 12)}</span><small>/mo</small>`)}
      </div>
      ${bar(1 - m.lvr, "accent")}
      <div class="muted small">${pct(1 - m.lvr, 0)} owned</div>
    </a>`;
  }).join("");
  return `<h1 class="page-title">Properties</h1><div class="prop-grid">${cards || `<div class="card empty">No properties yet.</div>`}</div>`;
}

export function property(data, id) {
  const p = data.properties.find((x) => x.id === id);
  if (!p) return `<div class="card empty">Property not found. <a href="#/properties">Back to properties</a></div>`;
  const m = calc.propertyMetrics(p);
  const vals = calc.valuations(p);

  const valRows = [...vals].reverse().map((v, i, arr) => {
    const prev = arr[i + 1];
    const change = prev ? v.value - prev.value : null;
    return `<tr><td>${date(v.date)}</td><td>${h(v.source || "")}</td><td class="num">${money(v.value)}</td><td class="num ${change === null ? "" : tone(change)}">${change === null ? "–" : signedMoney(change)}</td></tr>`;
  }).join("");

  const loanRows = (p.loans || []).map((l) => `<tr>
    <td>${h(l.lender || "Loan")}<div class="muted small">${h(l.type || "")}${l.fixedUntil ? ` · fixed until ${date(l.fixedUntil)}` : ""}${l.interestOnlyUntil ? ` · IO until ${date(l.interestOnlyUntil)}` : ""}</div></td>
    <td class="num">${money(l.balance)}</td><td class="num">${money(l.offset || 0)}</td><td class="num">${Number(l.rate).toFixed(2)}%</td>
    <td class="num">${money(calc.loanAnnualRepayments(l) / 12)}</td><td class="num">${money(calc.loanInterest(l))}</td></tr>`).join("");

  const expRows = calc.expenseBreakdown(p).map((e) => `<tr><td>${h(e.name)}</td><td class="num">${money(-e.annual)}</td><td class="num">${money(-e.annual / 12)}</td></tr>`).join("");

  const r = p.rent;
  const tenancy = r?.amount ? `
    <section class="card">
      <div class="card-title">Tenancy</div>
      <dl class="dl">
        <dt>Rent</dt><dd>${money(r.amount)} / ${h(r.frequency || "weekly")}</dd>
        ${r.tenant ? `<dt>Tenant</dt><dd>${h(r.tenant)}</dd>` : ""}
        ${r.leaseStart ? `<dt>Lease start</dt><dd>${date(r.leaseStart)}</dd>` : ""}
        ${r.leaseEnd ? `<dt>Lease end</dt><dd>${date(r.leaseEnd)}</dd>` : ""}
        <dt>Vacancy allowance</dt><dd>${r.vacancyWeeks || 0} weeks/yr</dd>
        ${r.managementFeePct ? `<dt>Management fee</dt><dd>${r.managementFeePct}%</dd>` : ""}
      </dl>
    </section>` : "";

  return `
  <a href="#/properties" class="back">← Properties</a>
  <section class="card hero">
    <div class="eyebrow">${h(p.type || "Property")} · ${p.sold ? "Sold" : h(p.status === "owner-occupied" ? "Home" : "Investment")}</div>
    <div class="hero-label">${h(p.name)}</div>
    <div class="muted">${propertyLine(p)}${features(p) ? ` · ${features(p)}` : ""}</div>
    <div class="hero-value">${money(m.value)}</div>
    ${pill(m.growth, `${signedMoney(m.growth)} since purchase${m.cagr !== null ? ` · ${signedPct(m.cagr)} p.a.` : ""}`)}
    <div class="stat-grid">
      ${stat("Equity", money(m.equity), `LVR ${pct(m.lvr)}`)}
      ${stat("Loan balance", money(-m.debt), m.offset ? `${money(m.offset)} in offset` : "")}
      ${stat("Purchased", money(p.purchase.price), `${date(p.purchase.date)} · ${m.yearsHeld.toFixed(1)} yrs`)}
      ${stat("Rental income", `${money(m.rent)}<small>/yr</small>`, m.rent ? `Gross ${pct(m.grossYield, 2)} · Net ${pct(m.netYield, 2)}` : "Not rented")}
      ${stat("Expenses", `${money(-m.expenses)}<small>/yr</small>`, `Repayments ${money(m.repayments)}/yr`)}
      ${stat("Net cash flow", `<span class="${tone(m.cashFlow)}">${signedMoney(m.cashFlow / 52)}</span><small>/wk</small>`, `${signedMoney(m.cashFlow)}/yr pre-tax`)}
    </div>
  </section>

  <div class="grid-2">
    <section class="card">
      <div class="card-title">Valuation history</div>
      ${lineChart([{ name: "Value", points: vals.map((v) => ({ date: v.date, value: v.value })), fill: true, dots: true }])}
    </section>
    <section class="card">
      <div class="card-title">Valuations</div>
      <div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Source</th><th class="num">Value</th><th class="num">Change</th></tr></thead><tbody>${valRows}</tbody></table></div>
    </section>
  </div>

  <section class="card">
    <div class="card-title">Loans</div>
    <div class="table-wrap"><table class="table"><thead><tr><th>Lender</th><th class="num">Balance</th><th class="num">Offset</th><th class="num">Rate</th><th class="num">Repayment /mo</th><th class="num">Interest /yr</th></tr></thead>
    <tbody>${loanRows || `<tr><td colspan="6" class="empty">No loans. Owned outright.</td></tr>`}</tbody></table></div>
  </section>

  <div class="grid-2">
    <section class="card">
      <div class="card-title">Cash flow</div>
      <div class="table-wrap"><table class="table"><thead><tr><th></th><th class="num">Annual</th><th class="num">Monthly</th></tr></thead>
      <tbody>
        <tr><td>Rent (after vacancy)</td><td class="num pos">${money(m.rent)}</td><td class="num pos">${money(m.rent / 12)}</td></tr>
        ${expRows}
        <tr><td>Loan repayments</td><td class="num">${money(-m.repayments)}</td><td class="num">${money(-m.repayments / 12)}</td></tr>
      </tbody>
      <tfoot><tr><td>Net (pre-tax)</td><td class="num ${tone(m.cashFlow)}">${signedMoney(m.cashFlow)}</td><td class="num ${tone(m.cashFlow)}">${signedMoney(m.cashFlow / 12)}</td></tr></tfoot>
      </table></div>
    </section>
    ${tenancy || `<section class="card"><div class="card-title">Purchase</div><dl class="dl">
      <dt>Price</dt><dd>${money(p.purchase.price)}</dd><dt>Buying costs</dt><dd>${money(p.purchase.costs || 0)}</dd>
      <dt>Cost base</dt><dd>${money(m.costBase)}</dd><dt>Settled</dt><dd>${date(p.purchase.date)}</dd></dl></section>`}
  </div>

  ${p.notes ? `<section class="card"><div class="card-title">Notes</div><p class="notes">${h(p.notes)}</p></section>` : ""}`;
}

export function cashflow(data) {
  const props = data.properties.filter((p) => !p.sold);
  const m = calc.portfolioMetrics(props);
  const rows = props.map((p) => {
    const pm = calc.propertyMetrics(p);
    return `<tr data-href="#/property/${encodeURIComponent(p.id)}"><td class="strong">${h(p.name)}</td>
      <td class="num">${money(pm.rent)}</td><td class="num">${money(-pm.expenses)}</td><td class="num">${money(-pm.interest)}</td><td class="num">${money(-pm.repayments)}</td>
      <td class="num ${tone(pm.cashFlow)}">${signedMoney(pm.cashFlow)}</td><td class="num ${tone(pm.cashFlow)}">${signedMoney(pm.cashFlow / 12)}</td><td class="num ${tone(pm.cashFlow)}">${signedMoney(pm.cashFlow / 52)}</td></tr>`;
  }).join("");
  return `
  <h1 class="page-title">Cash flow</h1>
  <section class="card">
    <div class="stat-grid">
      ${stat("Rental income", `${money(m.rent)}<small>/yr</small>`)}
      ${stat("Expenses", `${money(-m.expenses)}<small>/yr</small>`)}
      ${stat("Loan repayments", `${money(-m.repayments)}<small>/yr</small>`, `of which interest ${money(m.interest)}`)}
      ${stat("Net cash flow", `<span class="${tone(m.cashFlow)}">${signedMoney(m.cashFlow)}</span><small>/yr</small>`, `${signedMoney(m.cashFlow / 12)}/mo · ${signedMoney(m.cashFlow / 52)}/wk`)}
      ${stat("Gross yield", pct(m.grossYield, 2))}
      ${stat("Net yield", pct(m.netYield, 2), "Rent less expenses, before loan costs")}
    </div>
  </section>
  <section class="card">
    <div class="card-title">By property (annual unless noted)</div>
    <div class="table-wrap"><table class="table clickable">
      <thead><tr><th>Property</th><th class="num">Rent</th><th class="num">Expenses</th><th class="num">Interest</th><th class="num">Repayments</th><th class="num">Net</th><th class="num">/mo</th><th class="num">/wk</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td>Total</td><td class="num">${money(m.rent)}</td><td class="num">${money(-m.expenses)}</td><td class="num">${money(-m.interest)}</td><td class="num">${money(-m.repayments)}</td>
      <td class="num ${tone(m.cashFlow)}">${signedMoney(m.cashFlow)}</td><td class="num ${tone(m.cashFlow)}">${signedMoney(m.cashFlow / 12)}</td><td class="num ${tone(m.cashFlow)}">${signedMoney(m.cashFlow / 52)}</td></tr></tfoot>
    </table></div>
    <p class="muted small">Net = rent after vacancy − expenses − loan repayments (principal + interest). Pre-tax; excludes depreciation and negative gearing benefits. Interest is shown for reference and already included in repayments.</p>
  </section>`;
}

export function dataEditor(data, { setup = false } = {}) {
  return `
  <h1 class="page-title">${setup ? "Set up your data" : "Data"}</h1>
  <section class="card">
    <p class="muted">${setup
      ? "No <code>data.enc.json</code> was found. Edit the sample below, choose a password, then download the encrypted file and commit it to <code>site/data.enc.json</code> in your repo."
      : "Edit your portfolio JSON here, then download the new encrypted file and commit it to <code>site/data.enc.json</code>. Changes only apply to this browser tab until you commit the file."}</p>
    <textarea id="json-editor" spellcheck="false">${h(JSON.stringify(data, null, 2))}</textarea>
    <div id="editor-msg" class="msg"></div>
    <div class="form-row">
      <input id="enc-password" type="password" placeholder="Password for the encrypted file" autocomplete="new-password"/>
      <input id="enc-password2" type="password" placeholder="Confirm password" autocomplete="new-password"/>
    </div>
    <div class="btn-row">
      ${setup ? "" : `<button class="btn" id="btn-apply">Validate &amp; preview</button>`}
      <button class="btn primary" id="btn-download-enc">Download data.enc.json</button>
      <button class="btn ghost" id="btn-download-plain">Download plain data.json</button>
    </div>
  </section>
  <section class="card">
    <div class="card-title">Format</div>
    <p class="muted small">Dates are <code>YYYY-MM-DD</code>. Frequencies: <code>weekly</code>, <code>fortnightly</code>, <code>monthly</code>, <code>quarterly</code>, <code>annual</code>. Loan <code>rate</code> is a percentage (e.g. <code>6.19</code>). If a loan has no <code>repayment</code>, IO loans use interest and P&amp;I loans are amortised over <code>termYearsRemaining</code> (default 30). See the README for every field.</p>
  </section>`;
}
