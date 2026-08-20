import React, { useState } from "react";
import { fmtIDRShort } from "../lib/format";

/* Grouped / single bar chart */
export function Bars({ data, height = 170, color = "#0e7490", color2, fmt = fmtIDRShort }: {
  data: { label: string; value: number; value2?: number }[];
  height?: number; color?: string; color2?: string; fmt?: (n: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => Math.max(d.value, d.value2 ?? 0)));
  const W = 100 / data.length;
  return (
    <div className="relative">
      {hover !== null && data[hover] && (
        <div className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 rounded-lg border border-line bg-surface px-3 py-1.5 text-center shadow-lg">
          <p className="text-[10px] font-bold uppercase tracking-wide text-faint">{data[hover].label}</p>
          <p className="tabular font-display text-[13px] font-bold" style={{ color }}>{fmt(data[hover].value)}</p>
          {data[hover].value2 !== undefined && (
            <p className="tabular font-display text-[12px] font-bold" style={{ color: color2 || "#64748b" }}>{fmt(data[hover].value2!)}</p>
          )}
        </div>
      )}
      <svg viewBox={`0 0 100 ${height / 2.4}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1="0" x2="100" y1={(height / 2.4) * (1 - g)} y2={(height / 2.4) * (1 - g)} stroke="var(--sp-line)" strokeWidth="0.4" strokeDasharray="1.5 1.5" vectorEffect="non-scaling-stroke" />
        ))}
        {data.map((d, i) => {
          const h1 = (d.value / max) * 0.92;
          const h2 = d.value2 !== undefined ? (d.value2 / max) * 0.92 : 0;
          const bw = d.value2 !== undefined ? W * 0.26 : W * 0.44;
          const cx = i * W + W / 2;
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} className="cursor-pointer">
              <rect x={i * W} y="0" width={W} height={height / 2.4} fill={hover === i ? "var(--sp-surface2)" : "transparent"} />
              <rect className="anim-bar" x={cx - (d.value2 !== undefined ? bw + 0.6 : bw / 2)} y={(height / 2.4) * (1 - h1)} width={bw} height={(height / 2.4) * h1} rx="0.8" fill={color} style={{ animationDelay: `${i * 40}ms` }} />
              {d.value2 !== undefined && (
                <rect className="anim-bar" x={cx + 0.6} y={(height / 2.4) * (1 - h2)} width={bw} height={(height / 2.4) * h2} rx="0.8" fill={color2 || "#64748b"} style={{ animationDelay: `${i * 40 + 60}ms` }} />
              )}
            </g>
          );
        })}
      </svg>
      <div className="mt-1.5 flex">
        {data.map((d, i) => (
          <span key={i} className={`flex-1 text-center text-[10px] font-semibold ${hover === i ? "text-ink" : "text-faint"}`}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}

/* Area/line chart */
export function AreaLine({ points, labels, height = 150, color = "#178a4c", fmt = fmtIDRShort }: {
  points: number[]; labels: string[]; height?: number; color?: string; fmt?: (n: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...points);
  const min = Math.min(0, ...points);
  const range = max - min || 1;
  const H = 60;
  const x = (i: number) => (i / Math.max(1, points.length - 1)) * 100;
  const y = (v: number) => H - ((v - min) / range) * (H - 6) - 3;
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p)}`).join(" ");
  const area = `${path} L100,${H} L0,${H} Z`;
  return (
    <div className="relative">
      {hover !== null && points[hover] !== undefined && (
        <div className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 rounded-lg border border-line bg-surface px-3 py-1 text-center shadow-lg">
          <p className="text-[10px] font-bold uppercase tracking-wide text-faint">{labels[hover]}</p>
          <p className="tabular font-display text-[13px] font-bold" style={{ color }}>{fmt(points[hover])}</p>
        </div>
      )}
      <svg viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" className="w-full" style={{ height }} onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id={"grad-" + color.replace("#", "")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <line x1="0" x2="100" y1={y(0)} y2={y(0)} stroke="var(--sp-line)" strokeWidth="0.5" strokeDasharray="1.5 1.5" vectorEffect="non-scaling-stroke" />
        <path d={area} fill={`url(#grad-${color.replace("#", "")})`} />
        <path d={path} fill="none" stroke={color} strokeWidth="1.8" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p)} r={hover === i ? 2.4 : 1.3} fill={color} vectorEffect="non-scaling-stroke"
            onMouseEnter={() => setHover(i)} style={{ transition: "r .15s" }} />
        ))}
        {points.map((_, i) => (
          <rect key={"h" + i} x={x(i) - 100 / points.length / 2} y="0" width={100 / points.length} height={H} fill="transparent" onMouseEnter={() => setHover(i)} />
        ))}
      </svg>
      <div className="mt-1.5 flex">
        {labels.map((l, i) => (
          <span key={i} className={`flex-1 text-center text-[10px] font-semibold ${hover === i ? "text-ink" : "text-faint"}`}>{l}</span>
        ))}
      </div>
    </div>
  );
}

/* Donut */
export function Donut({ segments, size = 140, centerLabel, centerValue }: {
  segments: { label: string; value: number; color: string }[]; size?: number; centerLabel?: string; centerValue?: string;
}) {
  const total = Math.max(1, segments.reduce((a, b) => a + b.value, 0));
  const R = 15.9155;
  let acc = 0;
  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} viewBox="0 0 40 40" className="-rotate-90 shrink-0">
        <circle cx="20" cy="20" r={R} fill="none" stroke="var(--sp-line)" strokeWidth="5" />
        {segments.filter((s) => s.value > 0).map((sg, i) => {
          const frac = (sg.value / total) * 100;
          const off = acc;
          acc += frac;
          return (
            <circle key={i} cx="20" cy="20" r={R} fill="none" stroke={sg.color} strokeWidth="5"
              strokeDasharray={`${frac} ${100 - frac}`} strokeDashoffset={-off} strokeLinecap="butt"
              style={{ transition: "stroke-dasharray .5s ease" }} />
          );
        })}
      </svg>
      <div className="min-w-0">
        {centerValue && <p className="tabular font-display text-[20px] font-bold leading-tight">{centerValue}</p>}
        {centerLabel && <p className="text-[11px] font-semibold text-faint">{centerLabel}</p>}
        <div className="mt-2 space-y-1">
          {segments.filter((sg) => sg.value > 0).slice(0, 5).map((sg, i) => (
            <div key={i} className="flex items-center gap-2 text-[11.5px]">
              <span className="h-2 w-2 rounded-sm" style={{ background: sg.color }} />
              <span className="text-muted">{sg.label}</span>
              <span className="tabular ml-auto font-bold">{sg.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* Horizontal bar rows (pipeline) */
export function HBars({ items }: { items: { label: string; value: number; color: string; onClick?: () => void }[] }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <button key={i} onClick={it.onClick} className="group flex w-full items-center gap-3 text-left">
          <span className="w-32 shrink-0 truncate text-[11.5px] font-semibold text-muted group-hover:text-ink">{it.label}</span>
          <span className="relative h-4 flex-1 overflow-hidden rounded-md bg-surface2">
            <span className="absolute inset-y-0 left-0 rounded-md transition-all duration-500 group-hover:brightness-110" style={{ width: `${(it.value / max) * 100}%`, background: it.color, minWidth: it.value > 0 ? 6 : 0 }} />
          </span>
          <span className="tabular w-7 text-right font-display text-[12px] font-bold">{it.value}</span>
        </button>
      ))}
    </div>
  );
}
