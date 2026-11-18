import { describe, expect, it } from 'vitest'

import type { ServiceRow } from './rows'
import { issuesOf, sortByIssues, totalErrorTrend, verdictOf } from './verdict'

const row = (name: string, o: Partial<ServiceRow> = {}): ServiceRow => ({
  job: `${name}-service`,
  name,
  up: true,
  rps: 1,
  errorRatio: 0,
  p95Seconds: 0.1,
  heapBytes: null,
  ...o,
})

describe('요약 판정', () => {
  it('응답 없음, 오류 1% 초과, p95 1초 초과를 문제로 본다(기준값과 같으면 정상)', () => {
    expect(issuesOf(row('a', { up: false, errorRatio: 0.02, p95Seconds: 1.5 }))).toEqual([
      'down',
      'errors',
      'slow',
    ])
    expect(issuesOf(row('b', { errorRatio: 0.01, p95Seconds: 1 }))).toEqual([])
    expect(issuesOf(row('c', { errorRatio: null, p95Seconds: null }))).toEqual([])
  })

  it('문제 많은 서비스가 위로 오고, 판정에 이름과 전체 오류 비율·가장 느린 곳·응답 없는 수가 들어간다', () => {
    const rows = [
      row('회원'),
      row('주문', { rps: 3, errorRatio: 0.1, p95Seconds: 2 }),
      row('예치금', { rps: 1, errorRatio: 0.02 }),
    ]
    expect(sortByIssues(rows).map((r) => r.name)).toEqual(['주문', '예치금', '회원'])
    const v = verdictOf(rows, [
      { job: 'mysql', name: 'MySQL', instance: 'x', up: false },
      { job: 'redis', name: 'Redis', instance: 'y', up: true },
    ])
    // 서비스 행에 없는 MySQL이 멈춘 것도 문제로 센다
    expect(v.problemServices).toEqual(['주문', '예치금', 'MySQL'])
    expect(v.totalErrorRatio).toBeCloseTo((0 + 0.3 + 0.02) / 5)
    expect(v.slowest).toEqual({ name: '주문', p95Seconds: 2 })
    expect(v.downCount).toBe(1)
  })

  it('요청이 없으면 전체 오류 비율을 모른다', () => {
    expect(verdictOf([row('a', { rps: null })], []).totalErrorRatio).toBeNull()
  })
})

describe('전체 오류 비율 추이', () => {
  it('요청 수로 가중 평균하고, 요청이 없는 시각은 비운다', () => {
    const errors = [
      {
        job: 'a',
        name: 'A',
        points: [
          [0, 0.5],
          [60, null],
        ] as [number, number | null][],
      },
      {
        job: 'b',
        name: 'B',
        points: [
          [0, 0],
          [60, null],
        ] as [number, number | null][],
      },
    ]
    const rps = [
      {
        job: 'a',
        name: 'A',
        points: [
          [0, 1],
          [60, null],
        ] as [number, number | null][],
      },
      {
        job: 'b',
        name: 'B',
        points: [
          [0, 3],
          [60, null],
        ] as [number, number | null][],
      },
    ]
    expect(totalErrorTrend(errors, rps)).toEqual([
      [0, 0.125],
      [60, null],
    ])
  })
})
