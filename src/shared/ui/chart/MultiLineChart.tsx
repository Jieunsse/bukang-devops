'use client'

import { useId, useState, type PointerEvent } from 'react'

import { monotonePath, type Pt, type Series } from '@/shared/lib/chart'
import { useWidth } from '@/shared/lib/use-width'

// 여러 시계열 선 그래프. 색은 --series-1 … 8 을 시계열 순서대로 쓴다(순위가 아니라 이름 순서라 새로 받아도 색이 바뀌지 않는다).
// 시계열이 하나면 선 아래를 강조색 그라데이션으로 칠한다. 마우스를 올리면 그 시각의 값들을 툴팁 카드로 보여 준다.

/** 재기 전 폭. 실제로는 칸 폭을 재서 viewBox로 쓴다(축 글자가 12px로 보이게) */
const DEFAULT_W = 640
const H = 220
const PAD = { top: 12, right: 12, bottom: 24, left: 56 }
/** 선으로 그리는 시계열 수. 나머지는 표에만 남긴다(9번째 색을 만들지 않는다) */
export const MAX_LINES = 8
const TICKS = 5

const hhmm = (t: number) =>
  new Date(t * 1000).toLocaleTimeString('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

export const seriesColor = (i: number) => `var(--series-${(i % MAX_LINES) + 1})`

export function MultiLineChart({
  title,
  series,
  format,
}: {
  title: string
  series: Series[]
  format: (v: number) => string
}) {
  const id = useId().replace(/:/g, '')
  const { ref: boxRef, width: W } = useWidth<HTMLDivElement>(DEFAULT_W)
  const [hover, setHover] = useState<number | null>(null)
  const lines = series.slice(0, MAX_LINES)
  const times = [...new Set(lines.flatMap((s) => s.points.map(([t]) => t)))].sort((a, b) => a - b)
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

  const yTicks = [hi, (hi + bottom) / 2, bottom]
  const xTicks = Array.from(
    { length: TICKS },
    (_, i) => times[Math.round((i * (times.length - 1)) / (TICKS - 1))]!,
  )
  const hoverT = hover === null ? null : times[hover]
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
            <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--series-1)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--series-1)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {yTicks.map((v, i) => (
            <g key={i}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y(v)}
                y2={y(v)}
                stroke="var(--line)"
                strokeOpacity={i === 2 ? 1 : 0.6}
              />
              <text
                x={PAD.left - 6}
                y={y(v) + 3}
                fontSize="12"
                textAnchor="end"
                fill="var(--muted)"
              >
                {format(v)}
              </text>
            </g>
          ))}
          {xTicks.map((t, i) => (
            <text
              key={i}
              x={x(t)}
              y={H - 6}
              fontSize="12"
              textAnchor={i === 0 ? 'start' : i === TICKS - 1 ? 'end' : 'middle'}
              fill="var(--muted)"
            >
              {hhmm(t)}
            </text>
          ))}
          {lines.length === 1 &&
            segmentsOf(lines[0]!).map((seg, i) => {
              const a = seg[0]!
              const b = seg[seg.length - 1]!
              const base = y(Math.max(bottom, 0))
              return (
                <path
                  key={`f${i}`}
                  d={`${monotonePath(seg)}L${b.x.toFixed(1)},${base}L${a.x.toFixed(1)},${base}Z`}
                  fill={`url(#${id}-fill)`}
                />
              )
            })}
          {lines.map((s, si) =>
            segmentsOf(s).map((seg, i) => (
              <path
                key={`${si}-${i}`}
                d={monotonePath(seg)}
                fill="none"
                stroke={seriesColor(si)}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )),
          )}
          {hoverT !== null && hoverT !== undefined && (
            <>
              <line
                x1={x(hoverT)}
                x2={x(hoverT)}
                y1={PAD.top}
                y2={baseY}
                stroke="var(--muted)"
                strokeOpacity="0.6"
              />
              {lines.map((s, si) => {
                const v = at(s, hoverT)
                return v === null ? null : (
                  <circle
                    key={si}
                    cx={x(hoverT)}
                    cy={y(v)}
                    r="4"
                    fill={seriesColor(si)}
                    stroke="var(--surface)"
                    strokeWidth="2"
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
      {lines.length > 1 && (
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
