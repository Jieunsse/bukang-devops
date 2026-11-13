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
} from '@gravity-ui/icons'

export const NAV_ITEMS = [
  { href: '/', label: '대시보드', Icon: House },
  { href: '/cycles', label: '사이클', Icon: Calendar },
  { href: '/calendar', label: '달력', Icon: LayoutHeaderCells },
  { href: '/timeline', label: '타임라인', Icon: ChartBar },
  { href: '/done', label: '완료·취소', Icon: CircleCheck },
  { href: '/api-flow', label: 'API 흐름', Icon: ArrowRightArrowLeft },
  { href: '/request', label: '작업 요청', Icon: PaperPlane },
  { href: '/analytics', label: '이용 통계', Icon: ChartLine },
  { href: '/db', label: 'DB 구조', Icon: Database },
  { href: '/architecture', label: '아키텍처', Icon: Cubes3 },
  { href: '/links', label: '링크 모음', Icon: Link },
] as const
