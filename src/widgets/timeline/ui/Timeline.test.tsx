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
const started = (n: number, dueDate: string, startedAt = '2026-11-02T01:00:00.000Z') =>
  issue(n, dueDate, { startedAt, state: { name: '진행 중', type: 'started' } })

// 한국 시간 2026-11-05(목) 12시. 4주 보기는 10/27부터 11/23까지 28칸이다.
const NOW = new Date('2026-11-05T03:00:00.000Z').getTime()
const snapshot = (issues: Issue[]): Snapshot => ({
  fetchedAt: '2026-11-05T02:55:00.000Z',
  cycles: [],
  issues,
})
const show = (issues: Issue[], now = NOW) =>
  render(<Timeline snapshot={snapshot(issues)} now={now} />)
const mark = (name: RegExp) => screen.getByTestId(`mark-${name.source}`)
const pct = (value: string) => parseFloat(value)

describe('타임라인', () => {
  beforeEach(() => {
    search = ''
  })

  it('줄을 누르면 Linear 이슈를 새 탭으로 연다', () => {
    show([started(1, '2026-11-10')])
    const link = screen.getByRole('link', { name: /티켓 1/ })
    expect(link).toHaveAttribute('href', 'https://linear.app/bukang/issue/BUK-1')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAccessibleName(/11\/2부터 11\/10까지/)
    expect(link.className).toMatch(/cursor-pointer/)
  })

  it('막대를 날짜 칸에 맞춰 그린다', () => {
    show([started(1, '2026-11-10')])
    const bar = mark(/i1/)
    // 11/2는 10/27부터 6번째 칸, 11/2~11/10은 9칸이다.
    expect(pct(bar.style.left)).toBeCloseTo((6 / 28) * 100)
    expect(pct(bar.style.width)).toBeCloseTo((9 / 28) * 100)
  })

  it('막대 끝에 기한 날짜를 적는다', () => {
    show([started(1, '2026-11-10')])
    expect(
      within(screen.getByRole('link', { name: /티켓 1/ })).getByText('11/10'),
    ).toBeInTheDocument()
  })

  it('상태마다 색을 나눈다: 진행 중 파랑, 시작 전 회색 마름모, 기한 지남 빨강, 오늘 마감 주황', () => {
    show([
      started(1, '2026-11-10'),
      issue(2, '2026-11-10'),
      issue(3, '2026-11-04'),
      issue(4, '2026-11-05'),
    ])
    expect(mark(/i1/).className).toMatch(/bg-accent/)
    expect(mark(/i2/).className).toMatch(/bg-muted/)
    expect(mark(/i2/).className).toMatch(/rotate-45/)
    expect(mark(/i3/).className).toMatch(/bg-danger/)
    expect(mark(/i4/).className).toMatch(/bg-warning/)
  })

  it('카드 위에 범례를 둔다', () => {
    show([started(1, '2026-11-10')])
    const legend = screen.getByRole('list', { name: '범례' })
    for (const text of ['진행 중', '시작 전', '기한 지남', '오늘 마감']) {
      expect(within(legend).getByText(text)).toBeInTheDocument()
    }
  })

  it('한국 시간 자정이 지나면 어제 기한이 기한 지남으로 바뀐다', () => {
    // UTC 11/5 15:00은 한국 시간 11/6 0시다.
    show([issue(1, '2026-11-05')], new Date('2026-11-05T15:00:00.000Z').getTime())
    expect(mark(/i1/).className).toMatch(/bg-danger/)
    expect(screen.getByRole('link', { name: /티켓 1/ })).toHaveAccessibleName(/기한 지남/)
  })

  it('마우스를 올리면 전체 제목, 담당자, 상태, 기간, 남은 날을 보여 준다', async () => {
    show([started(1, '2026-11-10')])
    // React Aria는 마우스가 한 번 움직인 뒤에만 툴팁을 연다. 실제로는 줄에 닿기 전에 마우스가 움직인다.
    await userEvent.hover(document.body)
    await userEvent.hover(screen.getByRole('link', { name: /티켓 1/ }))
    const tip = await screen.findByRole('tooltip')
    expect(tip).toHaveTextContent('BUK-1 티켓 1')
    expect(tip).toHaveTextContent('지훈')
    expect(tip).toHaveTextContent('진행 중')
    expect(tip).toHaveTextContent('11/2 ~ 11/10')
    expect(tip).toHaveTextContent('D-5')
  })

  it('오늘 칸에 「오늘 11/5」를 표시한다', () => {
    show([started(1, '2026-11-10')])
    expect(screen.getByText('오늘 11/5')).toBeInTheDocument()
  })

  it('기본은 4주 보기이고, 2주와 전체로 바꿀 수 있다', async () => {
    show([issue(1, '2026-11-20')])
    expect(screen.getByRole('radio', { name: '4주' })).toBeChecked()
    expect(screen.getByText('10/27')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('radio', { name: '2주' }))
    // 2주 보기는 11/14까지라 11/20 기한은 오른쪽 밖에 있다고 알려 준다.
    expect(screen.getByText('11/20 →')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('radio', { name: '전체' }))
    expect(screen.getByText('10/28')).toBeInTheDocument()
    expect(mark(/i1/)).toBeInTheDocument()
  })

  it('보기 범위보다 앞에 있는 기한은 왼쪽 끝에 날짜로 알려 준다', () => {
    show([issue(1, '2026-10-20')])
    expect(screen.getByText('← 10/20')).toBeInTheDocument()
  })

  it('기한 없는 티켓은 빼고 건수만 보여 준다', () => {
    show([issue(1, '2026-11-10'), issue(2, null), issue(3, null)])
    expect(screen.queryByText(/티켓 2/)).not.toBeInTheDocument()
    expect(screen.getByText('기한 없음 2건')).toBeInTheDocument()
  })

  it('묶음 이름 옆에 티켓 수를 보여 주고, 누르면 접는다', async () => {
    show([issue(1, '2026-11-10'), issue(2, '2026-11-11')])
    const toggle = screen.getByRole('button', { name: /지훈\s*2/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('link', { name: /티켓 1/ })).not.toBeInTheDocument()
  })

  it('담당자별로 묶고, 버튼으로 마일스톤별 묶음으로 바꾼다', async () => {
    show([
      issue(1, '2026-11-10', { milestone: { id: 'm1', name: '세미 발표', progress: 0.5 } }),
      issue(2, '2026-11-11', { assignee: null }),
    ])
    expect(screen.getByRole('region', { name: '지훈' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '담당 없음' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('radio', { name: '마일스톤별' }))
    expect(
      within(screen.getByRole('region', { name: '세미 발표' })).getByText(/티켓 1/),
    ).toBeInTheDocument()
    expect(
      within(screen.getByRole('region', { name: '마일스톤 없음' })).getByText(/티켓 2/),
    ).toBeInTheDocument()
  })

  it('주소의 필터를 적용한다', () => {
    search = 'assignee=none'
    show([issue(1, '2026-11-10'), issue(2, '2026-11-10', { assignee: null })])
    expect(screen.queryByText(/티켓 1/)).not.toBeInTheDocument()
    expect(screen.getByText(/티켓 2/)).toBeInTheDocument()
  })

  it('기한 있는 티켓이 없으면 빈 안내를 보여 준다', () => {
    show([issue(1, null)])
    expect(screen.getByText('기한이 있는 티켓이 없어요')).toBeInTheDocument()
    expect(screen.getByText('기한 없음 1건')).toBeInTheDocument()
  })

  it('휴대폰 폭에서는 차트 영역만 스크롤한다', () => {
    show([issue(1, '2026-11-10')])
    expect(screen.getByRole('region', { name: '타임라인 차트' }).className).toMatch(/overflow-auto/)
  })
})
