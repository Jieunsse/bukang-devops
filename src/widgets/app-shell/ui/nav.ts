import { Calendar, ChartBar, CircleCheck, House, LayoutHeaderCells } from '@gravity-ui/icons'

export const NAV_ITEMS = [
  { href: '/', label: '대시보드', Icon: House },
  { href: '/cycles', label: '사이클', Icon: Calendar },
  { href: '/calendar', label: '달력', Icon: LayoutHeaderCells },
  { href: '/timeline', label: '타임라인', Icon: ChartBar },
  { href: '/done', label: '완료·취소', Icon: CircleCheck },
] as const
