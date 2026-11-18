import { useId } from 'react'

import { monotonePath, type Pt } from '@/shared/lib/chart'

/**
 * 리포트 카드 안 작은 그래프. 모양은 레퍼런스(이용 통계 시안)와 같다: 곡선, 아래로 옅어지는 면,
 * 왼쪽(오래된 시각)이 옅은 선, 지금 값에 속이 빈 점. 축·글자는 두지 않는다. 색은 상세 지표 그래프 첫 시계열과 같다.
 */
export function Sparkline({ points, label }: { points: [number, number | null][]; label: string }) {
  const id = useId().replace(/:/g, '')
  const W = 320
  const H = 64
  const vals = points.flatMap(([t, v]) => (v === null ? [] : [{ t, v }]))
  if (vals.length < 2) return null
  const t0 = vals[0]!.t
  const t1 = vals[vals.length - 1]!.t
  const max = Math.max(...vals.map((p) => p.v)) || 1
  const pts: Pt[] = vals.map((p) => ({
    x: ((p.t - t0) / (t1 - t0 || 1)) * W,
    y: 8 + (1 - p.v / max) * (H - 12),
  }))
  const line = monotonePath(pts)
  const last = pts[pts.length - 1]!
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="block h-16 w-full overflow-visible"
      role="img"
      aria-label={`${label} 최근 1시간 그래프`}
    >
      <defs>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--series-1)" stopOpacity="0.32" />
          <stop offset="100%" stopColor="var(--series-1)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-line`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--series-1)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--series-1)" stopOpacity="1" />
        </linearGradient>
      </defs>
      <path d={`${line}L${W},${H}L0,${H}Z`} fill={`url(#${id}-fill)`} />
      <path
        d={line}
        fill="none"
        stroke={`url(#${id}-line)`}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {/* 지금 값 점. viewBox를 늘려도 동그랗게 보이도록 선 굵기만 고정한다 */}
      <circle
        cx={last.x}
        cy={last.y}
        r="4"
        fill="var(--surface)"
        stroke="var(--series-1)"
        strokeWidth="2.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
