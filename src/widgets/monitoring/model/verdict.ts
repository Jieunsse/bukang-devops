import { THRESHOLDS } from './brief'
import type { ServiceRow, Target, TrendSeries } from './rows'

// 요약 판정. 「지금 문제 있는 곳이 있나」를 숫자로 정한다. 기준값은 THRESHOLDS 한곳에서 온다.

export type Issue = 'down' | 'errors' | 'slow' | 'over2s' | 'cpu' | 'memory' | 'db'

export const isHighError = (ratio: number | null) => ratio !== null && ratio > THRESHOLDS.errorRatio
export const isSlow = (p95: number | null) => p95 !== null && p95 > THRESHOLDS.latencySeconds

export const isHighCpu = (v: number | null) => v !== null && v >= THRESHOLDS.cpu
export const isHighHeap = (v: number | null) => v !== null && v >= THRESHOLDS.memory
export const isDbFull = (r: Pick<ServiceRow, 'dbActive' | 'dbMax'>) =>
  r.dbActive !== null && r.dbMax !== null && r.dbActive >= r.dbMax * THRESHOLDS.dbConnRatio
export const isDbWaiting = (v: number | null) => v !== null && v >= THRESHOLDS.pending

/** 응답 시간(95%) 등급. 500ms까지 통과, 2초 미만 주의, 2초부터 실패 */
export function latencyGrade(p95: number | null): 'pass' | 'warn' | 'fail' | null {
  if (p95 === null) return null
  if (p95 >= THRESHOLDS.failSeconds) return 'fail'
  return isSlow(p95) ? 'warn' : 'pass'
}

export function issuesOf(r: ServiceRow): Issue[] {
  const out: Issue[] = []
  if (!r.up) out.push('down')
  if (isHighError(r.errorRatio)) out.push('errors')
  if (isSlow(r.p95Seconds)) out.push('slow')
  // 2초 넘은 요청은 실패로 보므로 서버 오류와 같은 1% 기준을 쓴다
  if (isHighError(r.over2sRatio)) out.push('over2s')
  if (isHighCpu(r.cpu)) out.push('cpu')
  if (isHighHeap(r.heapRatio)) out.push('memory')
  if (isDbFull(r) || isDbWaiting(r.dbPending)) out.push('db')
  return out
}

/** 문제가 많은 서비스를 위로, 같으면 이름 순 */
export function sortByIssues(rows: ServiceRow[]): ServiceRow[] {
  return [...rows].sort(
    (a, b) => issuesOf(b).length - issuesOf(a).length || a.name.localeCompare(b.name, 'ko'),
  )
}

export type Verdict = {
  /** 문제 있는 서비스와 응답 없는 인프라 이름 */
  problemServices: string[]
  /** 전체 요청 중 5xx 비율. 요청이 없으면 null */
  totalErrorRatio: number | null
  slowest: { name: string; p95Seconds: number } | null
  downCount: number
}

export function verdictOf(rows: ServiceRow[], targets: Target[]): Verdict {
  let requests = 0
  let failures = 0
  for (const r of rows) {
    if (r.rps === null || r.errorRatio === null) continue
    requests += r.rps
    failures += r.rps * r.errorRatio
  }
  const slowest = rows
    .filter((r): r is ServiceRow & { p95Seconds: number } => r.p95Seconds !== null)
    .sort((a, b) => b.p95Seconds - a.p95Seconds)[0]
  return {
    problemServices: [
      ...sortByIssues(rows)
        .filter((r) => issuesOf(r).length > 0)
        .map((r) => r.name),
      // 서비스 행에 없는 대상(MySQL·Redis 등)이 멈춘 것도 문제로 센다
      ...targets.filter((t) => !t.up && !rows.some((r) => r.job === t.job)).map((t) => t.name),
    ],
    totalErrorRatio: requests > 0 ? failures / requests : null,
    slowest: slowest ? { name: slowest.name, p95Seconds: slowest.p95Seconds } : null,
    downCount: targets.filter((t) => !t.up).length,
  }
}

/** 시각마다 전체 오류 비율 = Σ(오류 비율 × 요청 수) / Σ 요청 수 */
export function totalErrorTrend(
  errors: TrendSeries[],
  rps: TrendSeries[],
): [number, number | null][] {
  const ratio = new Map(errors.map((s) => [s.job, new Map(s.points)]))
  const sums = new Map<number, { req: number; fail: number }>()
  for (const s of rps) {
    for (const [t, v] of s.points) {
      const r = ratio.get(s.job)?.get(t)
      if (v === null || r === null || r === undefined) continue
      const cur = sums.get(t) ?? { req: 0, fail: 0 }
      sums.set(t, { req: cur.req + v, fail: cur.fail + v * r })
    }
  }
  const times = [...new Set(rps.flatMap((s) => s.points.map(([t]) => t)))].sort((a, b) => a - b)
  return times.map((t) => {
    const x = sums.get(t)
    return [t, x && x.req > 0 ? x.fail / x.req : null]
  })
}
