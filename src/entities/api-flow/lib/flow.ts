import data from '../data/api-flow.json'
import { CALL_NOTES, EMPTY_NOTES, SCREEN_GROUPS, type ScreenGroup } from '../model/screens'

export type ApiCall = { key: string; method: string; path: string; service: string; note?: string }
export type ScreenRow = { route: string; name: string; calls: ApiCall[]; emptyNote?: string }
export type ScreenGroupView = Omit<ScreenGroup, 'screens'> & { rows: ScreenRow[] }
export type ApiRow = ApiCall & { screens: { route: string; name: string }[] }
export type FlowData = {
  commit: string
  committedAt: string
  /** 뽑을 때 프론트에 커밋하지 않은 변경이 있었는지 */
  dirty: boolean
  routes: { route: string; calls: string[] }[]
}

export const FLOW_DATA: FlowData = data

const SERVICES: Record<string, string> = {
  member: '회원',
  auth: '회원',
  product: '상품',
  order: '주문',
  cash: '예치금',
  payout: '정산',
  file: '파일',
  queue: '대기열',
  notification: '알림',
}
const METHOD_ORDER = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', '이동']

/** 게이트웨이가 주소의 서비스 마디로 서비스를 고르는 규칙과 같게 이름을 붙인다. */
export function serviceOf(path: string): string {
  if (path.startsWith('/admin/')) return 'Next 서버'
  return SERVICES[/^\/api\/v1\/(\w+)/.exec(path)?.[1] ?? ''] ?? '알 수 없음'
}

export function parseCall(key: string): ApiCall {
  const [method = '', path = ''] = key.split(' ')
  return { key, method, path, service: serviceOf(path), note: CALL_NOTES[key] }
}

function byMethodThenPath(a: ApiCall, b: ApiCall) {
  return (
    METHOD_ORDER.indexOf(a.method) - METHOD_ORDER.indexOf(b.method) || a.path.localeCompare(b.path)
  )
}

/** 화면별 보기: 묶음 순서와 화면 이름은 screens.ts, 요청은 추출한 JSON을 따른다. */
export function screenGroups(
  flow: FlowData = FLOW_DATA,
  groups = SCREEN_GROUPS,
): ScreenGroupView[] {
  const callsOf = new Map(flow.routes.map((r) => [r.route, r.calls]))
  return groups.map(({ screens, ...group }) => ({
    ...group,
    rows: screens.map((s) => ({
      ...s,
      calls: (callsOf.get(s.route) ?? []).map(parseCall).sort(byMethodThenPath),
      emptyNote: EMPTY_NOTES[s.route],
    })),
  }))
}

/** API별 보기: 요청 하나마다 그 요청을 보내는 화면을 모은다. 서비스 → 주소 순서로 줄 세운다. */
export function apiRows(flow: FlowData = FLOW_DATA, groups = SCREEN_GROUPS): ApiRow[] {
  const names = new Map(groups.flatMap((g) => g.screens.map((s) => [s.route, s.name] as const)))
  const rows = new Map<string, ApiRow>()
  for (const { route, calls } of flow.routes) {
    for (const key of calls) {
      const row = rows.get(key) ?? { ...parseCall(key), screens: [] }
      row.screens.push({ route, name: names.get(route) ?? route })
      rows.set(key, row)
    }
  }
  return [...rows.values()].sort(
    (a, b) =>
      a.service.localeCompare(b.service) || a.path.localeCompare(b.path) || byMethodThenPath(a, b),
  )
}

/** 검색어가 받은 글자(요청 · 서비스 · 화면 주소 · 화면 이름) 중 하나에 들어 있으면 남긴다. 대소문자는 가리지 않는다. */
export function matches(query: string, ...texts: string[]): boolean {
  const q = query.trim().toLowerCase()
  return !q || texts.some((t) => t.toLowerCase().includes(q))
}

/** JSON에는 있는데 screens.ts에 없는 화면, screens.ts에는 있는데 JSON에 없는 화면 */
export function unmatchedRoutes(flow: FlowData = FLOW_DATA, groups = SCREEN_GROUPS) {
  const named = new Set(groups.flatMap((g) => g.screens.map((s) => s.route)))
  const extracted = new Set(flow.routes.map((r) => r.route))
  return {
    unnamed: [...extracted].filter((r) => !named.has(r)),
    missing: [...named].filter((r) => !extracted.has(r)),
  }
}
