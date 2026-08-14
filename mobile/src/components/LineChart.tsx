import { useState } from 'react'
import { View } from 'react-native'
import Svg, { Line, Path, Text as SvgText } from 'react-native-svg'
import { c, f } from '../theme'

interface LineChartProps {
  /** X positions (timestamps, minutes, indices...), ascending. */
  xs: number[]
  values: number[]
  formatX: (x: number) => string
  /** Y tick labels ("Oracle 5", "62%"). */
  formatYTick: (y: number) => string
  /** Y grid-line positions; a padded domain-derived set when omitted. */
  yTicks?: number[]
  /** [min, max] for the y axis; padded data extent when omitted. */
  yDomain?: [number, number]
  height?: number
  color?: string
}

const PAD = { l: 62, r: 10, t: 10, b: 24 }

/** Static noir line chart — the mobile sibling of the website's LineChart. */
export default function LineChart({
  xs,
  values,
  formatX,
  formatYTick,
  yTicks,
  yDomain,
  height = 180,
  color = c.brass,
}: LineChartProps) {
  const [width, setWidth] = useState(0)

  if (xs.length < 2) return null

  const xMin = xs[0]
  const xMax = xs[xs.length - 1]
  let [vMin, vMax] = yDomain ?? [Math.min(...values), Math.max(...values)]
  if (!yDomain) {
    const pad = (vMax - vMin || Math.abs(vMax) || 1) * 0.08
    vMin -= pad
    vMax += pad
  }
  if (vMax === vMin) vMax = vMin + 1
  if (xMax === xMin) return null

  const W = width
  const H = height
  const x = (v: number) => PAD.l + ((v - xMin) / (xMax - xMin)) * (W - PAD.l - PAD.r)
  const y = (v: number) => PAD.t + (1 - (v - vMin) / (vMax - vMin)) * (H - PAD.t - PAD.b)

  const gridYs = yTicks ?? [0.25, 0.5, 0.75, 1].map((fr) => vMin + fr * (vMax - vMin))

  const xTickCount = 4
  const xTicks = Array.from(
    { length: xTickCount },
    (_, i) => xMin + ((xMax - xMin) * i) / (xTickCount - 1),
  )

  const path = values
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${x(xs[i]).toFixed(1)},${y(v).toFixed(1)}`)
    .join(' ')

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <Svg width={W} height={H}>
          {gridYs.map((v, i) => (
            <Line
              key={`g${i}`}
              x1={PAD.l}
              x2={W - PAD.r}
              y1={y(v)}
              y2={y(v)}
              stroke={c.ruleFaint}
              strokeWidth={1}
            />
          ))}
          {gridYs.map((v, i) => (
            <SvgText
              key={`gl${i}`}
              x={PAD.l - 7}
              y={y(v) + 3}
              textAnchor="end"
              fontSize={9}
              fontFamily={f.mono}
              fill={c.inkFaint}
            >
              {formatYTick(v)}
            </SvgText>
          ))}
          {xTicks.map((t, i) => (
            <SvgText
              key={`x${i}`}
              x={x(t)}
              y={H - 8}
              textAnchor={i === 0 ? 'start' : i === xTickCount - 1 ? 'end' : 'middle'}
              fontSize={9}
              fontFamily={f.mono}
              fill={c.inkFaint}
            >
              {formatX(t)}
            </SvgText>
          ))}
          <Line
            x1={PAD.l}
            x2={W - PAD.r}
            y1={H - PAD.b}
            y2={H - PAD.b}
            stroke={c.rule}
            strokeWidth={1}
          />
          <Path d={path} fill="none" stroke={color} strokeWidth={2} />
        </Svg>
      )}
    </View>
  )
}
