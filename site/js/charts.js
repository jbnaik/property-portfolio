// Minimal dependency-free SVG charts.
import { moneyCompact, escapeHtml } from "./format.js";

export function lineChart(series, { height = 240, labels = [] } = {}) {
  const width = 720;
  const pad = { l: 64, r: 16, t: 16, b: 28 };
  const points = series.flatMap((s) => s.points);
  if (points.length < 2) return `<div class="empty">Not enough history to chart yet.</div>`;
  const xs = points.map((p) => new Date(p.date).getTime());
  const ys = points.map((p) => p.value);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMax = Math.max(...ys) * 1.05 || 1;
  const yMin = Math.min(0, ...ys);
  const x = (d) => pad.l + ((new Date(d).getTime() - xMin) / (xMax - xMin || 1)) * (width - pad.l - pad.r);
  const y = (v) => pad.t + (1 - (v - yMin) / (yMax - yMin || 1)) * (height - pad.t - pad.b);

  const ticks = 4;
  let grid = "";
  for (let i = 0; i <= ticks; i++) {
    const v = yMin + ((yMax - yMin) * i) / ticks;
    grid += `<line x1="${pad.l}" x2="${width - pad.r}" y1="${y(v)}" y2="${y(v)}" class="grid"/>`;
    grid += `<text x="${pad.l - 8}" y="${y(v) + 4}" text-anchor="end" class="axis">${moneyCompact(v)}</text>`;
  }
  const y0 = new Date(xMin).getFullYear(), y1 = new Date(xMax).getFullYear();
  const step = Math.max(1, Math.ceil((y1 - y0) / 8));
  for (let yr = y0 + 1; yr <= y1; yr += step) {
    const d = `${yr}-01-01`;
    grid += `<text x="${x(d)}" y="${height - 8}" text-anchor="middle" class="axis">${yr}</text>`;
  }

  const paths = series.map((s, i) => {
    const pts = s.points.map((p) => `${x(p.date).toFixed(1)},${y(p.value).toFixed(1)}`);
    const line = `<polyline points="${pts.join(" ")}" class="line s${i}" ${s.dashed ? 'stroke-dasharray="5 5"' : ""}/>`;
    const area = s.fill
      ? `<polygon points="${x(s.points[0].date)},${y(yMin)} ${pts.join(" ")} ${x(s.points[s.points.length - 1].date)},${y(yMin)}" class="area s${i}"/>`
      : "";
    const dots = s.dots ? s.points.map((p) => `<circle cx="${x(p.date)}" cy="${y(p.value)}" r="3" class="dot s${i}"><title>${p.date}: ${moneyCompact(p.value)}</title></circle>`).join("") : "";
    return area + line + dots;
  }).join("");

  const legend = series.map((s, i) => `<span class="legend-item"><i class="swatch s${i}"></i>${escapeHtml(s.name)}</span>`).join("");
  return `<svg viewBox="0 0 ${width} ${height}" class="chart" role="img">${grid}${paths}</svg><div class="legend">${legend}${labels.join("")}</div>`;
}

export function donutChart(items, { centerLabel = "", centerValue = "" } = {}) {
  const total = items.reduce((s, i) => s + Math.max(0, i.value), 0);
  if (!total) return `<div class="empty">No data</div>`;
  const r = 70, c = 2 * Math.PI * r;
  let offset = 0;
  const arcs = items.map((it, i) => {
    const len = (Math.max(0, it.value) / total) * c;
    const arc = `<circle r="${r}" cx="90" cy="90" class="arc s${i % 6}" stroke-dasharray="${len} ${c - len}" stroke-dashoffset="${-offset}"><title>${escapeHtml(it.label)}: ${moneyCompact(it.value)}</title></circle>`;
    offset += len;
    return arc;
  }).join("");
  const legend = items.map((it, i) => `<li><i class="swatch s${i % 6}"></i><span>${escapeHtml(it.label)}</span><b>${((it.value / total) * 100).toFixed(0)}%</b></li>`).join("");
  return `<div class="donut-wrap"><svg viewBox="0 0 180 180" class="donut"><g transform="rotate(-90 90 90)">${arcs}</g>
    <text x="90" y="84" text-anchor="middle" class="donut-label">${escapeHtml(centerLabel)}</text>
    <text x="90" y="106" text-anchor="middle" class="donut-value">${escapeHtml(centerValue)}</text></svg>
    <ul class="donut-legend">${legend}</ul></div>`;
}

export function bar(fraction, cls = "") {
  const w = Math.max(0, Math.min(1, fraction)) * 100;
  return `<div class="bar ${cls}"><span style="width:${w.toFixed(1)}%"></span></div>`;
}
