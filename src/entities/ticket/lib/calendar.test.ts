import { describe, expect, it } from 'vitest'

import type { Cycle } from '@/shared/api/linear'
import { kstDate } from '@/shared/lib/date'

import { dayTone, inCycle } from './calendar'

describe('달력 날짜 색', () => {
  it('지난 날은 빨강, 오늘은 주황, 그 밖은 회색이다', () => {
    expect(dayTone('2026-11-04', '2026-11-05')).toBe('danger')
    expect(dayTone('2026-11-05', '2026-11-05')).toBe('warning')
    expect(dayTone('2026-11-06', '2026-11-05')).toBe('default')
  })

  it('한국 시간 자정이 지나면 어제 기한은 지난 날이 된다', () => {
    const before = kstDate('2026-11-05T14:59:59.000Z')
    const after = kstDate('2026-11-05T15:00:00.000Z')
    expect(dayTone('2026-11-05', before)).toBe('warning')
    expect(dayTone('2026-11-05', after)).toBe('danger')
  })
})

describe('사이클 기간', () => {
  // 한국 시간 11/9(월) 0시부터 11/16(월) 0시 직전까지
  const cycles: Cycle[] = [
    {
      id: 'c1',
      number: 1,
      name: null,
      startsAt: '2026-11-08T15:00:00.000Z',
      endsAt: '2026-11-15T15:00:00.000Z',
    },
  ]

  it('시작일과 마지막 날은 들고, 끝 시각인 날은 들지 않는다', () => {
    expect(inCycle('2026-11-08', cycles)).toBe(false)
    expect(inCycle('2026-11-09', cycles)).toBe(true)
    expect(inCycle('2026-11-15', cycles)).toBe(true)
    expect(inCycle('2026-11-16', cycles)).toBe(false)
  })
})
