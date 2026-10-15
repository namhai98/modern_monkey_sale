import { useEffect, useId, useRef, useState } from 'react';
import { useLocale } from '../../context/LocaleContext';
import { tdCls, tdNumCls, thCls, thNumCls, trCls } from './ui';

/* The dashboard's four charts — each a different form for a different job:

     AreaChart     trend over time        revenue per day, 30 days
     ColumnChart   counts over time       orders per day, 14 days
     StackedBar    part-to-whole          the order-status mix
     BarList       compare magnitudes     revenue per category

   Plain SVG/HTML, no chart library. Marks follow the dataviz spec: 2px lines,
   a 10% area wash, bars at most 24px thick with 4px rounded data-ends and a
   square baseline, a 2px surface gap between stacked segments, hairline
   gridlines, text in text tokens (never the series colour). Colours are the
   validated --viz-* tokens in index.css. Every chart has a hover/focus
   tooltip, and every card can swap to a table — the accessible twin that
   carries every value without hovering. */

const compactUsd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 });
export const fmtCompactUsd = (n) => compactUsd.format(n || 0);

// Round axis ticks: 0 and three or four clean steps (1, 2, 2.5, 5 × 10^k).
function niceTicks(max, count = 4) {
  if (!max || max <= 0) return [0, 1];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
  const ticks = [];
  for (let v = 0; v < max + step * 0.001; v += step) ticks.push(v);
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
  return ticks;
}

function useWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return undefined;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

/* ── Frame ─────────────────────────────────────────────────────────────── */

// A chart card: title, subtitle, and a Chart / Table switch.
export function ChartCard({ title, subtitle, table, children, className = '' }) {
  const { t } = useLocale();
  const [asTable, setAsTable] = useState(false);
  return (
    <section className={`admin-card min-w-0 p-4 sm:p-6 ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
        </div>
        {table && (
          <button
            type="button"
            aria-pressed={asTable}
            onClick={() => setAsTable((v) => !v)}
            className="shrink-0 rounded-lg border border-admin-field-border px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:bg-admin-hover hover:text-foreground"
          >
            {asTable ? t('admin.chart.showChart') : t('admin.chart.showTable')}
          </button>
        )}
      </div>
      {asTable ? <div className="max-h-72 overflow-auto rounded-lg border border-line [&_thead]:bg-admin-thead">{table}</div> : children}
    </section>
  );
}

// The table twin: header cells, then rows of cells (strings or numbers).
export function ChartTable({ head, rows, numeric = [] }) {
  return (
    <table className="w-full text-sm">
      <thead className="sticky top-0">
        <tr className={trCls}>
          {head.map((h, i) => (
            <th key={h} className={numeric.includes(i) ? thNumCls : thCls}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r[0]} className={trCls}>
            {r.map((c, i) => (
              <td key={i} className={`${numeric.includes(i) ? tdNumCls : tdCls} py-2`}>{c}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// The hover readout: the value leads, the label follows.
function Tooltip({ x, y, width, value, label, swatch }) {
  // Keep the box inside the chart: flip its anchor near either edge.
  const anchor = x < 70 ? '0%' : x > width - 70 ? '-100%' : '-50%';
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 whitespace-nowrap rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-lg"
      style={{ left: x, top: y, transform: `translate(${anchor}, calc(-100% - 10px))` }}
    >
      <div className="font-semibold tabular-nums text-foreground">{value}</div>
      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
        {swatch && <span aria-hidden="true" className="h-0.5 w-3 rounded-full" style={{ background: swatch }} />}
        {label}
      </div>
    </div>
  );
}

const M = { top: 12, right: 12, bottom: 26, left: 52 };

function YAxis({ ticks, y, width, format }) {
  return ticks.map((v) => (
    <g key={v}>
      <line x1={M.left} x2={width - M.right} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeWidth="1" />
      <text x={M.left - 8} y={y(v)} dy="0.32em" textAnchor="end" className="fill-muted text-[11px] tabular-nums">
        {format(v)}
      </text>
    </g>
  ));
}

/* ── Area: trend over time ─────────────────────────────────────────────── */

export function AreaChart({ points, format, valueFormat = format, height = 230, label }) {
  const [ref, width] = useWidth();
  const [active, setActive] = useState(null);
  const gradId = useId();
  const n = points.length;
  const max = Math.max(...points.map((p) => p.value), 0);
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1] || 1;
  const plotW = Math.max(0, width - M.left - M.right);
  const plotH = height - M.top - M.bottom;
  const x = (i) => M.left + (n > 1 ? (i * plotW) / (n - 1) : plotW / 2);
  const y = (v) => M.top + plotH - (v / top) * plotH;
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.value)}`).join(' ');
  const area = `${line} L${x(n - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  // Labels sit at least ~56px apart and count back from today, so the
  // last day is always named and never crowds its neighbour.
  const every = Math.max(1, Math.ceil((n - 1) / Math.max(1, Math.floor(plotW / 56))));

  // The crosshair finds the X: the nearest day to the pointer.
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - r.left - M.left) / (plotW || 1)) * (n - 1));
    setActive(Math.min(n - 1, Math.max(0, i)));
  };
  const onKey = (e) => {
    if (e.key === 'ArrowRight') setActive((a) => Math.min(n - 1, (a ?? n - 1) + 1));
    else if (e.key === 'ArrowLeft') setActive((a) => Math.max(0, (a ?? n - 1) - 1));
    else return;
    e.preventDefault();
  };
  const a = active != null ? points[active] : null;

  return (
    <div ref={ref} className="relative">
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={label}
          tabIndex={0}
          onPointerMove={onMove}
          onPointerLeave={() => setActive(null)}
          onFocus={() => setActive(n - 1)}
          onBlur={() => setActive(null)}
          onKeyDown={onKey}
          className="block touch-none outline-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-gold"
        >
          <defs>
            <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--viz-gold)" stopOpacity="0.16" />
              <stop offset="100%" stopColor="var(--viz-gold)" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <YAxis ticks={ticks} y={y} width={width} format={format} />
          <path d={area} fill={`url(#${gradId})`} />
          <path d={line} fill="none" stroke="var(--viz-gold)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {points.map((p, i) =>
            (n - 1 - i) % every === 0 ? (
              <text key={p.key} x={x(i)} y={height - 6} textAnchor={i === n - 1 ? 'end' : i === 0 ? 'start' : 'middle'} className="fill-muted text-[11px]">
                {p.label}
              </text>
            ) : null
          )}
          {a && (
            <g>
              <line x1={x(active)} x2={x(active)} y1={M.top} y2={M.top + plotH} stroke="var(--muted-color)" strokeWidth="1" />
              <circle cx={x(active)} cy={y(a.value)} r="4.5" fill="var(--viz-gold)" stroke="var(--surface)" strokeWidth="2" />
            </g>
          )}
          {!a && n > 0 && <circle cx={x(n - 1)} cy={y(points[n - 1].value)} r="4" fill="var(--viz-gold)" stroke="var(--surface)" strokeWidth="2" />}
        </svg>
      )}
      {a && <Tooltip x={x(active)} y={y(a.value)} width={width} value={valueFormat(a.value)} label={a.long || a.label} swatch="var(--viz-gold)" />}
    </div>
  );
}

