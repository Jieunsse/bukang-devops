import { describe, expect, it } from 'vitest'

import {
  formatStatsDayWithWeekday,
  resolveStatsPeriod,
  seoulToday,
  parseStatsPeriodKind,
  spanDates,
} from './period'

describe('resolveStatsPeriod', () => {
  it('지난 7일은 어제에서 끝나고, 앞 기간은 그 바로 앞 7일이다', () => {
    expect(resolveStatsPeriod('7d', '2026-11-02')).toEqual({
      current: { start: '2026-10-26', end: '2026-11-01' },
      previous: { start: '2026-10-19', end: '2026-10-25' },
    })
  })

  it('지난 30일은 달을 넘어 계산한다', () => {
    expect(resolveStatsPeriod('30d', '2026-03-01')).toEqual({
      current: { start: '2026-01-30', end: '2026-02-28' },
      previous: { start: '2025-12-31', end: '2026-01-29' },
    })
  })
})

describe('parseStatsPeriodKind', () => {
  it('30d만 지난 30일이고, 없거나 모르는 값은 지난 7일이다', () => {
    expect(parseStatsPeriodKind('30d')).toBe('30d')
    expect(parseStatsPeriodKind(undefined)).toBe('7d')
    expect(parseStatsPeriodKind('90d')).toBe('7d')
    expect(parseStatsPeriodKind(['30d'])).toBe('7d')
  })
})

describe('seoulToday', () => {
  it('UTC로 전날 밤이어도 한국 날짜를 준다', () => {
    expect(seoulToday(new Date('2026-11-01T16:30:00Z'))).toBe('2026-11-02')
  })
})

describe('날짜 표시', () => {
  it('요일을 붙여 짧게 쓰고, 기간의 날짜를 차례로 늘어놓는다', () => {
    expect(formatStatsDayWithWeekday('2026-10-26')).toBe('10/26 (월)')
    expect(spanDates({ start: '2026-10-31', end: '2026-11-02' })).toEqual([
      '2026-10-31',
      '2026-11-01',
      '2026-11-02',
    ])
  })
})
