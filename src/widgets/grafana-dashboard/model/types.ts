import type { Series as BaseSeries } from '@/shared/lib/chart'

// 서버와 화면이 함께 쓰는 모양. server-only 코드를 화면 번들에 넣지 않으려고 따로 둔다.

export const RANGES = {
  '1h': { label: '1시간', seconds: 3600, step: 60 },
  '6h': { label: '6시간', seconds: 6 * 3600, step: 180 },
  '24h': { label: '24시간', seconds: 24 * 3600, step: 720 },
} as const
export type RangeKey = keyof typeof RANGES

export const parseRange = (v: unknown): RangeKey =>
  typeof v === 'string' && v in RANGES ? (v as RangeKey) : '1h'

/** 변수 이름 → 고른 값들(주소창 v.<이름>=값 에서 온다) */
export type SelectedValues = Record<string, string[]>

export type VariableState = {
  name: string
  label: string
  multi: boolean
  includeAll: boolean
  options: string[]
  selected: string[]
}

export type Series = BaseSeries & { labels: Record<string, string> }

export type SeriesData = { series: Series[]; hiddenCount: number; failed: boolean }

/** 주소창 검색값에서 v.<이름> 만 골라 변수 값으로 만든다 */
export function selectedFromParams(
  params: Record<string, string | string[] | undefined>,
): SelectedValues {
  const out: SelectedValues = {}
  for (const [k, v] of Object.entries(params)) {
    if (!k.startsWith('v.') || v === undefined) continue
    out[k.slice(2)] = Array.isArray(v) ? v : [v]
  }
  return out
}
