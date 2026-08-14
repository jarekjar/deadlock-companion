import { useState } from 'react'
import './charts.css'

export interface LineSeries {
  label: string
  color: string
  /** Aligned to the shared `xs` array; null leaves a gap in the line. */
  values: (number | null)[]
}

interface LineChartProps {
  /** Shared x positions (timestamps, minutes, indices...), ascending. */
  xs: number[]
  series: LineSeries[]
  formatX: (x: number) => string
  formatY: (y: number) => string
  /** Y grid-line positions; a padded domain-derived set when omitted. */
  yTicks?: number[]
  /** Y tick labels; defaults to formatY. */
  formatYTick?: (y: number) => string
  /** [min, max] for the y axis; padded data extent when omitted. */
  yDomain?: [number, number]
  /** Extra tooltip lines under the per-series values (e.g. a rank delta). */
  tooltipExtra?: (index: number) => string[]
  ariaLabel: string
  height?: number
  /** Trailing legend note, e.g. "rank after each ranked match". */
  legendNote?: string
}

const W = 800
const PAD = { l: 74, r: 18, t: 14, b: 30 }

/**
 * The shared noir line chart: same look and hover behavior as the match
 * page's souls race, generalized for rank history, trends, and item timing.
 */
export default function LineChart({
  xs,
  series,
  formatX,
  formatY,
  yTicks,
  formatYTick,
  yDomain,
  tooltipExtra,
  ariaLabel,
  height = 240,
  legendNote,
}: LineChartProps) {
  const H = height
  const [hover, setHover] = useState<{ index: number; px: number; py: number } | null>(null)

  if (xs.length < 2) return null

  const xMin = xs[0]
  const xMax = xs[xs.length - 1]
  const allValues = series.flatMap((s) => s.values.filter((v): v is number => v !== null))
  if (allValues.length === 0 || xMax === xMin) return null

  let [vMin, vMax] = yDomain ?? [Math.min(...allValues), Math.max(...allValues)]
  if (!yDomain) {
    const pad = (vMax - vMin || Math.abs(vMax) || 1) * 0.08
    vMin -= pad
    vMax += pad
  }
  if (vMax === vMin) vMax = vMin + 1

  const x = (v: number) => PAD.l + ((v - xMin) / (xMax - xMin)) * (W - PAD.l - PAD.r)
  const y = (v: number) => PAD.t + (1 - (v - vMin) / (vMax - vMin)) * (H - PAD.t - PAD.b)

  const gridYs =
    yTicks ?? [0.25, 0.5, 0.75, 1].map((f) => vMin + f * (vMax - vMin))
  const tickLabel = formatYTick ?? formatY

  // ~5 x labels, always including the ends
  const xTickCount = 5
  const xTicks = Array.from(
    { length: xTickCount },
    (_, i) => xMin + ((xMax - xMin) * i) / (xTickCount - 1),
  )

  const path = (values: (number | null)[]) => {
    let d = ''
    let pen = false
    values.forEach((v, i) => {
      if (v === null) {
        pen = false
        return
      }
      d += `${pen ? 'L' : 'M'}${x(xs[i]).toFixed(1)},${y(v).toFixed(1)} `
      pen = true
    })
    return d.trim()
  }

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const svgX = ((e.clientX - rect.left) / rect.width) * W
    const t = xMin + ((svgX - PAD.l) / (W - PAD.l - PAD.r)) * (xMax - xMin)
    let index = 0
    for (let i = 1; i < xs.length; i++) {
      if (Math.abs(xs[i] - t) < Math.abs(xs[index] - t)) index = i
    }
    setHover({
      index,
      px: ((e.clientX - rect.left) / rect.width) * 100,
      py: ((e.clientY - rect.top) / rect.height) * 100,
    })
  }

  const hoverRows = hover
    ? series.flatMap((s) => {
        const v = s.values[hover.index]
        return v === null ? [] : [{ label: s.label, color: s.color, value: formatY(v) }]
      })
    : []

  return (
    <div className="chart-panel">
      <div className="chart-legend">
        {series.map((s) => (
          <span key={s.label}>
            <span className="swatch" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
        {legendNote && <span>· {legendNote}</span>}
      </div>
      <div className="chart-wrap">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={ariaLabel}
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        >
          {gridYs.map((v) => (
            <g key={v}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="#2a2114" />
              <text
                x={PAD.l - 8}
                y={y(v) + 3}
                textAnchor="end"
                fontSize="10"
                fill="#7c6f58"
                fontFamily="IBM Plex Mono, monospace"
              >
                {tickLabel(v)}
              </text>
            </g>
          ))}
          {xTicks.map((t, i) => (
            <text
              key={i}
              x={x(t)}
              y={H - 10}
              textAnchor={i === 0 ? 'start' : i === xTickCount - 1 ? 'end' : 'middle'}
              fontSize="10"
              fill="#7c6f58"
              fontFamily="IBM Plex Mono, monospace"
            >
              {formatX(t)}
            </text>
          ))}
          <line
            x1={PAD.l}
            x2={W - PAD.r}
            y1={H - PAD.b}
            y2={H - PAD.b}
            stroke="#3b2f1e"
          />

          {series.map((s) => (
            <path key={s.label} d={path(s.values)} fill="none" stroke={s.color} strokeWidth="2" />
          ))}

          {hover && (
            <g>
              <line
                x1={x(xs[hover.index])}
                x2={x(xs[hover.index])}
                y1={PAD.t}
                y2={H - PAD.b}
                stroke="#7c6f58"
                strokeDasharray="3 3"
              />
              {series.map((s) => {
                const v = s.values[hover.index]
                return v === null ? null : (
                  <circle
                    key={s.label}
                    cx={x(xs[hover.index])}
                    cy={y(v)}
                    r="4"
                    fill={s.color}
                    stroke="#17110b"
                    strokeWidth="2"
                  />
                )
              })}
            </g>
          )}
        </svg>
        {hover && hoverRows.length > 0 && (
          <div
            className="chart-tooltip"
            style={{
              left: `${Math.min(hover.px, 72)}%`,
              top: `${Math.max(hover.py - 12, 2)}%`,
            }}
          >
            <div className="tip-time">{formatX(xs[hover.index])}</div>
            {hoverRows.map((row) => (
              <div key={row.label} className="tip-row">
                <span className="swatch" style={{ background: row.color }} />
                <span>{row.label}</span>
                <span>{row.value}</span>
              </div>
            ))}
            {tooltipExtra?.(hover.index).map((line) => (
              <div key={line} className="tip-row">
                <span>{line}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
