import { describe, expect, it } from 'vitest'

import { presentationCountdown } from './presentation'

// 최종 발표는 11/23(월)이다.
describe('최종 발표까지 남은 날짜', () => {
  it('남은 날을 D-n으로 쓴다', () => {
    expect(presentationCountdown('2026-11-05')).toEqual({ dateLabel: '11/23(월)', dDay: 'D-18' })
  })

  it('발표 당일은 D-day다', () => {
    expect(presentationCountdown('2026-11-23').dDay).toBe('D-day')
  })

  it('발표가 지나면 지난 날을 D+n으로 쓴다', () => {
    expect(presentationCountdown('2026-11-25').dDay).toBe('D+2')
  })

  it('한국 날짜 기준이라 하루 전이면 D-1이다', () => {
    expect(presentationCountdown('2026-11-22').dDay).toBe('D-1')
  })
})
