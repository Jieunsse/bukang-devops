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

  it('탭마다 이름 아래 기간을 작게 적고, 지금 기간 탭을 먼저 연다', () => {
    render(<Cycles snapshot={snapshot([issue(1), issue(2, inC1)])} now={NOW} />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((t) => t.textContent)).toEqual([
      '사이클 밖 기간11/5~11/8',
      '사이클 111/9~11/15',
      '사이클 211/16~11/22',
    ])
    expect(screen.getByRole('tab', { name: /사이클 밖 기간/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('요약 카드에 기간과 남은 날, 남은 티켓 수, 기한 지남·오늘·이번 주 개수를 보여 준다', () => {
    render(
      <Cycles
        snapshot={snapshot([
          issue(1, { dueDate: '2026-11-03' }),
          issue(2, { dueDate: '2026-11-05' }),
          issue(3, { dueDate: '2026-11-07' }),
          issue(4, { dueDate: '2026-11-08' }),
          issue(5, inC1),
        ])}
        now={NOW}
      />,
    )
    const summary = screen.getByRole('region', { name: '사이클 밖 기간 요약' })
    expect(within(summary).getByRole('heading', { name: '사이클 밖 기간' })).toBeInTheDocument()
    expect(within(summary).getByText('11/5(목) ~ 11/8(일) · 3일 남음')).toBeInTheDocument()
    expect(within(summary).getByText('남은 티켓 4건')).toBeInTheDocument()
    const counts = within(summary).getByRole('group', { name: '기한별 개수' })
    expect(within(counts).getByText('기한 지남').nextSibling).toHaveTextContent('1')
    expect(within(counts).getByText('오늘').nextSibling).toHaveTextContent('1')
    expect(within(counts).getByText('이번 주').nextSibling).toHaveTextContent('2')
  })

  it('사이클 탭 요약에는 사이클 기간과 완료 수 / 전체 수 진행 막대가 있다', async () => {
    render(<Cycles snapshot={snapshot([issue(1), issue(2, inC1)])} now={NOW} />)
    await userEvent.click(screen.getByRole('tab', { name: /사이클 1/ }))
    const summary = screen.getByRole('region', { name: '사이클 1 요약' })
    expect(within(summary).getByText('11/9(월) ~ 11/15(일)')).toBeInTheDocument()
    expect(within(summary).getByText('남은 티켓 1건')).toBeInTheDocument()
    expect(
      within(summary).getByRole('progressbar', { name: '완료 1 / 전체 2' }),
    ).toBeInTheDocument()
  })

  it('담당자별 열을 나란히 두고 담당 없음 열은 맨 끝에 둔다', () => {
    render(
      <Cycles
        snapshot={snapshot([
          issue(1, { assignee: null }),
          issue(2, { assignee: { id: 'u2', name: '소희' } }),
          issue(3),
          issue(4),
        ])}
        now={NOW}
      />,
    )
    const board = screen.getByRole('region', { name: '담당자별 티켓' })
    const columns = within(board).getAllByRole('region')
    expect(columns.map((c) => c.getAttribute('aria-label'))).toEqual(['지훈', '소희', '담당 없음'])
    expect(within(columns[0]!).getByText('2건')).toBeInTheDocument()
    expect(within(columns[2]!).getByText('1건')).toBeInTheDocument()
  })

  it('열 안 카드는 기한 순이고 번호, 제목, 기한, 라벨을 담아 Linear 이슈를 새 탭으로 연다', () => {
    render(
      <Cycles
        snapshot={snapshot([
          issue(1, { dueDate: '2026-11-12', labels: [{ id: 'l1', name: '프론트' }] }),
          issue(2, { dueDate: '2026-11-03' }),
          issue(3),
        ])}
        now={NOW}
      />,
    )
    const column = screen.getByRole('region', { name: '지훈' })
    const cards = within(column).getAllByRole('link')
    expect(cards.map((c) => within(c).getByText(/^티켓/).textContent)).toEqual([
      '티켓 2',
      '티켓 1',
      '티켓 3',
    ])
    expect(within(cards[0]!).getByText('2일 지남')).toHaveClass('text-danger')
    expect(within(cards[1]!).getByText('11/12 (D-7)')).toBeInTheDocument()
    expect(within(cards[1]!).getByText('BUK-1')).toBeInTheDocument()
    expect(within(cards[1]!).getByText('프론트')).toBeInTheDocument()
    expect(within(cards[2]!).getByText('기한 없음')).toBeInTheDocument()
    expect(cards[1]).toHaveAttribute('href', 'https://linear.app/bukang/issue/BUK-1')
    expect(cards[1]).toHaveAttribute('target', '_blank')
  })

  it('한 열에 카드가 많으면 5개까지 보여 주고 나머지는 더 보기로 연다', async () => {
    const many = Array.from({ length: 7 }, (_, n) => issue(n + 1))
    render(<Cycles snapshot={snapshot(many)} now={NOW} />)
    const column = screen.getByRole('region', { name: '지훈' })
    expect(within(column).getAllByRole('link')).toHaveLength(5)
    await userEvent.click(within(column).getByRole('button', { name: '2건 더 보기' }))
    expect(within(column).getAllByRole('link')).toHaveLength(7)
  })

  it('필터는 아래 보드에만 걸고 요약은 사이클 전체로 센다', async () => {
    search = 'assignee=none'
    render(
      <Cycles
        snapshot={snapshot([issue(1, inC1), issue(2, { ...inC1, assignee: null })])}
        now={NOW}
      />,
    )
    await userEvent.click(screen.getByRole('tab', { name: /사이클 1/ }))
    expect(screen.getByRole('progressbar', { name: '완료 1 / 전체 3' })).toBeInTheDocument()
    expect(screen.getByText('남은 티켓 2건')).toBeInTheDocument()
    expect(screen.getByText('티켓 2')).toBeInTheDocument()
    expect(screen.queryByText('티켓 1')).not.toBeInTheDocument()
  })

  it('빈 사이클은 남은 티켓이 없다고 알려 준다', async () => {
    render(<Cycles snapshot={snapshot([issue(1)])} now={NOW} />)
    await userEvent.click(screen.getByRole('tab', { name: /사이클 2/ }))
    expect(screen.getByRole('progressbar', { name: '완료 0 / 전체 0' })).toBeInTheDocument()
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
    await userEvent.click(screen.getByRole('tab', { name: /사이클 2/ }))
    rerender(<Cycles snapshot={snapshot([issue(2, inC1)], [cycle1])} now={NOW} />)
    expect(screen.getByRole('tab', { name: /사이클 1/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('티켓 2')).toBeInTheDocument()
  })

  it('더 보기로 펼친 열은 새로 받은 목록에서 티켓이 늘어도 펼친 채로 둔다', async () => {
    const many = (n: number) => Array.from({ length: n }, (_, i) => issue(i + 1))
    const { rerender } = render(<Cycles snapshot={snapshot(many(7))} now={NOW} />)
    await userEvent.click(screen.getByRole('button', { name: '2건 더 보기' }))
    rerender(<Cycles snapshot={snapshot(many(9))} now={NOW} />)
    expect(within(screen.getByRole('region', { name: '지훈' })).getAllByRole('link')).toHaveLength(
      9,
    )
  })

  it('사라졌던 탭이 다시 생겨도 보던 지금 기간 탭에 머문다', async () => {
    const { rerender } = render(
      <Cycles snapshot={snapshot([issue(1), issue(2, inC1)])} now={NOW} />,
    )
    await userEvent.click(screen.getByRole('tab', { name: /사이클 2/ }))
    rerender(<Cycles snapshot={snapshot([issue(1), issue(2, inC1)], [cycle1])} now={NOW} />)
    rerender(<Cycles snapshot={snapshot([issue(1), issue(2, inC1)])} now={NOW} />)
    expect(screen.getByRole('tab', { name: /사이클 밖 기간/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('열 머리를 누르면 그 사람 카드를 접고, 다시 누르면 펼친다', async () => {
    render(<Cycles snapshot={snapshot([issue(1), issue(2, { assignee: null })])} now={NOW} />)
    const column = screen.getByRole('region', { name: '지훈' })
    const toggle = within(column).getByRole('button', { name: /^지훈\s*1건$/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(within(column).queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText('티켓 2')).toBeInTheDocument()
    await userEvent.click(toggle)
    expect(within(column).getByRole('link', { name: /티켓 1/ })).toBeInTheDocument()
  })

  it('모두 접기로 모든 열을 접고, 모두 펼치기로 다시 펼친다', async () => {
    render(<Cycles snapshot={snapshot([issue(1), issue(2, { assignee: null })])} now={NOW} />)
    await userEvent.click(screen.getByRole('button', { name: '모두 접기' }))
    expect(screen.queryAllByRole('link')).toHaveLength(0)
    await userEvent.click(screen.getByRole('button', { name: '모두 펼치기' }))
    expect(screen.getAllByRole('link')).toHaveLength(2)
    expect(screen.getByRole('button', { name: '모두 접기' })).toBeInTheDocument()
  })

  it('한 열만 펼쳐 있어도 모두 접기를 보여 준다', async () => {
    render(<Cycles snapshot={snapshot([issue(1), issue(2, { assignee: null })])} now={NOW} />)
    await userEvent.click(screen.getByRole('button', { name: /^지훈\s*1건$/ }))
    expect(screen.getByRole('button', { name: '모두 접기' })).toBeInTheDocument()
  })
})
