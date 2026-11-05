import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Issue, Snapshot } from '@/shared/api/linear'

import { Timeline } from './Timeline'

let search = ''
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/timeline',
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
const snapshot = (issues: Issue[]): Snapshot => ({
  fetchedAt: '2026-11-05T02:55:00.000Z',
  cycles: [],
  issues,
})

describe('타임라인', () => {
  beforeEach(() => {
    search = ''
  })

  it('막대를 누르면 Linear 이슈를 새 탭으로 연다', () => {
    render(
      <Timeline
        snapshot={snapshot([issue(1, '2026-11-10', { startedAt: '2026-11-02T01:00:00.000Z' })])}
        now={NOW}
      />,
    )
    const link = screen.getByRole('link', { name: /티켓 1/ })
    expect(link).toHaveAttribute('href', 'https://linear.app/bukang/issue/BUK-1')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAccessibleName(/11\/2부터 11\/10까지/)
  })

  it('시작 전 티켓은 기한 날짜만 알려 준다', () => {
    render(<Timeline snapshot={snapshot([issue(1, '2026-11-10')])} now={NOW} />)
    expect(screen.getByRole('link', { name: /티켓 1/ })).toHaveAccessibleName(
      /시작 전, 기한 11\/10/,
    )
  })

  it('기한 지남 티켓만 빨강으로 구분한다', () => {
    render(
      <Timeline
        snapshot={snapshot([
          issue(1, '2026-11-04'),
          issue(2, '2026-11-05'),
          issue(3, '2026-11-12'),
        ])}
        now={NOW}
      />,
    )
    expect(screen.getByRole('link', { name: /티켓 1/ })).toHaveAccessibleName(/기한 지남/)
    expect(screen.getByRole('link', { name: /티켓 1/ }).className).toMatch(/bg-danger/)
    expect(screen.getByRole('link', { name: /티켓 2/ }).className).not.toMatch(/bg-danger/)
    expect(screen.getByRole('link', { name: /티켓 3/ }).className).not.toMatch(/bg-danger/)
  })

  it('기한 없는 티켓은 빼고 건수만 보여 준다', () => {
    render(
      <Timeline
        snapshot={snapshot([issue(1, '2026-11-10'), issue(2, null), issue(3, null)])}
        now={NOW}
      />,
    )
    expect(screen.queryByText(/티켓 2/)).not.toBeInTheDocument()
    expect(screen.getByText('기한 없음 2건')).toBeInTheDocument()
  })

  it('오늘과 최종 발표일 세로선을 그린다', () => {
    render(<Timeline snapshot={snapshot([issue(1, '2026-11-10')])} now={NOW} />)
    expect(screen.getByText('오늘')).toBeInTheDocument()
    expect(screen.getByText('최종 발표')).toBeInTheDocument()
  })

  it('담당자별로 묶고, 버튼으로 마일스톤별 묶음으로 바꾼다', async () => {
    const issues = [
      issue(1, '2026-11-10', { milestone: { id: 'm1', name: '세미 발표', progress: 0.5 } }),
      issue(2, '2026-11-11', { assignee: null }),
    ]
    render(<Timeline snapshot={snapshot(issues)} now={NOW} />)
    expect(screen.getByRole('rowgroup', { name: '지훈' })).toBeInTheDocument()
    expect(screen.getByRole('rowgroup', { name: '담당 없음' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('radio', { name: '마일스톤별' }))
    expect(
      within(screen.getByRole('rowgroup', { name: '세미 발표' })).getByText(/티켓 1/),
    ).toBeInTheDocument()
    expect(
      within(screen.getByRole('rowgroup', { name: '마일스톤 없음' })).getByText(/티켓 2/),
    ).toBeInTheDocument()
  })

  it('주소의 필터를 적용한다', () => {
    search = 'assignee=none'
    render(
      <Timeline
        snapshot={snapshot([issue(1, '2026-11-10'), issue(2, '2026-11-10', { assignee: null })])}
        now={NOW}
      />,
    )
    expect(screen.queryByText(/티켓 1/)).not.toBeInTheDocument()
    expect(screen.getByText(/티켓 2/)).toBeInTheDocument()
  })

  it('기한 있는 티켓이 없으면 빈 안내를 보여 준다', () => {
    render(<Timeline snapshot={snapshot([issue(1, null)])} now={NOW} />)
    expect(screen.getByText('기한이 있는 티켓이 없어요')).toBeInTheDocument()
    expect(screen.getByText('기한 없음 1건')).toBeInTheDocument()
  })

  it('휴대폰 폭에서는 차트 영역만 가로로 스크롤한다', () => {
    render(<Timeline snapshot={snapshot([issue(1, '2026-11-10')])} now={NOW} />)
    expect(screen.getByRole('region', { name: '타임라인 차트' }).className).toMatch(
      /overflow-x-auto/,
    )
  })

  it('기한이 지난 뒤에 시작한 티켓은 기한과 시작일을 따로 알려 준다', () => {
    render(
      <Timeline
        snapshot={snapshot([issue(1, '2026-11-03', { startedAt: '2026-11-04T01:00:00.000Z' })])}
        now={NOW}
      />,
    )
    expect(screen.getByRole('link', { name: /티켓 1/ })).toHaveAccessibleName(
      /기한 11\/3, 11\/4에 시작/,
    )
  })

  it('막대와 오늘 선을 날짜 칸에 맞춰 그린다', () => {
    // 표시 범위는 10/29부터, 하루 칸은 28px이다.
    render(
      <Timeline
        snapshot={snapshot([issue(1, '2026-11-10', { startedAt: '2026-11-02T01:00:00.000Z' })])}
        now={NOW}
      />,
    )
    const bar = screen.getByRole('link', { name: /티켓 1/ })
    expect(bar.style.left).toBe(`${4 * 28 + 2}px`)
    expect(bar.style.width).toBe(`${9 * 28 - 4}px`)
    expect(screen.getByText('오늘').parentElement!.style.left).toBe(`${7 * 28 + 14}px`)
  })

  it('한국 시간 자정이 지나면 어제 기한이 기한 지남으로 바뀐다', () => {
    // UTC 11/5 15:00은 한국 시간 11/6 0시다.
    const midnight = new Date('2026-11-05T15:00:00.000Z').getTime()
    render(<Timeline snapshot={snapshot([issue(1, '2026-11-05')])} now={midnight} />)
    const link = screen.getByRole('link', { name: /티켓 1/ })
    expect(link).toHaveAccessibleName(/기한 지남/)
    expect(link.className).toMatch(/bg-danger/)
  })

  it('기한이 오늘인 티켓은 파랑이다', () => {
    render(<Timeline snapshot={snapshot([issue(1, '2026-11-05')])} now={NOW} />)
    expect(screen.getByRole('link', { name: /티켓 1/ }).className).toMatch(/bg-accent/)
  })

  it('최종 발표일 당일에는 세로선을 하나만 그린다', () => {
    const finalDay = new Date('2026-11-23T03:00:00.000Z').getTime()
    render(<Timeline snapshot={snapshot([issue(1, '2026-11-24')])} now={finalDay} />)
    expect(screen.getByText('오늘·최종 발표')).toBeInTheDocument()
    expect(screen.queryByText('최종 발표')).not.toBeInTheDocument()
  })
})
