// 그라파나 변수($job, ${node}, [[instance]])와 시간 매크로($__rate_interval …)를 PromQL 안에서 바꾼다.

/** 「전체」를 고른 변수의 값 */
export const ALL = '$__all'

/** 변수 이름 → 고른 값들. 이미 「전체」를 풀어 둔 값이다 */
export type VariableValues = Record<string, string[]>

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** 값 하나는 그대로, 여러 개는 정규식 (a|b) 로 묶는다(그라파나 기본 형식과 같다) */
export function formatValues(values: string[]): string {
  if (values.length === 1) return values[0]!
  return `(${values.map(escapeRegex).join('|')})`
}

export type TimeMacros = { stepSeconds: number; rangeSeconds: number; scrapeSeconds: number }

export function interpolate(expr: string, values: VariableValues, time: TimeMacros): string {
  // 그라파나 규칙: $__rate_interval = max($__interval + 수집 주기, 수집 주기 × 4)
  const rate = Math.max(time.stepSeconds + time.scrapeSeconds, time.scrapeSeconds * 4)
  const macros: Record<string, string> = {
    __rate_interval: `${rate}s`,
    __interval: `${time.stepSeconds}s`,
    __interval_ms: String(time.stepSeconds * 1000),
    __range: `${time.rangeSeconds}s`,
    __range_s: String(time.rangeSeconds),
  }
  const lookup = (name: string): string | null => {
    if (name in macros) return macros[name]!
    const v = values[name]
    return v && v.length ? formatValues(v) : null
  }
  return expr.replace(
    /\$\{(\w+)(?::\w+)?\}|\[\[(\w+)\]\]|\$(\w+)/g,
    (whole, braced: string | undefined, bracket: string | undefined, bare: string | undefined) =>
      lookup(braced ?? bracket ?? bare!) ?? whole,
  )
}

/** 범례 이름. {{label}} 을 시계열 라벨로 바꾸고, 없으면 라벨을 이어 쓴다 */
export function legendName(legend: string, labels: Record<string, string>): string {
  if (legend.trim()) {
    return legend.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, l: string) => labels[l] ?? '')
  }
  const { __name__: name, ...rest } = labels
  const pairs = Object.entries(rest).map(([k, v]) => `${k}="${v}"`)
  if (!pairs.length) return name ?? '값'
  return `${name ?? ''}{${pairs.join(', ')}}`
}
