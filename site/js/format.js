const aud = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat("en-AU", { notation: "compact", maximumFractionDigits: 1 });

export function money(n) {
  const s = aud.format(Math.round(n || 0)).replace("$", "A$");
  return s;
}

export function moneyCompact(n) {
  return (n < 0 ? "-A$" : "A$") + compact.format(Math.abs(n || 0));
}

export function signedMoney(n) {
  return (n > 0 ? "+" : "") + money(n);
}

export function pct(n, digits = 1) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "–";
  return `${(n * 100).toFixed(digits)}%`;
}

export function signedPct(n, digits = 1) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "–";
  return (n > 0 ? "+" : "") + pct(n, digits);
}

export function date(iso) {
  if (!iso) return "–";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
