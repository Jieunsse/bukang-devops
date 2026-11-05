import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { DoneIssue } from '@/shared/api/linear'

import { DoneList } from './DoneList'
import { RangeForm } from './RangeForm'

let search = ''
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/done',
  useSearchParams: () => new URLSearchParams(search),
}))

const done = (n: number, closedAt: string, extra: Partial<DoneIssue> = {}): DoneIssue => ({
  id: `i${n}`,
  identifier: `BUK-${n}`,
  title: `티켓 ${n}`,
  url: `https://linear.app/bukang/issue/BUK-${n}`,
  dueDate: null,
  startedAt: null,
  closedAt,
  state: { name: '완료', type: 'completed' },
  assignee: { id: 'u1', name: '지훈' },
  labels: [{ id: 'l1', name: '프론트' }],
  milestone: { id: 'm1', name: '세미 발표', progress: 0.5 },
  ...extra,
})

const issues = [
  // UTC 11/4 16:00은 한국 시간 11/5 01:00이다.
  done(1, '2026-11-04T16:00:00.000Z'),
  done(2, '2026-11-03T01:00:00.000Z', {
    state: { name: '취소', type: 'canceled' },
    assignee: null,
    milestone: null,
  }),
]

describe('완료·취소 목록', () => {
  beforeEach(() => {
    search = ''
  })

  it('완료와 취소 수를 보여 준다', () => {
    render(<DoneList issues={issues} />)
    expect(screen.getByText('완료 1건 · 취소 1건')).toBeInTheDocument()
  })

  it('한 줄에 결과, 한국 날짜로 닫힌 날, 담당 없음, 마일스톤 없음을 적고 Linear로 이어진다', () => {
    render(<DoneList issues={issues} />)
    const first = screen.getByRole('row', { name: /티켓 1/ })
    expect(within(first).getByText('완료')).toBeInTheDocument()
    expect(within(first).getByText('11/5')).toBeInTheDocument()
    expect(within(first).getByRole('link', { name: /티켓 1/ })).toHaveAttribute(
      'href',
      'https://linear.app/bukang/issue/BUK-1',
    )
    const second = screen.getByRole('row', { name: /티켓 2/ })
    expect(within(second).getByText('취소')).toBeInTheDocument()
    expect(within(second).getByText('담당 없음')).toBeInTheDocument()
    expect(within(second).getByText('마일스톤 없음')).toBeInTheDocument()
  })

  it('긴 마일스톤 이름은 말줄임 없이 줄바꿈하지 않는 칸에 두고, 제목은 잘라도 전체를 마우스 올림 설명으로 남긴다', () => {
    const long = '메시지 전달 안정화와 아주 긴 마일스톤 이름'
    render(
      <DoneList
        issues={[
          done(3, '2026-11-04T16:00:00.000Z', { milestone: { id: 'm9', name: long, progress: 0 } }),
        ]}
      />,
    )
    const row = screen.getByRole('row', { name: /티켓 3/ })
    const milestone = within(row).getByText(long)
    expect(milestone.closest('td')).toHaveClass('whitespace-nowrap')
    expect(milestone).not.toHaveClass('truncate')
    expect(within(row).getByRole('link', { name: '티켓 3' })).toHaveAttribute('title', '티켓 3')
    expect(within(row).getByRole('link', { name: '티켓 3' })).toHaveClass('truncate')
  })

  it('필터를 바꿔도 마일스톤 칸 폭은 받은 목록 전체의 가장 긴 이름에 맞춘 그대로다', () => {
    const long = '메시지 전달 안정화와 아주 긴 마일스톤 이름'
    const list = [
      done(4, '2026-11-04T16:00:00.000Z', { milestone: { id: 'm9', name: long, progress: 0 } }),
      done(5, '2026-11-04T16:00:00.000Z', { assignee: { id: 'u2', name: '소희' } }),
    ]
    const widthNow = () => screen.getByRole('columnheader', { name: '마일스톤' }).style.width
    const { rerender } = render(<DoneList issues={list} />)
    const before = widthNow()
    search = 'assignee=u2'
    rerender(<DoneList issues={[...list]} />)
    expect(screen.queryByText('티켓 4')).not.toBeInTheDocument()
    expect(widthNow()).toBe(before)
  })

  it('라벨 칩은 대시보드와 같이 Linear 라벨 색을 쓴다', () => {
    render(
      <DoneList
        issues={[
          done(6, '2026-11-04T16:00:00.000Z', {
            labels: [{ id: 'l1', name: '백엔드', color: '#bec2c8' }],
          }),
        ]}
      />,
    )
    const chip = screen.getByText('백엔드').closest('.chip') as HTMLElement
    expect(chip.style.backgroundColor).toMatch(/#bec2c8|rgb\(190, 194, 200\)/)
  })

  it('주소의 필터를 적용한다', () => {
    search = 'milestone=none'
    render(<DoneList issues={issues} />)
    expect(screen.queryByText('티켓 1')).not.toBeInTheDocument()
    expect(screen.getByText('티켓 2')).toBeInTheDocument()
  })

  it('티켓이 없으면 빈 안내를 보여 준다', () => {
    render(<DoneList issues={[]} />)
    expect(screen.getByText('이 기간에 완료하거나 취소한 티켓이 없어요')).toBeInTheDocument()
  })
})

describe('기간 고르기', () => {
  const range = { start: '2026-10-23', end: '2026-11-05' }
  const setDates = (start: string, end: string) => {
    fireEvent.change(screen.getByLabelText('시작일'), { target: { value: start } })
    fireEvent.change(screen.getByLabelText('종료일'), { target: { value: end } })
  }

  it('고른 기간을 넘긴다', async () => {
    const onSubmit = vi.fn()
    render(<RangeForm range={range} onSubmit={onSubmit} />)
    setDates('2026-10-01', '2026-10-31')
    await userEvent.click(screen.getByRole('button', { name: '적용' }))
    expect(onSubmit).toHaveBeenCalledWith({ start: '2026-10-01', end: '2026-10-31' })
  })

  it('시작일이 종료일보다 늦으면 이유를 보여 주고 넘기지 않는다', async () => {
    const onSubmit = vi.fn()
    render(<RangeForm range={range} onSubmit={onSubmit} />)
    setDates('2026-11-05', '2026-11-01')
    await userEvent.click(screen.getByRole('button', { name: '적용' }))
    expect(await screen.findByText('시작일이 종료일보다 늦어요.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('90일보다 긴 기간은 이유를 보여 주고 넘기지 않는다', async () => {
    const onSubmit = vi.fn()
    render(<RangeForm range={range} onSubmit={onSubmit} />)
    setDates('2026-01-01', '2026-11-05')
    await userEvent.click(screen.getByRole('button', { name: '적용' }))
    expect(await screen.findByText('기간은 90일까지 고를 수 있어요.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
