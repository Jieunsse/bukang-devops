/**
 * claude.ai 아티팩트를 복사해 둔 리포트 목록.
 * 아티팩트는 다른 사이트의 iframe에 넣을 수 없어서(frame-ancestors 'self') HTML을 암호화해 reports/에 두고, 비밀번호가 맞으면 풀어서 띄운다.
 * 원본 주소에는 공유 키가 붙어 있어 여기 적지 않고 암호문 안에 함께 넣는다.
 * 최신화 방법은 docs/spec.md 「링크 모음 페이지」에 있다.
 */
export const REPORTS = [
  {
    slug: 'overall',
    title: '종합점검',
    hash: '#team5',
    syncedAt: '2026-11-13',
  },
  {
    slug: 'transaction',
    title: '트랜잭션',
    hash: '#apply',
    syncedAt: '2026-11-13',
  },
  {
    slug: 'kafka',
    title: '카프카',
    hash: '#team5',
    syncedAt: '2026-11-13',
  },
] as const

export type Report = (typeof REPORTS)[number]

export const findReport = (slug: string) => REPORTS.find((r) => r.slug === slug)
