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

/**
 * 탭을 열었을 때 펼쳐 둘 핵심 묶음(그라파나 묶음 제목). 나머지 묶음은 「자세한 지표」 아래에 접어 둔다.
 * 그라파나 대시보드는 묶음이 많아(서버는 130개가 넘는 그래프) 다 펼치면 어디를 먼저 볼지 알 수 없다.
 * 이름 없는 묶음은 parseDashboard가 「개요」·「묶음」으로 이름 붙인다.
 */
const CORE_SECTIONS: Record<string, string[]> = {
  rYdddlPWk: ['Quick CPU / Mem / Disk', 'Basic CPU / Mem / Net / Disk'],
  '71f306f8-cabf-4bfd-9389-e454550ba046': [
    'Quick Facts',
    'I/O Overview',
    'JVM Memory',
    'JVM Misc',
    'Garbage Collection',
  ],
  '549c2bf8936f7767ea6ac47c47b00f2a': [
    '묶음',
    'Connections',
    'Table Locks',
    'Temporary Objects',
    'Sorts',
    'Aborted',
  ],
  '4yyL6dBMk': ['KPI', 'Shards', 'CPU and Memory', 'Disk and Network', 'Thread Pool'],
  'ccbb2351-2ae2-462f-ae0e-f2c893ad1028': ['개요', 'Performance Overview', 'HTTP', 'Checks'],
}

/** 목록에 없는 대시보드는 앞의 세 묶음을 핵심으로 본다 */
export function isCoreSection(uid: string, title: string, index: number): boolean {
  const core = CORE_SECTIONS[uid]
  return core ? core.includes(title) : index < 3
}
