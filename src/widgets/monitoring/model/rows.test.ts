import { describe, expect, it } from 'vitest'

import { toServiceRows, toTargets } from './rows'

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
