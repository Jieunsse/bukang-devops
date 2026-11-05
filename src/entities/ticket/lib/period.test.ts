import { describe, expect, it } from 'vitest'

import type { Cycle } from '@/shared/api/linear'

import { beforeCycleLabel, currentPeriod, periodBadge } from './period'

// 사이클 7: 한국 시간 11/9(월) 00:00 ~ 11/16(월) 00:00
const cycle7: Cycle = {
  id: 'c7',
  number: 7,
  name: null,
  startsAt: '2026-11-08T15:00:00.000Z',
  endsAt: '2026-11-15T15:00:00.000Z',
}

describe('지금 기간', () => {
  it('사이클 시작 시각이면 그 사이클 안이다', () => {
    expect(currentPeriod('2026-11-08T15:00:00.000Z', [cycle7])).toEqual({
      kind: 'cycle',
      cycle: cycle7,
      start: '2026-11-09',
      end: '2026-11-15',
    })
  })

  it('사이클 끝 시각이 되면 사이클 밖이다', () => {
    // 한국 시간 11/16(월) 00:00 → 그 주 일요일 11/22까지
    expect(currentPeriod('2026-11-15T15:00:00.000Z', [cycle7])).toEqual({
      kind: 'outside',
      start: '2026-11-16',
      end: '2026-11-22',
    })
  })

  it('사이클이 없으면 오늘부터 이번 주 일요일까지다', () => {
    // 한국 시간 11/5(목)
    expect(currentPeriod('2026-11-05T03:00:00.000Z', [])).toEqual({
      kind: 'outside',
      start: '2026-11-05',
      end: '2026-11-08',
    })
  })

  it('오늘이 일요일이면 사이클 밖 기간은 오늘 하루다', () => {
    expect(currentPeriod('2026-11-08T03:00:00.000Z', [])).toEqual({
      kind: 'outside',
      start: '2026-11-08',
      end: '2026-11-08',
    })
  })

  it('일요일 전에 다음 사이클이 시작하면 그 전날까지만 사이클 밖이다', () => {
    // 다음 사이클이 한국 시간 11/7(토) 00:00에 시작
    const next: Cycle = { ...cycle7, startsAt: '2026-11-06T15:00:00.000Z' }
    expect(currentPeriod('2026-11-05T03:00:00.000Z', [next])).toEqual({
      kind: 'outside',
      start: '2026-11-05',
      end: '2026-11-06',
    })
  })

  it('사이클 끝이 한국 자정이 아니어도 끝 시각이 속한 날까지다', () => {
    const odd: Cycle = { ...cycle7, endsAt: '2026-11-15T20:00:00.000Z' }
    expect(currentPeriod('2026-11-10T00:00:00.000Z', [odd])).toMatchObject({
      kind: 'cycle',
      end: '2026-11-16',
    })
  })
})

describe('기간 배지', () => {
  it('사이클 안이면 사이클 이름, 요일을 붙인 기간, 며칠째인지를 준다', () => {
    // 한국 시간 11/11(수) → 사이클 7의 3일째
    expect(periodBadge('2026-11-11T03:00:00.000Z', [cycle7])).toEqual({
      chip: '사이클 7',
      inCycle: true,
      range: '11/9(월) ~ 11/15(일)',
      dayOf: '3일째 / 7일',
    })
  })

  it('사이클 밖이면 「사이클 n 시작 전」 칩과 이번 주 끝까지의 기간을 준다', () => {
    // 한국 시간 11/5(목) → 다음 사이클 7은 11/9(월) 시작
    expect(periodBadge('2026-11-05T03:00:00.000Z', [cycle7])).toEqual({
      chip: '사이클 7 시작 전',
      inCycle: false,
      range: '11/5(목) ~ 11/8(일)',
      dayOf: null,
    })
  })

  it('다음 사이클이 없으면 「사이클 없음」이다', () => {
    expect(periodBadge('2026-11-20T03:00:00.000Z', [cycle7]).chip).toBe('사이클 없음')
    expect(beforeCycleLabel('2026-11-05T03:00:00.000Z', [])).toBe('사이클 없음')
  })
})
