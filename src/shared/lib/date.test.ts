import { describe, expect, it } from 'vitest'

import { addDays, daysBetween, kstDate, weekdayOf } from './date'

describe('한국 시간 날짜', () => {
  it('UTC 14:59는 한국 23:59라 같은 날이다', () => {
    expect(kstDate('2026-11-05T14:59:59.999Z')).toBe('2026-11-05')
  })

  it('UTC 15:00은 한국 자정이라 다음 날이다', () => {
    expect(kstDate('2026-11-05T15:00:00.000Z')).toBe('2026-11-06')
  })

  it('날짜를 더하면 달이 넘어간다', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01')
  })

  it('요일은 일요일이 0이다', () => {
    expect(weekdayOf('2026-11-08')).toBe(0)
    expect(weekdayOf('2026-11-05')).toBe(4)
  })

  it('두 날짜 사이의 날 수를 센다', () => {
    expect(daysBetween('2026-11-05', '2026-11-23')).toBe(18)
    expect(daysBetween('2026-11-05', '2026-11-02')).toBe(-3)
  })
})
