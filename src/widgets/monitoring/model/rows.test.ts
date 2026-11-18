import { describe, expect, it } from 'vitest'

import { sumTrends, toServiceRows, toTargets, toTrends } from './rows'

const up = (job: string, value: number, instance = 'i') => ({ labels: { job, instance }, value })
const v = (job: string, value: number) => ({ labels: { job }, value })

describe('모니터링 행 만들기', () => {
  it('멈춘 대상이 먼저 오고, job 이름은 화면 이름으로 바뀐다', () => {
    const targets = toTargets([up('mysql', 1), up('order-service', 0), up('unknown-job', 1)])
    expect(targets.map((t) => [t.name, t.up])).toEqual([
      ['주문', false],
      ['MySQL', true],
      ['unknown-job', true],
    ])
  })

  it('서비스만 표에 넣고, 5xx 시계열이 없으면 오류 비율은 0이다', () => {
    const targets = toTargets([up('member-service', 1), up('gateway', 1), up('redis', 1)])
    const rows = toServiceRows(targets, {
      rps: [v('member-service', 2), v('gateway', 4)],
      errors: [v('gateway', 1)],
      p95: [v('member-service', 0.3)],
      heap: null,
    })
    expect(rows.map((r) => r.name)).toEqual(['게이트웨이', '회원'])
    expect(rows[0]).toMatchObject({ errorRatio: 0.25, p95Seconds: null, heapBytes: null })
    expect(rows[1]).toMatchObject({ rps: 2, errorRatio: 0, p95Seconds: 0.3 })
  })

  it('요청이 없거나 오류 질의가 실패하면 오류 비율을 모른다', () => {
    const targets = toTargets([up('file-service', 1), up('ai-service', 1)])
    const rows = toServiceRows(targets, {
      rps: [v('file-service', 0)],
      errors: null,
      p95: [v('ai-service', Number.NaN)],
      heap: null,
    })
    expect(rows.find((r) => r.job === 'file-service')?.errorRatio).toBeNull()
    expect(rows.find((r) => r.job === 'ai-service')).toMatchObject({ rps: null, p95Seconds: null })
  })
})

describe('추이 만들기', () => {
  const range = (job: string, values: number[]) => ({
    labels: { job },
    points: values.map((v, i): [number, number] => [i * 60, v]),
  })

  it('서비스만 남기고, NaN은 끊긴 점(null)이 된다', () => {
    const trends = toTrends([range('order-service', [1, Number.NaN]), range('mysql', [3, 3])])
    expect(trends).toEqual([
      {
        job: 'order-service',
        name: '주문',
        points: [
          [0, 1],
          [60, null],
        ],
      },
    ])
  })

  it('시각마다 서비스 값을 더하고, 모두 비면 null이다', () => {
    const trends = toTrends([
      range('order-service', [1, Number.NaN, Number.NaN]),
      range('member-service', [2, 3, Number.NaN]),
    ])
    expect(sumTrends(trends)).toEqual([
      [0, 3],
      [60, 3],
      [120, null],
    ])
  })
})
