import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Cycle, Issue, Snapshot } from '@/shared/api/linear'

import { NO_ASSIGNEE_COLOR } from '../lib/month'
import { MonthCalendar } from './MonthCalendar'

let search = ''
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/calendar',
  useSearchParams: () => new URLSearchParams(search),
}))

const issue = (n: number, dueDate: string | null, extra: Partial<Issue> = {}): Issue => ({
  id: `i${n}`,
  identifier: `BUK-${n}`,
  title: `티켓 ${n}`,
  url: `https://linear.app/bukang/issue/BUK-${n}`,
  dueDate,
  startedAt: null,
  state: { name: '할 일', type: 'unstarted' },
  assignee: { id: 'u1', name: '지훈' },
  labels: [{ id: 'l1', name: '프론트' }],
  milestone: null,
  ...extra,
})

// 한국 시간 2026-11-05(목) 12시
const NOW = new Date('2026-11-05T03:00:00.000Z').getTime()
const snapshot = (issues: Issue[], cycles: Cycle[] = []): Snapshot => ({
  fetchedAt: '2026-11-05T02:55:00.000Z',
  cycles,
  issues,
})
// 칸 이름은 「11월 12일 목요일」이다. 요일까지 맞추는 테스트는 따로 둔다.
const day = (name: string) => screen.getByRole('listitem', { name: new RegExp(`^${name} `) })

