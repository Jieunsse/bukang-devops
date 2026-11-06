import { describe, expect, it } from 'vitest'

import type { Issue } from '@/shared/api/linear'

import {
  issuesByDate,
  monthLabel,
  monthWeeks,
  moveRange,
  schedulesByDate,
  shiftMonth,
} from './month'

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
  it('일요일에 시작하는 주로 나누고 앞뒤 달 날짜로 첫 주와 마지막 주를 채운다', () => {
    // 2026년 12월은 화요일에 시작해 목요일에 끝난다.
    const weeks = monthWeeks('2026-12')
    expect(weeks).toHaveLength(5)
    expect(weeks.every((w) => w.length === 7)).toBe(true)
    expect(weeks[0]?.[0]).toBe('2026-11-29')
    expect(weeks[0]?.[2]).toBe('2026-12-01')
    expect(weeks[4]?.[6]).toBe('2027-01-02')
  })

  it('1일이 일요일이고 말일이 토요일이면 앞뒤 달 날짜를 넣지 않는다', () => {
    // 2026년 2월은 일요일에 시작해 토요일에 끝난다.
    const weeks = monthWeeks('2026-02')
    expect(weeks).toHaveLength(4)
    expect(weeks[0]?.[0]).toBe('2026-02-01')
    expect(weeks[3]?.[6]).toBe('2026-02-28')
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
  const schedule = (id: string, start: string, end: string) => ({
    id,
    title: id,
    start,
    end,
    color: 'blue' as const,
  })

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

describe('일정 옮기기', () => {
  it('끌어 온 날짜에서 놓은 날짜까지 떨어진 만큼 시작일과 종료일을 함께 옮긴다', () => {
    const s = { start: '2026-11-14', end: '2026-11-16' }
    // 기간 일정의 가운데(15일)를 잡아 20일에 놓으면 5일 뒤로 옮겨진다.
    expect(moveRange(s, '2026-11-15', '2026-11-20')).toEqual({
      start: '2026-11-19',
      end: '2026-11-21',
    })
    // 달을 넘어 앞으로 옮길 수도 있다.
    expect(moveRange(s, '2026-11-14', '2026-10-31')).toEqual({
      start: '2026-10-31',
      end: '2026-11-02',
    })
  })
})
