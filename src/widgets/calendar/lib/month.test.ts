import { describe, expect, it } from 'vitest'

import type { Issue } from '@/shared/api/linear'

import { issuesByDate, monthLabel, monthWeeks, schedulesByDate, shiftMonth } from './month'

const issue = (n: number, dueDate: string | null, assigneeId: string | null = 'u1'): Issue => ({
  id: `i${n}`,
  identifier: `BUK-${n}`,
  title: `티켓 ${n}`,
  url: `https://linear.app/x/issue/BUK-${n}`,
  dueDate,
  startedAt: null,
  state: { name: '할 일', type: 'unstarted' },
  assignee: assigneeId ? { id: assigneeId, name: assigneeId } : null,
  labels: [],
  milestone: null,
})

describe('월 달력 칸', () => {
  it('월요일에 시작하는 주로 나누고 앞뒤 달 날짜로 첫 주와 마지막 주를 채운다', () => {
    const weeks = monthWeeks('2026-11')
    expect(weeks).toHaveLength(6)
    expect(weeks.every((w) => w.length === 7)).toBe(true)
    expect(weeks[0]?.[0]).toBe('2026-10-26')
    expect(weeks[0]?.[6]).toBe('2026-11-01')
    expect(weeks[5]?.[6]).toBe('2026-12-06')
  })

  it('1일이 월요일이고 말일이 일요일이면 앞뒤 달 날짜를 넣지 않는다', () => {
    // 2027년 2월은 월요일에 시작해 일요일에 끝난다.
    const weeks = monthWeeks('2027-02')
    expect(weeks).toHaveLength(4)
    expect(weeks[0]?.[0]).toBe('2027-02-01')
    expect(weeks[3]?.[6]).toBe('2027-02-28')
  })

  it('달을 옮기면 해가 바뀌는 곳도 넘어간다', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2026-11', 0)).toBe('2026-11')
  })

  it('달 이름은 「2026년 11월」로 쓴다', () => {
    expect(monthLabel('2026-11')).toBe('2026년 11월')
  })
})

describe('날짜별 티켓', () => {
  it('기한 날짜마다 티켓을 모으고 기한 없는 티켓은 뺀다', () => {
    const byDate = issuesByDate([issue(1, '2026-11-05'), issue(2, '2026-11-05'), issue(3, null)])
    expect(byDate.get('2026-11-05')?.map((i) => i.identifier)).toEqual(['BUK-1', 'BUK-2'])
    expect(byDate.size).toBe(1)
  })
})

describe('일정 칸', () => {
  const schedule = (id: string, start: string, end: string) => ({ id, title: id, start, end })

  it('기간 일정은 시작일부터 종료일까지 모든 날에 들어간다', () => {
    const byDate = schedulesByDate(
      [schedule('a', '2026-11-30', '2026-12-02'), schedule('b', '2026-12-01', '2026-12-01')],
      ['2026-11-29', '2026-11-30', '2026-12-01', '2026-12-02', '2026-12-03'],
    )
    expect(byDate.get('2026-11-29')).toBeUndefined()
    expect(byDate.get('2026-11-30')?.map((s) => s.id)).toEqual(['a'])
    expect(byDate.get('2026-12-01')?.map((s) => s.id)).toEqual(['a', 'b'])
    expect(byDate.get('2026-12-02')?.map((s) => s.id)).toEqual(['a'])
    expect(byDate.get('2026-12-03')).toBeUndefined()
  })
})
