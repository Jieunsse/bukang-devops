// 모니터링 화면과 AI 입력이 함께 쓰는 숫자 표기. 같은 함수를 써야 화면 숫자와 AI가 쓰는 숫자 문자열이 같다.

export const UNKNOWN = '-'

export const rpsText = (n: number | null) => (n === null ? UNKNOWN : n.toFixed(n < 10 ? 2 : 1))
export const percentText = (n: number | null) => (n === null ? UNKNOWN : `${(n * 100).toFixed(1)}%`)
export const msText = (sec: number | null) =>
  sec === null ? UNKNOWN : `${Math.round(sec * 1000)}ms`
export const mbText = (b: number | null) =>
  b === null ? UNKNOWN : `${Math.round(b / 1024 / 1024)}MB`

/** 한국 시간 시:분(24시간) */
export const hhmm = (unixSeconds: number) =>
  new Date(unixSeconds * 1000).toLocaleTimeString('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

/** 자동 브리핑 카드 단위별 표기 */
export const BRIEF_FORMAT = {
  reqps: (v: number) => v.toFixed(v < 10 ? 2 : 1),
  percentunit: (v: number) => `${Math.round(v * 100)}%`,
  s: (v: number) => (v < 1 ? `${Math.round(v * 1000)}ms` : `${v.toFixed(1)}초`),
  short: (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(v < 10 ? 2 : 1)),
} as const
