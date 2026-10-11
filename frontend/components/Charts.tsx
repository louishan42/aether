"use client";

import { CHART_COLORS } from "../lib/chartColors";

export type Slice = { label: string; value: number };

export function PieChart({ title, slices }: { title: string; slices: Slice[] }) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const usable = total > 0 ? slices : [{ label: "None", value: 1 }];
  const sum = usable.reduce((value, slice) => value + slice.value, 0);
  let angle = -Math.PI / 2;
  const cx = 54;
  const cy = 54;
  const r = 42;
  const paths = usable.map((slice, index) => {
    const sweep = (slice.value / sum) * Math.PI * 2;
    const start = angle;
    angle += sweep;
    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(angle);
    const y2 = cy + r * Math.sin(angle);
    const large = sweep > Math.PI ? 1 : 0;
    const d =
      sweep >= Math.PI * 2 - 0.001
        ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`
        : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    return { d, color: CHART_COLORS[index % CHART_COLORS.length] };
  });

  return (
    <div className="panel p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{title}</p>
      <div className="mt-4 flex items-center gap-4">
        <svg viewBox="0 0 108 108" className="h-28 w-28 shrink-0" aria-hidden>
          {paths.map((path, index) => (
            <path key={index} d={path.d} fill={path.color} />
          ))}
          <circle cx={cx} cy={cy} r="18" fill="#ffffff" />
        </svg>
        <ul className="space-y-1 text-sm">
          {slices.map((slice, index) => (
            <li key={slice.label} className="flex justify-between gap-3">
              <span>
                <span
                  className="mr-2 inline-block h-2 w-2 rounded-full"
                  style={{ background: CHART_COLORS[index % CHART_COLORS.length] }}
                />
                {slice.label}
              </span>
              <span className="tabular-nums">{slice.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function BarChart({ title, slices }: { title: string; slices: Slice[] }) {
  const max = Math.max(1, ...slices.map((slice) => slice.value));
  return (
    <div className="panel p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{title}</p>
      <div className="mt-4 space-y-2">
        {slices.map((slice, index) => (
          <div key={slice.label}>
            <div className="flex justify-between text-sm">
              <span>{slice.label}</span>
              <span className="tabular-nums">{slice.value}</span>
            </div>
            <div className="bar-track mt-1">
              <div
                className="h-full"
                style={{ width: `${(slice.value / max) * 100}%`, background: CHART_COLORS[index % CHART_COLORS.length] }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