describe('달력 페이지', () => {
  beforeEach(() => {
    search = ''
  })

  it('달력 위 도구 줄에 넘겨받은 버튼을 둔다', () => {
    render(
      <MonthCalendar
        snapshot={snapshot([issue(1, '2026-11-12')])}
        now={NOW}
        actions={<button>필터</button>}
      />,
    )
    const bar = screen.getByRole('group', { name: '달력 도구' })
    expect(within(bar).getByRole('button', { name: '필터' })).toBeInTheDocument()
  })

  it('오늘이 든 달을 열고, 날짜 칸에 「이슈 번호 + 제목」을 Linear 링크로 보여 준다', () => {
    render(<MonthCalendar snapshot={snapshot([issue(1, '2026-11-12')])} now={NOW} />)
    expect(screen.getByRole('heading', { name: '2026년 11월' })).toBeInTheDocument()
    const link = within(day('11월 12일')).getByRole('link', { name: /BUK-1 티켓 1/ })
    expect(link).toHaveAttribute('href', 'https://linear.app/bukang/issue/BUK-1')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link.className).toMatch(/cursor-pointer/)
    expect(link.lastElementChild!.className).toMatch(/truncate/)
  })

  it('날짜 칸 이름에 요일을 넣어 화면 낭독기로도 요일을 알 수 있다', () => {
    render(<MonthCalendar snapshot={snapshot([])} now={NOW} />)
    expect(screen.getByRole('listitem', { name: '11월 12일 목요일' })).toBeInTheDocument()
    expect(screen.getByRole('listitem', { name: '11월 1일 일요일' })).toBeInTheDocument()
  })

  it('이번 달에 티켓이 없어도 앞뒤 달 칸에 티켓이 보이면 빈 안내를 띄우지 않는다', () => {
    render(<MonthCalendar snapshot={snapshot([issue(1, '2026-12-05')])} now={NOW} />)
    expect(screen.queryByText('이 달에 기한인 남은 티켓이 없어요')).not.toBeInTheDocument()
  })

  it('앞뒤 달 날짜 칸에도 그날 기한 티켓을 보여 준다', () => {
    render(
      <MonthCalendar
        snapshot={snapshot([issue(1, '2026-10-31'), issue(2, '2026-12-05')])}
        now={NOW}
      />,
    )
    expect(within(day('10월 31일')).getByText(/티켓 1/)).toBeInTheDocument()
    expect(within(day('12월 5일')).getByText(/티켓 2/)).toBeInTheDocument()
  })

  it('기한 지난 날 티켓은 빨강, 오늘은 주황, 그 밖은 색이 없다', () => {
    render(
      <MonthCalendar
        snapshot={snapshot([
          issue(1, '2026-11-04'),
          issue(2, '2026-11-05'),
          issue(3, '2026-11-06'),
        ])}
        now={NOW}
      />,
    )
    expect(screen.getByRole('link', { name: /티켓 1/ }).className).toMatch(/text-danger/)
    expect(screen.getByRole('link', { name: /티켓 2/ }).className).toMatch(/text-warning/)
    const later = screen.getByRole('link', { name: /티켓 3/ }).className
    expect(later).not.toMatch(/text-danger|text-warning/)
    expect(day('11월 5일')).toHaveAttribute('aria-current', 'date')
  })

  it('한국 시간 자정이 지나면 어제 기한 티켓이 빨강이 된다', () => {
    const midnight = new Date('2026-11-05T15:00:00.000Z').getTime()
    render(<MonthCalendar snapshot={snapshot([issue(1, '2026-11-05')])} now={midnight} />)
    expect(screen.getByRole('link', { name: /티켓 1/ }).className).toMatch(/text-danger/)
    expect(day('11월 6일')).toHaveAttribute('aria-current', 'date')
  })

  it('한 날짜에 티켓이 많으면 세 줄만 보여 주고 「n건 더」를 누르면 전체를 보여 준다', async () => {
    const many = Array.from({ length: 5 }, (_, n) => issue(n + 1, '2026-11-12'))
    render(<MonthCalendar snapshot={snapshot(many)} now={NOW} />)
    const cell = day('11월 12일')
    expect(within(cell).getAllByRole('link')).toHaveLength(3)

    const more = within(cell).getByRole('button', { name: '2건 더' })
    expect(more.className).toMatch(/cursor-pointer/)
    await userEvent.click(more)
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('11/12 기한 5건')).toBeInTheDocument()
    expect(within(dialog).getAllByRole('link')).toHaveLength(5)
  })

  it('휴대폰 폭에서 보여 줄 날짜별 티켓 수를 함께 둔다', () => {
    const many = Array.from({ length: 5 }, (_, n) => issue(n + 1, '2026-11-12'))
    render(<MonthCalendar snapshot={snapshot(many)} now={NOW} />)
    expect(within(day('11월 12일')).getByText('5건').className).toMatch(/md:hidden/)
  })

  it('담당자마다 색 막대를 붙이고, 담당자 없는 티켓은 회색 막대다', () => {
    render(
      <MonthCalendar
        snapshot={snapshot([
          issue(1, '2026-11-12'),
          issue(2, '2026-11-12', { assignee: { id: 'u2', name: '소희' } }),
          issue(3, '2026-11-12', { assignee: null }),
        ])}
        now={NOW}
      />,
    )
    const bar = (name: RegExp) =>
      screen.getByRole('link', { name }).querySelector('[data-assignee-bar]')!.className
    expect(bar(/티켓 1/)).not.toBe(bar(/티켓 2/))
    expect(bar(/티켓 3/)).toContain(NO_ASSIGNEE_COLOR)
    expect(screen.getByRole('link', { name: /티켓 3/ })).toHaveAccessibleName(/담당 없음/)
  })

  it('이전 달·다음 달로 옮기고 「오늘」로 돌아온다', async () => {
    render(<MonthCalendar snapshot={snapshot([issue(1, '2026-12-20')])} now={NOW} />)
    await userEvent.click(screen.getByRole('button', { name: '다음 달' }))
    expect(screen.getByRole('heading', { name: '2026년 12월' })).toBeInTheDocument()
    expect(within(day('12월 20일')).getByText(/티켓 1/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '오늘' }))
    await userEvent.click(screen.getByRole('button', { name: '이전 달' }))
    expect(screen.getByRole('heading', { name: '2026년 10월' })).toBeInTheDocument()
  })

  it('최종 발표일 칸에 「최종 발표」를 적고, 사이클 기간 칸은 연한 바탕이다', () => {
    const cycle: Cycle = {
      id: 'c1',
      number: 1,
      name: null,
      startsAt: '2026-11-08T15:00:00.000Z',
      endsAt: '2026-11-15T15:00:00.000Z',
    }
    render(<MonthCalendar snapshot={snapshot([], [cycle])} now={NOW} />)
    expect(within(day('11월 23일')).getByText('최종 발표')).toBeInTheDocument()
    expect(day('11월 9일').className).toMatch(/bg-accent-soft/)
    expect(day('11월 16일').className).not.toMatch(/bg-accent-soft/)
  })

  it('주소의 필터를 적용한다', () => {
    search = 'assignee=none'
    render(
      <MonthCalendar
        snapshot={snapshot([issue(1, '2026-11-12'), issue(2, '2026-11-12', { assignee: null })])}
        now={NOW}
      />,
    )
    expect(screen.queryByText(/티켓 1/)).not.toBeInTheDocument()
    expect(screen.getByText(/티켓 2/)).toBeInTheDocument()
  })

  it('이 달에 기한인 티켓이 없으면 빈 안내를 보여 준다', () => {
    render(
      <MonthCalendar snapshot={snapshot([issue(1, '2027-01-10'), issue(2, null)])} now={NOW} />,
    )
    expect(screen.getByText('이 달에 기한인 남은 티켓이 없어요')).toBeInTheDocument()
  })
})
