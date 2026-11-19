'use client'

import { useId, useState, type PointerEvent } from 'react'

import { monotonePath, type Pt, type Series } from '@/shared/lib/chart'
import { clockText, spansOverDay } from '@/shared/lib/time-range'
import { useWidth } from '@/shared/lib/use-width'

// 여러 시계열 선 그래프. 모양은 레퍼런스(이용 통계 시안)와 같다: 곡선, 아래로 옅어지는 면, 왼쪽이 옅은 선,
// 세로 보조선, 강조되는 시각 눈금, 속이 빈 점, 툴팁 카드. 세로축 글자는 두지 않고 값은 툴팁과 표로 본다.
// 색은 --series-1 … 8 을 시계열 순서대로 쓴다(순위가 아니라 이름 순서라 새로 받아도 색이 바뀌지 않는다).

/** 재기 전 폭. 실제로는 칸 폭을 재서 viewBox로 쓴다(축 글자가 12px로 보이게) */
const DEFAULT_W = 640
const H = 220
const PAD = { top: 16, right: 12, bottom: 32, left: 12 }
/** 선으로 그리는 시계열 수. 나머지는 표에만 남긴다(9번째 색을 만들지 않는다) */
export const MAX_LINES = 8
const TICKS = 5

export const seriesColor = (i: number) => `var(--series-${(i % MAX_LINES) + 1})`

