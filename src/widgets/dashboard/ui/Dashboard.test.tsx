import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Issue, Snapshot } from '@/shared/api/linear'

import { useDashboardStore } from '../model/store'
import { Dashboard } from './Dashboard'

const replace = vi.fn()
let search = ''
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/',
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

// 한국 시간 2026-11-05(목). 사이클이 없어 이번 주는 11/8(일)까지다.
const NOW = new Date('2026-11-05T03:00:00.000Z').getTime()
const snapshot = (issues: Issue[]): Snapshot => ({
  fetchedAt: '2026-11-05T02:55:00.000Z',
  cycles: [],
  issues,
})

const overdue = Array.from({ length: 7 }, (_, n) => issue(n + 1, '2026-11-03'))
const rest = [
  issue(10, '2026-11-05', { assignee: null }),
  issue(11, '2026-11-07', { milestone: { id: 'm1', name: '세미 발표', progress: 0.5 } }),
  issue(12, '2026-11-20'),
  issue(13, null),
]

describe('대시보드', () => {
  beforeEach(() => {
    search = ''
    replace.mockReset()
    useDashboardStore.setState({ bucket: 'all', date: null })
  })

  it('숫자 요약 네 칸에 묶음별 티켓 수를 보여 준다', () => {
    render(<Dashboard snapshot={snapshot([...overdue, ...rest])} now={NOW} />)
    const summary = screen.getByRole('group', { name: '숫자 요약' })
    expect(within(summary).getByRole('button', { name: /기한 지남\s*7/ })).toBeInTheDocument()
    expect(within(summary).getByRole('button', { name: /오늘\s*1/ })).toBeInTheDocument()
    expect(within(summary).getByRole('button', { name: /이번 주\s*1/ })).toBeInTheDocument()
    expect(within(summary).getByRole('button', { name: /기한 없음\s*1/ })).toBeInTheDocument()
  })

  it('묶음마다 5개까지 보여 주고 나머지는 더 보기로 연다', async () => {
    render(<Dashboard snapshot={snapshot(overdue)} now={NOW} />)
    const section = screen.getByRole('region', { name: '기한 지남' })
    expect(within(section).getAllByRole('row')).toHaveLength(1 + 5)
    await userEvent.click(within(section).getByRole('button', { name: '2건 더 보기' }))
    expect(within(section).getAllByRole('row')).toHaveLength(1 + 7)
  })

  it('그 뒤와 기한 없음은 접혀 있다', () => {
    render(<Dashboard snapshot={snapshot(rest)} now={NOW} />)
    expect(screen.queryByText('티켓 12')).not.toBeInTheDocument()
    expect(screen.queryByText('티켓 13')).not.toBeInTheDocument()
    expect(screen.getByText('티켓 11')).toBeInTheDocument()
  })

  it('숫자 칸을 누르면 마감 목록이 그 묶음만 보여 준다', async () => {
    render(<Dashboard snapshot={snapshot([...overdue, ...rest])} now={NOW} />)
    await userEvent.click(screen.getByRole('button', { name: /기한 없음\s*1/ }))
    expect(screen.queryByRole('region', { name: '기한 지남' })).not.toBeInTheDocument()
    expect(screen.getByText('티켓 13')).toBeInTheDocument()
  })

  it('한 줄에 기한 표시와 마일스톤 없음, 담당 없음을 적고 Linear 이슈로 이어진다', () => {
    render(<Dashboard snapshot={snapshot(rest)} now={NOW} />)
    const row = screen.getByRole('row', { name: /티켓 10/ })
    expect(within(row).getByText('오늘')).toBeInTheDocument()
    expect(within(row).getByText('담당 없음')).toBeInTheDocument()
    expect(within(row).getByText('마일스톤 없음')).toBeInTheDocument()
    expect(within(row).getByText('BUK-10')).toBeInTheDocument()
    expect(within(row).getByRole('link', { name: /티켓 10/ })).toHaveAttribute(
      'href',
      'https://linear.app/bukang/issue/BUK-10',
    )
  })

  it('프로필 이미지가 없는 담당자는 이름 첫 글자로 보여 준다', () => {
    render(<Dashboard snapshot={snapshot([issue(20, '2026-11-07')])} now={NOW} />)
    const row = screen.getByRole('row', { name: /티켓 20/ })
    expect(within(row).getByText('지')).toBeInTheDocument()
    expect(within(row).getByText('지훈')).toBeInTheDocument()
  })

  it('최종 발표까지 남은 날을 크게 보여 준다', () => {
    render(<Dashboard snapshot={snapshot(rest)} now={NOW} />)
    expect(screen.getByText('최종 발표 11/23(월)까지')).toBeInTheDocument()
    expect(screen.getByText('18일')).toBeInTheDocument()
  })

  it('달력 날짜에 기한 티켓 수를 적고, 날짜를 누르면 그날 티켓만 보이고 다시 누르면 풀린다', async () => {
    render(<Dashboard snapshot={snapshot([...overdue, ...rest])} now={NOW} />)
    const calendar = screen.getByRole('application', { name: '기한 달력' })
    const day7 = within(calendar).getByRole('button', { name: /11월 7일/ })
    expect(within(day7).getByText('1')).toBeInTheDocument()

    await userEvent.click(day7)
    expect(screen.getByRole('region', { name: '11/7 기한' })).toBeInTheDocument()
    expect(screen.getByText('티켓 11')).toBeInTheDocument()
    expect(screen.queryByText('티켓 1')).not.toBeInTheDocument()

    await userEvent.click(within(calendar).getByRole('button', { name: /11월 7일/ }))
    expect(screen.queryByRole('region', { name: '11/7 기한' })).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: '기한 지남' })).toBeInTheDocument()
  })

  it('주소의 필터를 적용한다', () => {
    search = 'assignee=none'
    render(<Dashboard snapshot={snapshot(rest)} now={NOW} />)
    expect(screen.getByText('티켓 10')).toBeInTheDocument()
    expect(screen.queryByText('티켓 11')).not.toBeInTheDocument()
  })

  it('사람별 막대를 누르면 그 사람으로 필터를 건다', async () => {
    render(<Dashboard snapshot={snapshot(rest)} now={NOW} />)
    await userEvent.click(screen.getByRole('button', { name: /담당 없음 1건/ }))
    expect(replace).toHaveBeenCalledWith('/?assignee=none', { scroll: false })
  })

  it('마일스톤을 누르면 그 마일스톤으로 필터를 건다', async () => {
    render(<Dashboard snapshot={snapshot(rest)} now={NOW} />)
    await userEvent.click(screen.getByRole('button', { name: /세미 발표/ }))
    expect(replace).toHaveBeenCalledWith('/?milestone=m1', { scroll: false })
  })

  it('고른 묶음에 티켓이 없으면 그 묶음의 빈 안내를 보여 준다', async () => {
    render(<Dashboard snapshot={snapshot(overdue)} now={NOW} />)
    await userEvent.click(screen.getByRole('button', { name: /오늘\s*0/ }))
    expect(screen.getByText('이 묶음에 남은 티켓이 없어요')).toBeInTheDocument()
  })

  it('이미 걸린 담당자를 다시 누르면 그 필터를 푼다', async () => {
    search = 'assignee=none&label=l1'
    render(<Dashboard snapshot={snapshot([issue(10, null, { assignee: null })])} now={NOW} />)
    await userEvent.click(screen.getByRole('button', { name: /담당 없음 1건/ }))
    expect(replace).toHaveBeenCalledWith('/?label=l1', { scroll: false })
  })

  it('티켓이 하나도 없으면 빈 안내를 보여 준다', () => {
    render(<Dashboard snapshot={snapshot([])} now={NOW} />)
    expect(screen.getByText('남은 티켓이 없어요')).toBeInTheDocument()
  })
})
