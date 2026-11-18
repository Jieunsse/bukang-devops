'use client'

import { useId, useState, type PointerEvent } from 'react'

import { monotonePath, type Pt } from '@/shared/lib/chart'

// 선 그래프 하나. 색은 리포트 강조색 하나만 쓴다(서비스 구분은 그래프를 나눠서 한다).
// 곡선은 값이 튀어 보이지 않게 단조 보간(monotone cubic)으로 그리고, 아래 면은 강조색이 옅어지게 칠한다.
// 마우스를 올리면 세로선·점·툴팁 카드가 나오고, 그 시각에 가까운 x축 눈금을 강조한다.

const PAD = { top: 16, right: 12, bottom: 28, left: 12 }
/** x축 눈금 개수(양 끝 포함) */
const TICKS = 7

const hhmm = (t: number) =>
  new Date(t * 1000).toLocaleTimeString('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

export function TrendChart({
  title,
  points,
  format,
  hero = false,
  width: W = 320,
  height: H = 140,
}: {
  title: string
  points: [number, number | null][]
  format: (v: number) => string
  /** 큰 숫자와 1시간 전 대비 증감을 머리에 크게 보여 준다 */
  hero?: boolean
  /** 그릴 공간 크기. 실제 칸 폭에 가깝게 줘야 글자와 선 굵기가 커지지 않는다 */
  width?: number
  height?: number
}) {
  const id = useId().replace(/:/g, '')
  const [hover, setHover] = useState<number | null>(null)
  const values = points.map(([, v]) => v).filter((v): v is number => v !== null)
  const first = points[0]
  const last = points[points.length - 1]
  if (!first || !last || values.length === 0) {
    return (
      <figure className="m-0">
        <figcaption className="text-base font-medium">{title}</figcaption>
        <p className="py-8 text-center text-base text-muted">최근 1시간 기록이 없어요</p>
      </figure>
    )
  }

  const peak = Math.max(...values)
  // 위쪽에 툴팁 자리를 남기려고 최댓값보다 조금 높게 잡는다
  const max = (peak || 1) * 1.15
  const span = last[0] - first[0] || 1
  const baseY = H - PAD.bottom
  const x = (t: number) => PAD.left + ((t - first[0]) / span) * (W - PAD.left - PAD.right)
  const y = (v: number) => PAD.top + (1 - v / max) * (baseY - PAD.top)

  // 값이 없는 시각에서 끊어 구간마다 곡선과 면을 따로 그린다
  const segments: Pt[][] = []
  let run: Pt[] = []
  for (const [t, v] of points) {
    if (v === null) {
      if (run.length) segments.push(run)
      run = []
    } else {
      run.push({ x: x(t), y: y(v) })
    }
  }
  if (run.length) segments.push(run)

  const latestIndex = points.findLastIndex(([, v]) => v !== null)
  const latest = points[latestIndex]?.[1] ?? null
  const firstValue = points.find(([, v]) => v !== null)?.[1] ?? null
  const delta = latest !== null && firstValue !== null ? latest - firstValue : null

  const focused = points[hover ?? latestIndex]
  const ticks = Array.from({ length: TICKS }, (_, i) =>
    Math.round((i * (points.length - 1)) / (TICKS - 1)),
  )
  const nearestTick =
    hover === null
      ? -1
      : ticks.reduce((a, b) => (Math.abs(b - hover) < Math.abs(a - hover) ? b : a))

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    if (rect.width === 0) return
    const inner =
      (((e.clientX - rect.left) / rect.width) * W - PAD.left) / (W - PAD.left - PAD.right)
    setHover(Math.min(points.length - 1, Math.max(0, Math.round(inner * (points.length - 1)))))
  }

  return (
    <figure className="m-0 flex flex-col gap-2">
      <figcaption className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <span className={hero ? 'text-base text-muted' : 'text-base font-medium'}>{title}</span>
          {hero && latest !== null && (
            <div className="flex items-center gap-2">
              <span className="text-[32px] leading-10 font-bold tracking-tight tabular-nums">
                {format(latest)}
              </span>
              {delta !== null && (
                <span
                  className="rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums"
                  style={{ background: 'var(--fg)', color: 'var(--surface)' }}
                  title="1시간 전과 비교"
                >
                  {delta >= 0 ? '+' : '−'}
                  {format(Math.abs(delta))}
                </span>
              )}
            </div>
          )}
        </div>
        {!hero && (
          <span className="text-base text-muted tabular-nums">
            {latest === null ? '-' : `지금 ${format(latest)}`}
          </span>
        )}
      </figcaption>

      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block h-auto w-full touch-none overflow-visible"
          role="img"
          aria-label={`${title} 최근 1시간 추이. 가장 높을 때 ${format(peak)}, 지금 ${latest === null ? '기록 없음' : format(latest)}`}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.32" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
            {/* 왼쪽(오래된 시각)은 옅게, 오른쪽(지금)은 진하게 */}
            <linearGradient id={`${id}-line`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="1" />
            </linearGradient>
            <linearGradient id={`${id}-fade`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="white" stopOpacity="0.3" />
              <stop offset="100%" stopColor="white" stopOpacity="1" />
            </linearGradient>
            <mask id={`${id}-mask`}>
              <rect x="0" y="0" width={W} height={H} fill={`url(#${id}-fade)`} />
            </mask>
          </defs>

          {ticks.map((i) => (
            <line
              key={i}
              x1={x(points[i]![0])}
              x2={x(points[i]![0])}
              y1={PAD.top}
              y2={baseY}
              stroke="var(--line)"
              strokeOpacity="0.6"
            />
          ))}

          <g mask={`url(#${id}-mask)`}>
            {segments.map((seg, i) => {
              const a = seg[0]!
              const b = seg[seg.length - 1]!
              return (
                <path
                  key={i}
                  d={`${monotonePath(seg)}L${b.x.toFixed(1)},${baseY}L${a.x.toFixed(1)},${baseY}Z`}
                  fill={`url(#${id}-fill)`}
                />
              )
            })}
          </g>
          {segments.map((seg, i) => (
            <path
              key={i}
              d={monotonePath(seg)}
              fill="none"
              stroke={`url(#${id}-line)`}
              strokeWidth={hero ? 3 : 2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {ticks.map((i) => {
            const active = i === nearestTick
            const tx = x(points[i]![0])
            const anchor = i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'
            const boxX = anchor === 'start' ? tx - 4 : anchor === 'end' ? tx - 36 : tx - 20
            return (
              <g key={i}>
                {active && (
                  <rect x={boxX} y={H - 19} width="40" height="16" rx="4" fill="var(--accent-bg)" />
                )}
                <text
                  x={tx}
                  y={H - 7}
                  fontSize="12"
                  textAnchor={anchor}
                  fill={active ? 'var(--accent)' : 'var(--muted)'}
                  fontWeight={active ? 600 : 400}
                >
                  {hhmm(points[i]![0])}
                </text>
              </g>
            )
          })}

          {hover !== null && focused && (
            <line
              x1={x(focused[0])}
              x2={x(focused[0])}
              y1={PAD.top}
              y2={baseY}
              stroke="var(--accent)"
              strokeOpacity="0.4"
            />
          )}
          {focused && focused[1] !== null && (
            <circle
              cx={x(focused[0])}
              cy={y(focused[1])}
              r={hero ? 5 : 4}
              fill="var(--surface)"
              stroke="var(--accent)"
              strokeWidth="2.5"
            />
          )}
        </svg>

        {hover !== null && focused && (
          <div
            role="tooltip"
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border px-2.5 py-1.5 text-xs whitespace-nowrap shadow-sm"
            style={{
              left: `${(Math.min(Math.max(x(focused[0]), 40), W - 40) / W) * 100}%`,
              top: `calc(${((focused[1] === null ? PAD.top : y(focused[1])) / H) * 100}% - 10px)`,
              background: 'var(--surface)',
              borderColor: 'var(--line)',
            }}
          >
            <div className="text-muted">{hhmm(focused[0])}</div>
            <div className="font-bold tabular-nums">
              {focused[1] === null ? '기록 없음' : format(focused[1])}
            </div>
          </div>
        )}
      </div>
    </figure>
  )
}
