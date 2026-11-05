import { describe, expect, it } from 'vitest'

import { presentationCountdown } from './presentation'

// 프로젝트 시작 10/28, 최종 발표 11/23(월). 26일 동안이다.
describe('최종 발표까지 남은 날짜', () => {
  it('남은 날 수와 시작일부터 지난 비율을 센다', () => {
    expect(presentationCountdown('2026-11-05')).toEqual({
      dateLabel: '11/23(월)',
      daysLeft: 18,
      elapsedRatio: 8 / 26,
    })
  })

  it('시작 전이면 지난 비율은 0이다', () => {
    expect(presentationCountdown('2026-10-20').elapsedRatio).toBe(0)
  })

  it('발표 당일은 남은 날이 0이고 막대가 다 찬다', () => {
    expect(presentationCountdown('2026-11-23')).toMatchObject({ daysLeft: 0, elapsedRatio: 1 })
  })

  it('발표가 지나면 남은 날은 음수가 아니라 0이다', () => {
    expect(presentationCountdown('2026-11-25')).toMatchObject({ daysLeft: 0, elapsedRatio: 1 })
  })
})
