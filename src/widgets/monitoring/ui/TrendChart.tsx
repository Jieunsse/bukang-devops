'use client'

import { useState, type PointerEvent } from 'react'

// 선 그래프 하나. 색은 리포트 강조색 하나만 쓴다(서비스 구분은 그래프를 나눠서 한다).
// 마우스를 올리면 세로선과 그 시각의 값을 보여 준다.

const PAD = { top: 8, right: 8, bottom: 20, left: 8 }

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
  width: W = 320,
  height: H = 120,
}: {
  title: string
  points: [number, number | null][]
  format: (v: number) => string
  /** 그릴 공간 크기. 실제 칸 폭에 가깝게 줘야 글자와 선 굵기가 커지지 않는다 */
  width?: number
  height?: number
}) {
  const [hover, setHover] = useState<number | null>(null)
  const values = points.map(([, v]) => v).filter((v): v is number => v !== null)
  const first = points[0]
  const last = points[points.length - 1]
  if (!first || !last || values.length === 0) {
    return (
      <figure className="m-0">
        <figcaption className="text-sm font-medium">{title}</figcaption>
        <p className="py-8 text-center text-sm text-muted">최근 1시간 기록이 없어요</p>
      </figure>
    )
  }

  const max = Math.max(...values) || 1
  const span = last[0] - first[0] || 1
  const x = (t: number) => PAD.left + ((t - first[0]) / span) * (W - PAD.left - PAD.right)
  const y = (v: number) => PAD.top + (1 - v / max) * (H - PAD.top - PAD.bottom)

  // 값이 없는 시각에서 선을 끊는다
  let d = ''
  let pen = false
  for (const [t, v] of points) {
    if (v === null) {
      pen = false
      continue
    }
    d += `${pen ? 'L' : 'M'}${x(t).toFixed(1)},${y(v).toFixed(1)}`
    pen = true
  }

  const latest = [...points].reverse().find(([, v]) => v !== null)?.[1] ?? null
  const hovered = hover === null ? null : points[hover]

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    if (rect.width === 0) return
    const ratio = (e.clientX - rect.left) / rect.width
    setHover(Math.min(points.length - 1, Math.max(0, Math.round(ratio * (points.length - 1)))))
  }

  return (
    <figure className="m-0">
      <figcaption className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-sm text-muted tabular-nums">
          {hovered
            ? `${hhmm(hovered[0])} · ${hovered[1] === null ? '-' : format(hovered[1])}`
            : latest === null
              ? '-'
              : `지금 ${format(latest)}`}
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full touch-none"
        role="img"
        aria-label={`${title} 최근 1시간 추이. 가장 높을 때 ${format(max)}, 지금 ${latest === null ? '기록 없음' : format(latest)}`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={y(max)}
          y2={y(max)}
          stroke="var(--line)"
          strokeDasharray="2 3"
        />
        <line x1={PAD.left} x2={W - PAD.right} y1={y(0)} y2={y(0)} stroke="var(--line)" />
        <text x={PAD.left} y={y(max) + 12} fontSize="10" fill="var(--muted)">
          {format(max)}
        </text>
        <path d={d} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />
        <text x={PAD.left} y={H - 4} fontSize="10" fill="var(--muted)">
          {hhmm(first[0])}
        </text>
        <text x={W - PAD.right} y={H - 4} fontSize="10" fill="var(--muted)" textAnchor="end">
          {hhmm(last[0])}
        </text>
        {hovered && (
          <>
            <line
              x1={x(hovered[0])}
              x2={x(hovered[0])}
              y1={PAD.top}
              y2={y(0)}
              stroke="var(--muted)"
            />
            {hovered[1] !== null && (
              <circle
                cx={x(hovered[0])}
                cy={y(hovered[1])}
                r="4"
                fill="var(--accent)"
                stroke="var(--surface)"
                strokeWidth="2"
              />
            )}
          </>
        )}
      </svg>
    </figure>
  )
}