/* ── Columns: counts over time ─────────────────────────────────────────── */

// A column with a 4px rounded data-end and a square baseline.
function columnPath(x, y, w, h) {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}

export function ColumnChart({ points, format = (v) => String(v), height = 230, label }) {
  const [ref, width] = useWidth();
  const [active, setActive] = useState(null);
  const n = points.length;
  const max = Math.max(...points.map((p) => p.value), 0);
  const ticks = niceTicks(Math.max(max, 4)).filter((v) => Number.isInteger(v));
  const top = ticks[ticks.length - 1] || 1;
  const plotW = Math.max(0, width - M.left - M.right);
  const plotH = height - M.top - M.bottom;
  const band = n ? plotW / n : 0;
  const barW = Math.min(24, band * 0.6);
  const y = (v) => M.top + plotH - (v / top) * plotH;
  const every = Math.max(1, Math.ceil(52 / (band || 1)));
  const peak = points.reduce((best, p, i) => (p.value > (points[best]?.value ?? -1) ? i : best), 0);
  const a = active != null ? points[active] : null;
  const cx = (i) => M.left + band * i + band / 2;

  return (
    <div ref={ref} className="relative">
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={label} className="block">
          <YAxis ticks={ticks} y={y} width={width} format={format} />
          {points.map((p, i) => {
            const h = Math.max(0, y(0) - y(p.value));
            return (
              <g key={p.key}>
                {p.value > 0 && (
                  <path
                    d={columnPath(cx(i) - barW / 2, y(p.value), barW, h)}
                    fill="var(--viz-gold)"
                    opacity={active == null || active === i ? 1 : 0.55}
                    className="transition-opacity"
                  />
                )}
                {/* The hit target is the whole band, not the painted pixels. */}
                <rect
                  x={M.left + band * i}
                  y={M.top}
                  width={band}
                  height={plotH}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${p.long || p.label}: ${format(p.value)}`}
                  onPointerEnter={() => setActive(i)}
                  onPointerLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  className="outline-none"
                />
                {(n - 1 - i) % every === 0 && (
                  <text x={cx(i)} y={height - 6} textAnchor="middle" className="pointer-events-none fill-muted text-[11px]">
                    {p.label}
                  </text>
                )}
              </g>
            );
          })}
          {/* One direct label: the busiest day, on its cap. */}
          {max > 0 && active == null && (
            <text x={cx(peak)} y={y(points[peak].value) - 6} textAnchor="middle" className="pointer-events-none fill-foreground text-[11px] font-semibold tabular-nums">
              {format(points[peak].value)}
            </text>
          )}
        </svg>
      )}
      {a && <Tooltip x={cx(active)} y={y(a.value)} width={width} value={format(a.value)} label={a.long || a.label} swatch="var(--viz-gold)" />}
    </div>
  );
}

/* ── Stacked bar: part-to-whole ────────────────────────────────────────── */

// One 24px bar split by share, a 2px surface gap between segments, rounded
// only at its two outer ends; the legend below names every part with its
// count and share, so identity is never colour alone.
export function StackedBar({ segments, format = (v) => String(v), label }) {
  const [active, setActive] = useState(null);
  const [ref, width] = useWidth();
  const total = segments.reduce((n, s) => n + s.value, 0);
  const shown = segments.filter((s) => s.value > 0);
  const pct = (v) => (total ? Math.round((v / total) * 1000) / 10 : 0);
  let offset = 0;
  const gap = 2;
  const usable = Math.max(0, width - gap * Math.max(0, shown.length - 1));
  const a = shown.find((s) => s.key === active);

  return (
    <div>
      <div ref={ref} className="relative">
        {width > 0 && (
          <svg width={width} height={24} role="img" aria-label={label} className="block">
            <defs>
              <clipPath id="stack-round">
                <rect x="0" y="0" width={width} height="24" rx="4" />
              </clipPath>
            </defs>
            <g clipPath="url(#stack-round)">
              {shown.map((s) => {
                const w = total ? (s.value / total) * usable : 0;
                const x0 = offset;
                offset += w + gap;
                return (
                  <rect
                    key={s.key}
                    x={x0}
                    y="0"
                    width={Math.max(w, 1)}
                    height="24"
                    fill={s.color}
                    opacity={active == null || active === s.key ? 1 : 0.5}
                    tabIndex={0}
                    aria-label={`${s.label}: ${format(s.value)} (${pct(s.value)}%)`}
                    onPointerEnter={() => setActive(s.key)}
                    onPointerLeave={() => setActive(null)}
                    onFocus={() => setActive(s.key)}
                    onBlur={() => setActive(null)}
                    className="outline-none transition-opacity"
                    data-x={x0 + w / 2}
                  />
                );
              })}
            </g>
          </svg>
        )}
        {a && (() => {
          let o = 0;
          for (const s of shown) {
            const w = (s.value / total) * usable;
            if (s.key === a.key) return <Tooltip x={o + w / 2} y={0} width={width} value={`${format(a.value)} · ${pct(a.value)}%`} label={a.label} swatch={a.color} />;
            o += w + gap;
          }
          return null;
        })()}
      </div>
      <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-3">
        {segments.map((s) => (
          <li
            key={s.key}
            onPointerEnter={() => s.value > 0 && setActive(s.key)}
            onPointerLeave={() => setActive(null)}
            className={`flex items-center gap-2 text-sm transition-opacity ${active == null || active === s.key ? '' : 'opacity-60'}`}
          >
            <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.color }} />
            <span className="text-foreground">{s.label}</span>
            <span className="shrink-0 tabular-nums">
              <span className="font-semibold text-foreground">{format(s.value)}</span>
              <span className="ml-1.5 text-muted">{pct(s.value)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Bar list: compare magnitudes ──────────────────────────────────────── */

// Horizontal bars in one hue (the categories are names, not a scale), sorted,
// each with its value at the tip; the row is the hit target.
export function BarList({ rows, format, label }) {
  const [active, setActive] = useState(null);
  const max = Math.max(...rows.map((r) => r.value), 0) || 1;
  return (
    <ul role="list" aria-label={label} className="space-y-3">
      {rows.map((r) => (
        <li
          key={r.key}
          tabIndex={0}
          aria-label={`${r.label}: ${format(r.value)}${r.sub ? `, ${r.sub}` : ''}`}
          onPointerEnter={() => setActive(r.key)}
          onPointerLeave={() => setActive(null)}
          onFocus={() => setActive(r.key)}
          onBlur={() => setActive(null)}
          className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)] items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-gold sm:grid-cols-[minmax(0,9rem)_minmax(0,1fr)]"
        >
          <span className="truncate text-sm text-foreground">{r.label}</span>
          <span className="flex min-w-0 items-center gap-2">
            <span
              className="h-4 rounded-r-[4px] transition-opacity"
              style={{
                width: `${Math.max(2, (r.value / max) * 82)}%`,
                background: 'var(--viz-gold)',
                opacity: active == null || active === r.key ? 1 : 0.55,
              }}
            />
            <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{format(r.value)}</span>
            {active === r.key && r.sub && <span className="shrink-0 text-xs text-muted">{r.sub}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}
