import { monotonePath, type Pt } from '@/shared/lib/chart'

/** 리포트 카드 안 작은 그래프. 축·글자 없이 흐름만 보여 준다. 선 색은 상세 지표 그래프 첫 시계열과 같다 */
export function Sparkline({ points, label }: { points: [number, number | null][]; label: string }) {
  const W = 160
  const H = 48
  const vals = points.flatMap(([t, v]) => (v === null ? [] : [{ t, v }]))
  if (vals.length < 2) return null
  const t0 = vals[0]!.t
  const t1 = vals[vals.length - 1]!.t
  const max = Math.max(...vals.map((p) => p.v)) || 1
  const pts: Pt[] = vals.map((p) => ({
    x: ((p.t - t0) / (t1 - t0 || 1)) * W,
    y: 4 + (1 - p.v / max) * (H - 8),
  }))
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="block h-12 w-full"
      role="img"
      aria-label={`${label} 최근 1시간 그래프`}
    >
      <path
        d={monotonePath(pts)}
        fill="none"
        stroke="var(--series-1)"
        strokeWidth="2"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
