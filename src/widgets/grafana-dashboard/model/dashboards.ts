// 모니터링 위쪽 탭에 보일 대시보드 이름. 그라파나 원래 이름은 영어라 뜻으로 바꾼다.
// 목록에 없는 대시보드는 그라파나 이름 그대로 보인다.

export const DASHBOARD_NAMES: Record<string, string> = {
  rYdddlPWk: '서버',
  '71f306f8-cabf-4bfd-9389-e454550ba046': 'JVM',
  '549c2bf8936f7767ea6ac47c47b00f2a': 'MySQL',
  '4yyL6dBMk': 'Elasticsearch',
  'ccbb2351-2ae2-462f-ae0e-f2c893ad1028': '부하 테스트(k6)',
}

export type DashboardLink = { uid: string; name: string }

/** 위 목록 순서(서버 → JVM → MySQL → Elasticsearch → 부하 테스트)대로, 모르는 대시보드는 뒤에 */
export function toDashboardLinks(list: { uid: string; title: string }[]): DashboardLink[] {
  const order = Object.keys(DASHBOARD_NAMES)
  const rank = (uid: string) => (order.includes(uid) ? order.indexOf(uid) : order.length)
  return [...list]
    .sort((a, b) => rank(a.uid) - rank(b.uid))
    .map((d) => ({ uid: d.uid, name: DASHBOARD_NAMES[d.uid] ?? d.title }))
}
