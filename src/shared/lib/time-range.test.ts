import { describe, expect, it } from 'vitest'

import {
  cacheSecondsOf,
  clockText,
  parseRange,
  RANGES,
  rangeEnd,
  rangeHref,
  SCRAPE_SECONDS,
  spansOverDay,
  type RangeKey,
} from './time-range'

describe('시간 범위', () => {
  it('그라파나 목록처럼 5분부터 7일까지 열 개이고 기본은 1시간이다', () => {
    expect(Object.keys(RANGES)).toEqual([
      '5m',
      '15m',
      '30m',
      '1h',
      '3h',
      '6h',
      '12h',
      '24h',
      '2d',
      '7d',
    ])
    expect(parseRange('6h')).toBe('6h')
    expect(parseRange('30d')).toBe('1h')
    expect(parseRange('')).toBe('1h')
    expect(parseRange(undefined)).toBe('1h')
    expect(parseRange(['6h'])).toBe('1h')
  })

  it('그래프 점은 약 240개이고, 간격은 수집 간격(15초)보다 짧지 않다', () => {
    const points = (r: RangeKey) => RANGES[r].seconds / RANGES[r].step
    expect(points('7d')).toBeGreaterThanOrEqual(230)
    expect(points('7d')).toBeLessThanOrEqual(240)
    expect(points('1h')).toBe(240)
    // 5분은 15초 간격이면 점이 20개뿐이지만, 수집 간격보다 촘촘하게 물으면 같은 값이 반복될 뿐이다
    expect(RANGES['5m'].step).toBe(SCRAPE_SECONDS)
    for (const r of Object.keys(RANGES) as RangeKey[])
      expect(RANGES[r].step).toBeGreaterThanOrEqual(SCRAPE_SECONDS)
  })

  it('1시간 이하는 60초, 3시간부터는 5분 캐시하고, 끝 시각을 캐시 단위로 맞춘다', () => {
    expect(cacheSecondsOf('1h')).toBe(60)
    expect(cacheSecondsOf('5m')).toBe(60)
    expect(cacheSecondsOf('3h')).toBe(300)
    expect(cacheSecondsOf('7d')).toBe(300)
    const now = Date.UTC(2026, 10, 18, 12, 7, 31)
    expect(rangeEnd('1h', now)).toBe(Date.UTC(2026, 10, 18, 12, 7) / 1000)
    expect(rangeEnd('7d', now)).toBe(Date.UTC(2026, 10, 18, 12, 5) / 1000)
  })

  it('24시간 이상인 그래프는 시각에 날짜를 붙인다(한국 시간)', () => {
    const t = Date.UTC(2026, 10, 18, 11, 56) / 1000 // 20:56 KST
    expect(clockText(t)).toBe('20:56')
    expect(clockText(t, true)).toBe('11/18 20:56')
    const series = (span: number): [number, number | null][] => [
      [t - span, 1],
      [t, 2],
    ]
    expect(spansOverDay(series(23 * 3600))).toBe(false)
    expect(spansOverDay(series(24 * 3600))).toBe(true)
    expect(spansOverDay(series(2 * 24 * 3600))).toBe(true)
    expect(spansOverDay([])).toBe(false)
  })

  it('기간을 바꾸는 주소는 다른 값(대상 고르기)을 남기고 range만 바꾼다', () => {
    expect(rangeHref('/monitoring/jvm', 'range=1h&v.job=order', '7d')).toBe(
      '/monitoring/jvm?range=7d&v.job=order',
    )
    expect(rangeHref('/monitoring', '', '6h')).toBe('/monitoring?range=6h')
  })

  it('탭을 옮길 때 기본(1시간)이 아니면 기간을 붙인다', () => {
    expect(rangeHref('/monitoring/detail', '', '1h')).toBe('/monitoring/detail')
  })
})
