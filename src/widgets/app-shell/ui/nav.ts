import {
  ArrowRightArrowLeft,
  Calendar,
  ChartBar,
  ChartLine,
  CircleCheck,
  Cubes3,
  Database,
  House,
  LayoutHeaderCells,
  Link,
  PaperPlane,
  Pulse,
  Speedometer,
} from '@gravity-ui/icons'

// 왼쪽 메뉴. 팀이 자주 보는 세 개는 맨 위에 늘 보이고, 나머지는 펼침 그룹 세 개에 넣는다.

export const NAV_TOP = [
  { href: '/', label: '대시보드', Icon: House },
  { href: '/calendar', label: '달력', Icon: LayoutHeaderCells },
  { href: '/monitoring', label: '모니터링', Icon: Pulse },
] as const

export const NAV_GROUPS = [
  {
    id: 'work',
    label: '일정·작업',
    items: [
      { href: '/cycles', label: '사이클', Icon: Calendar },
      { href: '/timeline', label: '타임라인', Icon: ChartBar },
      { href: '/done', label: '완료·취소', Icon: CircleCheck },
      { href: '/request', label: '작업 요청', Icon: PaperPlane },
    ],
  },
  {
    id: 'design',
    label: '설계 문서',
    items: [
      { href: '/api-flow', label: 'API 명세', Icon: ArrowRightArrowLeft },
      { href: '/db', label: 'DB 구조', Icon: Database },
      { href: '/architecture', label: '아키텍처', Icon: Cubes3 },
    ],
  },
  {
    id: 'more',
    label: '측정·기타',
    items: [
      { href: '/analytics', label: '이용 통계', Icon: ChartLine },
      { href: '/performance', label: '성능 측정', Icon: Speedometer },
      { href: '/links', label: '링크 모음', Icon: Link },
    ],
  },
] as const

export type NavItem = (typeof NAV_TOP)[number] | (typeof NAV_GROUPS)[number]['items'][number]
export type NavGroupId = (typeof NAV_GROUPS)[number]['id']

/** 모든 메뉴(맨 위 + 그룹 순서) */
export const NAV_ITEMS: readonly NavItem[] = [
  ...NAV_TOP,
  ...NAV_GROUPS.flatMap((g): readonly NavItem[] => g.items),
]

/** 하위 주소(모니터링 대시보드 탭 등)도 그 메뉴로 본다. 대시보드(/)는 맨 앞 주소만 */
export function isCurrentPath(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}