export function MultiLineChart({
  title,
  series,
  format,
  legend = true,
  highlight = null,
}: {
  title: string
  series: Series[]
  format: (v: number) => string
  /** 그래프 아래 범례. 옆에 값 표가 있으면 표가 범례를 맡으니 끈다 */
  legend?: boolean
  /** 강조할 시계열 순서. 나머지 선은 옅게 그려 겹친 선 사이에서 하나를 따라 볼 수 있다 */
  highlight?: number | null
}) {
  const id = useId().replace(/:/g, '')
  const { ref: boxRef, width: W } = useWidth<HTMLDivElement>(DEFAULT_W)
  const [hover, setHover] = useState<number | null>(null)
  const lines = series.slice(0, MAX_LINES)
  // 선이 많으면 아래 면이 겹쳐 탁해지므로 면은 세 줄까지만 칠한다
  const filled = lines.length <= 3
  const dim = (si: number) => (highlight !== null && highlight !== si ? 0.15 : 1)
  const times = [...new Set(lines.flatMap((s) => s.points.map(([t]) => t)))].sort((a, b) => a - b)
  // 24시간이 넘는 그래프는 시각에 날짜를 붙인다
  const hhmm = (s: number) => clockText(s, spansOverDay(times.map((x) => [x, null] as const)))
  const values = lines
    .flatMap((s) => s.points.map(([, v]) => v))
    .filter((v): v is number => v !== null)
  const t0 = times[0]
  const t1 = times[times.length - 1]
  if (t0 === undefined || t1 === undefined || values.length === 0) return null

  const top = Math.max(...values, 0)
  const bottom = Math.min(...values, 0)
  const hi = top === bottom ? top + 1 : top + (top - bottom) * 0.08
  const baseY = H - PAD.bottom
  const x = (t: number) => PAD.left + ((t - t0) / (t1 - t0 || 1)) * (W - PAD.left - PAD.right)
  const y = (v: number) => PAD.top + ((hi - v) / (hi - bottom || 1)) * (baseY - PAD.top)

  const segmentsOf = (s: Series) => {
    const out: Pt[][] = []
    let run: Pt[] = []
    for (const [t, v] of s.points) {
      if (v === null) {
        if (run.length) out.push(run)
        run = []
      } else {
        run.push({ x: x(t), y: y(v) })
      }
    }
    if (run.length) out.push(run)
    return out
  }

  const xTicks = Array.from(
    { length: TICKS },
    (_, i) => times[Math.round((i * (times.length - 1)) / (TICKS - 1))]!,
  )
  const hoverT = hover === null ? null : times[hover]
  // 마우스를 올린 시각에 가장 가까운 눈금
  const tickIndex = xTicks.map((t) => times.indexOf(t))
  const nearestTick =
    hover === null
      ? -1
      : tickIndex.reduce(
          (best, ti, i) =>
            Math.abs(ti - hover) < Math.abs((tickIndex[best] ?? 0) - hover) ? i : best,
          0,
        )
  const at = (s: Series, t: number) => s.points.find(([pt]) => pt === t)?.[1] ?? null

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    if (rect.width === 0) return
    const inner =
      (((e.clientX - rect.left) / rect.width) * W - PAD.left) / (W - PAD.left - PAD.right)
    setHover(Math.min(times.length - 1, Math.max(0, Math.round(inner * (times.length - 1)))))
  }

  return (
    <div className="flex flex-col gap-2">
      <div ref={boxRef} className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block w-full touch-none overflow-visible"
          style={{ height: H }}
          role="img"
          aria-label={`${title} 그래프. 시계열 ${lines.length}개, 가장 높을 때 ${format(top)}`}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          <defs>
            {lines.map((_, si) => (
              <g key={si}>
                {/* 선 아래 면: 아래로 갈수록 옅어진다 */}
                <linearGradient id={`${id}-fill-${si}`} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={seriesColor(si)}
                    stopOpacity={lines.length === 1 ? 0.32 : 0.14}
                  />
                  <stop offset="100%" stopColor={seriesColor(si)} stopOpacity="0" />
                </linearGradient>
                {/* 선: 왼쪽(오래된 시각)은 옅게, 오른쪽(지금)은 진하게 */}
                <linearGradient id={`${id}-line-${si}`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={seriesColor(si)} stopOpacity="0.35" />
                  <stop offset="100%" stopColor={seriesColor(si)} stopOpacity="1" />
                </linearGradient>
              </g>
            ))}
          </defs>
          {/* 세로 보조선(시각 눈금마다) */}
          {xTicks.map((t, i) => (
            <line
              key={`g${i}`}
              x1={x(t)}
              x2={x(t)}
              y1={PAD.top}
              y2={baseY}
              stroke="var(--line)"
              strokeOpacity="0.6"
            />
          ))}
          {filled &&
            lines.map((s, si) =>
              segmentsOf(s).map((seg, i) => {
                const a = seg[0]!
                const b = seg[seg.length - 1]!
                const base = y(Math.max(bottom, 0))
                return (
                  <path
                    key={`f${si}-${i}`}
                    d={`${monotonePath(seg)}L${b.x.toFixed(1)},${base}L${a.x.toFixed(1)},${base}Z`}
                    fill={`url(#${id}-fill-${si})`}
                    opacity={dim(si)}
                  />
                )
              }),
            )}
          {lines.map((s, si) =>
            segmentsOf(s).map((seg, i) => (
              <path
                key={`${si}-${i}`}
                d={monotonePath(seg)}
                fill="none"
                stroke={`url(#${id}-line-${si})`}
                strokeWidth={highlight === si ? 3 : 2.5}
                opacity={dim(si)}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )),
          )}
          {/* 시각 눈금. 마우스를 올린 시각에 가까운 눈금은 강조 배경을 깐다 */}
          {xTicks.map((t, i) => {
            const active = i === nearestTick
            const anchor = i === 0 ? 'start' : i === TICKS - 1 ? 'end' : 'middle'
            const tx = x(t)
            const boxX = anchor === 'start' ? tx - 4 : anchor === 'end' ? tx - 44 : tx - 24
            return (
              <g key={`x${i}`}>
                {active && (
                  <rect x={boxX} y={H - 22} width="48" height="20" rx="6" fill="var(--accent-bg)" />
                )}
                <text
                  x={tx}
                  y={H - 8}
                  fontSize="12"
                  textAnchor={anchor}
                  fill={active ? 'var(--accent)' : 'var(--muted)'}
                  fontWeight={active ? 600 : 400}
                >
                  {hhmm(t)}
                </text>
              </g>
            )
          })}
          {hoverT !== null && hoverT !== undefined && (
            <>
              <line
                x1={x(hoverT)}
                x2={x(hoverT)}
                y1={PAD.top}
                y2={baseY}
                stroke="var(--accent)"
                strokeOpacity="0.4"
              />
              {lines.map((s, si) => {
                const v = at(s, hoverT)
                return v === null ? null : (
                  <circle
                    key={si}
                    cx={x(hoverT)}
                    cy={y(v)}
                    r="5"
                    fill="var(--surface)"
                    stroke={seriesColor(si)}
                    strokeWidth="2.5"
                  />
                )
              })}
            </>
          )}
        </svg>
        {hoverT !== null && hoverT !== undefined && (
          <div
            role="tooltip"
            className="pointer-events-none absolute top-0 z-10 rounded-lg border px-2.5 py-1.5 text-xs shadow-sm"
            style={{
              // 오른쪽 절반에서는 왼쪽에 띄워 그래프 밖으로 넘치지 않게 한다
              ...(x(hoverT) > W / 2
                ? { right: `${((W - x(hoverT)) / W) * 100 + 1.5}%` }
                : { left: `${(x(hoverT) / W) * 100 + 1.5}%` }),
              background: 'var(--surface)',
              borderColor: 'var(--line)',
            }}
          >
            <div className="mb-1 text-muted">{hhmm(hoverT)}</div>
            {lines
              .map((s, si) => ({ s, si, v: at(s, hoverT) }))
              .sort((a, b) => (b.v ?? -Infinity) - (a.v ?? -Infinity))
              .map(({ s, si, v }) => (
                <div key={si} className="flex max-w-72 items-center gap-1.5">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ background: seriesColor(si) }}
                  />
                  <span className="truncate">{s.name}</span>
                  <b className="ml-auto pl-2 tabular-nums">{v === null ? '-' : format(v)}</b>
                </div>
              ))}
          </div>
        )}
      </div>
      {legend && lines.length > 1 && (
        <ul
          aria-label={`${title} 범례`}
          className="m-0 flex list-none flex-wrap gap-x-3 gap-y-1 p-0 text-xs text-muted"
        >
          {lines.map((s, si) => (
            <li key={si} className="flex max-w-full items-center gap-1.5">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: seriesColor(si) }}
              />
              <span className="truncate">{s.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
