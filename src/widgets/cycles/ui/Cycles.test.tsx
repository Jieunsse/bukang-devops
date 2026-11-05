import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Cycle, Issue, Snapshot } from '@/shared/api/linear'

import { Cycles } from './Cycles'

let search = ''
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/cycles',
  useSearchParams: () => new URLSearchParams(search),
}))

const issue = (n: number, extra: Partial<Issue> = {}): Issue => ({
  id: `i${n}`,
  identifier: `BUK-${n}`,
  title: `티켓 ${n}`,
  url: `https://linear.app/bukang/issue/BUK-${n}`,
  dueDate: null,
  startedAt: null,
  state: { name: '할 일', type: 'unstarted' },
  assignee: { id: 'u1', name: '지훈' },
  labels: [],
  milestone: null,
  cycle: null,
  ...extra,
})

const cycle1: Cycle = {
  id: 'c1',
  number: 1,
  name: null,
  startsAt: '2026-11-08T15:00:00.000Z',
  endsAt: '2026-11-15T15:00:00.000Z',
  completedIssueCount: 1,
}
const cycle2: Cycle = {
  ...cycle1,
  id: 'c2',
  number: 2,
  startsAt: '2026-11-15T15:00:00.000Z',
  endsAt: '2026-11-22T15:00:00.000Z',
  completedIssueCount: 0,
}
// 한국 시간 2026-11-05(목). 사이클 밖 기간이다.
const NOW = new Date('2026-11-05T03:00:00.000Z').getTime()
const snapshot = (issues: Issue[], cycles: Cycle[] = [cycle1, cycle2]): Snapshot => ({
  fetchedAt: '2026-11-05T02:55:00.000Z',
  cycles,
  issues,
})

const inC1 = { cycle: { id: 'c1' } }

describe('사이클 페이지', () => {
  beforeEach(() => {
    search = ''
  })

  it('사이클 밖 기간과 사이클마다 탭을 두고, 지금 기간 탭을 먼저 연다', () => {
    render(<Cycles snapshot={snapshot([issue(1), issue(2, inC1)])} now={NOW} />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((t) => t.textContent)).toEqual(['사이클 밖 기간', '사이클 1', '사이클 2'])
    expect(screen.getByRole('tab', { name: '사이클 밖 기간' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByText('남은 티켓 1건')).toBeInTheDocument()
    expect(screen.getByText('티켓 1')).toBeInTheDocument()
    expect(screen.queryByText('티켓 2')).not.toBeInTheDocument()
  })

  it('사이클 탭은 위에 완료 수 / 전체 수를, 아래에 담당자별 티켓을 기한 순으로 보여 준다', async () => {
    render(
      <Cycles
        snapshot={snapshot([
          issue(1, { ...inC1, dueDate: '2026-11-12' }),
          issue(2, { ...inC1, dueDate: '2026-11-03' }),
          issue(3, { ...inC1, assignee: null }),
        ])}
        now={NOW}
      />,
    )
    await userEvent.click(screen.getByRole('tab', { name: '사이클 1' }))
    expect(screen.getByText('완료 1 / 전체 4')).toBeInTheDocument()

    const mine = screen.getByRole('region', { name: '지훈' })
    const rows = within(mine).getAllByRole('row').slice(1)
    expect(rows.map((r) => within(r).getByRole('link').textContent)).toEqual(['티켓 2', '티켓 1'])
    expect(within(rows[0]!).getByText('2일 지남')).toBeInTheDocument()
    expect(within(rows[1]!).getByText('11/12 (D-7)')).toBeInTheDocument()

    const none = screen.getByRole('region', { name: '담당 없음' })
    expect(within(none).getByText('기한 없음')).toBeInTheDocument()
  })

  it('필터는 아래 목록에만 걸고 진행률은 사이클 전체로 센다', async () => {
    search = 'assignee=none'
    render(
      <Cycles
        snapshot={snapshot([issue(1, inC1), issue(2, { ...inC1, assignee: null })])}
        now={NOW}
      />,
    )
    await userEvent.click(screen.getByRole('tab', { name: '사이클 1' }))
    expect(screen.getByText('완료 1 / 전체 3')).toBeInTheDocument()
    expect(screen.getByText('티켓 2')).toBeInTheDocument()
    expect(screen.queryByText('티켓 1')).not.toBeInTheDocument()
  })

  it('빈 사이클은 남은 티켓이 없다고 알려 준다', async () => {
    render(<Cycles snapshot={snapshot([issue(1)])} now={NOW} />)
    await userEvent.click(screen.getByRole('tab', { name: '사이클 2' }))
    expect(screen.getByText('완료 0 / 전체 0')).toBeInTheDocument()
    expect(screen.getByText('이 사이클에 남은 티켓이 없어요')).toBeInTheDocument()
  })

  it('필터에 맞는 티켓이 없으면 필터를 바꿔 보라고 알려 준다', () => {
    search = 'assignee=u9'
    render(<Cycles snapshot={snapshot([issue(1)])} now={NOW} />)
    expect(screen.getByText('필터에 맞는 티켓이 없어요')).toBeInTheDocument()
  })

  it('사이클도 사이클 밖 티켓도 없으면 빈 안내를 보여 준다', () => {
    render(<Cycles snapshot={snapshot([], [])} now={NOW} />)
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
    expect(screen.getByText('보여 줄 사이클이 없어요')).toBeInTheDocument()
  })

  it('보던 탭이 새로 받은 목록에서 사라지면 지금 기간 탭으로 돌아간다', async () => {
    const { rerender } = render(
      <Cycles snapshot={snapshot([issue(1), issue(2, inC1)])} now={NOW} />,
    )
    await userEvent.click(screen.getByRole('tab', { name: '사이클 2' }))
    rerender(<Cycles snapshot={snapshot([issue(2, inC1)], [cycle1])} now={NOW} />)
    expect(screen.getByRole('tab', { name: '사이클 1' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('티켓 2')).toBeInTheDocument()
  })
})
