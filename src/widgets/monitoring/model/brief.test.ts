import { describe, expect, it } from 'vitest'

import { buildBrief, firstAtOrAbove, nameOf, peakOf, topByPeak } from './brief'

// 2026-11-18 00:30 KST부터 1분 간격
const T0 = Date.UTC(2026, 10, 17, 15, 30) / 1000
const s = (name: string, values: (number | null)[]) => ({
  name,
  points: values.map((v, i): [number, number | null] => [T0 + i * 60, v]),
})
const f = {
  reqps: (v: number) => `${v}`,
  percentunit: (v: number) => `${Math.round(v * 100)}%`,
  s: (v: number) => `${v}s`,
  short: (v: number) => `${v}`,
}
const none = { throughput: null, cpu: null, latency: null, dbConn: null, pending: null, lock: null }

describe('자동 브리핑', () => {
  it('최댓값과 시각, 기준을 처음 넘은 시각을 찾는다', () => {
    const x = s('a', [1, null, 5, 3])
    expect(peakOf(x)).toEqual({ value: 5, at: T0 + 120 })
    expect(firstAtOrAbove(x, 3)).toBe(T0 + 120)
    expect(firstAtOrAbove(x, 9)).toBeNull()
    expect(topByPeak([s('a', [1]), s('b', [3]), s('c', [2])], 2).map((y) => y.name)).toEqual([
      'b',
      'c',
    ])
  })

  it('job·instance 이름을 화면 이름으로 바꾼다', () => {
    expect(nameOf({ job: 'order-service' })).toBe('주문')
    expect(nameOf({ instance: 'ip-10-0-1-145' })).toBe('앱 서버')
    expect(nameOf({})).toBe('전체')
  })

  it('병목이 생긴 1시간을 숫자로 설명하고, 기준을 넘은 것만 주의 문장을 단다', () => {
    const cards = buildBrief(
      {
        throughput: [s('전체', [0, 10, 16, 2])],
        cpu: [s('앱 서버', [0.2, 0.9, 1, 0.3]), s('데이터 서버', [0.1, 0.4, 0.6, 0.2])],
        latency: [s('주문', [0.13, 0.5, 2, 0.2]), s('예치금', [0.025, 0.04, 0.045, 0.03])],
        dbConn: [s('주문', [0.1, 0.5, 1, 0.2])],
        pending: [s('주문', [5, 0, 148, 0])],
        lock: [s('MySQL', [0.2, 5, 25, 0])],
      },
      f,
    )
    const by = Object.fromEntries(cards.map((c) => [c.key, c]))
    expect(by.throughput!.caption).toBe('초당 0 → 최대 16(00:32)')
    expect(by.cpu!.alert).toBe('앱 서버 CPU가 00:31부터 80%를 넘었어요(최대 100%).')
    expect(by.latency!.caption).toBe('가장 느린 곳 주문: 0.13s → 최대 2s(00:32)')
    expect(by.latency!.alert).toContain('주문 응답 시간이 00:32에 2s')
    expect(by.dbConn!.caption).toBe('주문: 00:32부터 연결을 모두 사용')
    expect(by.pending!.caption).toBe('주문: 5건 → 최대 148건(00:32)')
    expect(by.lock!.caption).toBe('초당 0.2회 → 최대 25회(00:32)')
    expect(by.lock!.alert).toContain('초당 25회')
  })

  it('조용한 1시간에는 주의 문장이 없고, 못 받은 지표는 그렇다고 쓴다', () => {
    const cards = buildBrief(
      {
        ...none,
        cpu: [s('앱 서버', [0.1, 0.2])],
        pending: [s('주문', [0, 0])],
        lock: [s('MySQL', [0, 0])],
      },
      f,
    )
    expect(cards.every((c) => c.alert === null)).toBe(true)
    expect(cards.find((c) => c.key === 'pending')!.caption).toBe('대기 없음')
    expect(cards.find((c) => c.key === 'lock')!.caption).toBe('락 대기 없음')
    expect(cards.find((c) => c.key === 'dbConn')!.caption).toBe('지표를 받지 못했어요')
  })
})
