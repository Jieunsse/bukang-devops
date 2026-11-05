import { describe, expect, it } from 'vitest'

import type { Cycle, Issue } from '@/shared/api/linear'

import { cycleProgress, dailyPace, presentationCountdown } from './presentation'

// 최종 발표는 11/23(월)이다.
describe('최종 발표까지 남은 날짜', () => {
  it('남은 날을 D-n으로 쓴다', () => {
    expect(presentationCountdown('2026-11-05')).toEqual({
      dateLabel: '11/23(월)',
      dDay: 'D-18',
      daysLeft: 18,
    })
  })

  it('발표 당일은 D-day이고 남은 날은 0이다', () => {
    expect(presentationCountdown('2026-11-23')).toMatchObject({ dDay: 'D-day', daysLeft: 0 })
  })

  it('발표가 지나면 D+n이고 남은 날은 음수가 아니라 0이다', () => {
    expect(presentationCountdown('2026-11-25')).toMatchObject({ dDay: 'D+2', daysLeft: 0 })
  })
})

describe('하루 평균 끝내야 하는 티켓 수', () => {
  it('남은 티켓 수를 남은 날 수로 나누고 소수 한 자리로 반올림한다', () => {
    expect(dailyPace(21, 18)).toBe(1.2)
    expect(dailyPace(10, 4)).toBe(2.5)
  })

  it('남은 티켓이 없으면 0이다', () => {
    expect(dailyPace(0, 18)).toBe(0)
  })

  it('남은 날이 없으면(발표 당일이나 지난 뒤) 셀 수 없다', () => {
    expect(dailyPace(5, 0)).toBeNull()
  })
})

const issue = (id: string, cycleId: string | null): Issue => ({
  id,
  identifier: `BUK-${id}`,
  title: id,
  url: `https://linear.app/x/issue/BUK-${id}`,
  dueDate: null,
  startedAt: null,
  state: { name: '할 일', type: 'unstarted' },
  assignee: null,
  labels: [],
  milestone: null,
  cycle: cycleId ? { id: cycleId } : null,
})
// 사이클 1: 한국 시간 11/9(월) 00:00 ~ 11/16(월) 00:00
const cycle1: Cycle = {
  id: 'c1',
  number: 1,
  name: null,
  startsAt: '2026-11-08T15:00:00.000Z',
  endsAt: '2026-11-15T15:00:00.000Z',
  completedIssueCount: 3,
}

describe('지금 사이클 카드', () => {
  it('사이클 안이면 이름은 「사이클 n 진행률」, 값은 완료 비율이다', () => {
    const now = '2026-11-10T03:00:00.000Z'
    // 완료 3 / 전체 5(완료 3 + 그 사이클의 남은 티켓 2)
    expect(
      cycleProgress(now, [cycle1], [issue('a', 'c1'), issue('b', 'c1'), issue('c', null)]),
    ).toEqual({ name: '사이클 1 진행률', value: '60%', ratio: 0.6, hint: '완료 3 / 전체 5' })
  })

  it('사이클 안인데 티켓이 하나도 없으면 0%다', () => {
    const empty = { ...cycle1, completedIssueCount: 0 }
    expect(cycleProgress('2026-11-10T03:00:00.000Z', [empty], [])).toMatchObject({
      value: '0%',
      ratio: 0,
    })
  })

  it('사이클 밖이면 이름은 「다음 사이클까지」, 값은 다음 사이클 첫날까지 D-n이다', () => {
    // 한국 시간 11/5(목) → 사이클 1 첫날 11/9(월)
    expect(cycleProgress('2026-11-05T03:00:00.000Z', [cycle1], [])).toEqual({
      name: '다음 사이클까지',
      value: 'D-4',
      ratio: null,
      hint: '사이클 1 · 11/9(월) 시작',
    })
  })

  it('사이클이 하나도 없으면 다음 사이클이 없다고 쓴다', () => {
    expect(cycleProgress('2026-11-05T03:00:00.000Z', [], [])).toEqual({
      name: '다음 사이클',
      value: '없음',
      ratio: null,
      hint: null,
    })
  })
})
