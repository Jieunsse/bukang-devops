// 선 그래프 공용 계산. 모니터링 요약 그래프와 그라파나 대시보드 그래프가 함께 쓴다.

export type Pt = { x: number; y: number }

/** 이어진 점들을 지나는 곡선. 점 사이에서 값이 넘치지 않는 단조 3차 보간(Fritsch–Carlson) */
export function monotonePath(pts: Pt[]): string {
  const n = pts.length
  const first = pts[0]
  if (!first) return ''
  if (n === 1) return `M${first.x},${first.y}`
  const dx: number[] = []
  const slope: number[] = []
  for (let i = 0; i < n - 1; i++) {
    const a = pts[i]!
    const b = pts[i + 1]!
    dx.push(b.x - a.x)
    slope.push((b.y - a.y) / (b.x - a.x || 1))
  }
  const tangent = pts.map((_, i) => {
    if (i === 0) return slope[0]!
    if (i === n - 1) return slope[n - 2]!
    const s0 = slope[i - 1]!
    const s1 = slope[i]!
    if (s0 * s1 <= 0) return 0
    const h0 = dx[i - 1]!
    const h1 = dx[i]!
    return (3 * (h0 + h1)) / ((2 * h1 + h0) / s0 + (h1 + 2 * h0) / s1)
  })
  let d = `M${first.x.toFixed(1)},${first.y.toFixed(1)}`
  for (let i = 0; i < n - 1; i++) {
    const a = pts[i]!
    const b = pts[i + 1]!
    const h = dx[i]! / 3
    const c1 = `${(a.x + h).toFixed(1)},${(a.y + h * tangent[i]!).toFixed(1)}`
    const c2 = `${(b.x - h).toFixed(1)},${(b.y - h * tangent[i + 1]!).toFixed(1)}`
    d += `C${c1} ${c2} ${b.x.toFixed(1)},${b.y.toFixed(1)}`
  }
  return d
}

export type SeriesStats = {
  latest: number | null
  avg: number | null
  max: number | null
  min: number | null
}

/** 표에 넣을 지금·평균·최대·최소. 빈 값(null)은 뺀다 */
export function seriesStats(points: [number, number | null][]): SeriesStats {
  const vs = points.map(([, v]) => v).filter((v): v is number => v !== null)
  if (!vs.length) return { latest: null, avg: null, max: null, min: null }
  return {
    latest: vs[vs.length - 1]!,
    avg: vs.reduce((a, b) => a + b, 0) / vs.length,
    max: Math.max(...vs),
    min: Math.min(...vs),
  }
}

/** 이름이 붙은 시계열. 값이 없는 시각은 null이다 */
export type Series = { name: string; points: [number, number | null][] }
