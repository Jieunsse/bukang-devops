import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ALL, parseDashboard } from '@/entities/grafana-dashboard'

const labelValues = vi.fn()
const queryPrometheusRange = vi.fn()
vi.mock('@/shared/api/grafana/server', () => ({
  labelValues: (...a: unknown[]) => labelValues(...a),
  queryPrometheusRange: (...a: unknown[]) => queryPrometheusRange(...a),
  getDashboardJson: vi.fn(),
}))

const { findPanel, queryPanel, resolveVariables } = await import('./server')

const config = { url: 'https://g', token: 't' }
const dashboard = parseDashboard('u', {
  dashboard: {
    panels: [
      {
        id: 7,
        type: 'timeseries',
        targets: [{ expr: 'up{job="$job",i=~"$node"}', legendFormat: '{{i}}' }],
      },
    ],
    templating: {
      list: [
        { name: 'job', type: 'query', query: 'label_values(up, job)' },
        {
          name: 'node',
          type: 'query',
          query: 'label_values(up{job="$job"}, i)',
          multi: true,
          includeAll: true,
        },
      ],
    },
  },
})

beforeEach(() => {
  labelValues.mockReset()
  queryPrometheusRange.mockReset()
  labelValues.mockImplementation(async (_c: unknown, label: string) =>
    label === 'job' ? ['b', 'a'] : ['n1', 'n2'],
  )
})

describe('변수 풀기', () => {
  it('목록에 없는 값(질의를 바꾸려는 값 포함)은 버리고 첫 값이나 「전체」를 고른다', async () => {
    const { states, values } = await resolveVariables(
      config,
      dashboard,
      { job: ['"} or vector(1) #'], node: ['nope'] },
      '1h',
    )
    expect(states.map((s) => s.selected)).toEqual([['a'], [ALL]])
    expect(values).toEqual({ job: ['a'], node: ['n1', 'n2'] })
    // 뒤 변수의 목록 질의에는 앞 변수 값이 들어간다
    expect(labelValues.mock.calls[1]![2]).toBe('up{job="a"}')
  })

  it('「전체」를 허용하지 않는 변수에는 「전체」를 받지 않고, 같은 값은 한 번만 쓴다', async () => {
    const { values } = await resolveVariables(
      config,
      dashboard,
      { job: [ALL], node: ['n1', 'n1', 'n1'] },
      '1h',
    )
    expect(values).toEqual({ job: ['a'], node: ['n1'] })
  })

  it('목록에 있는 값은 그대로 쓴다', async () => {
    const { values } = await resolveVariables(config, dashboard, { job: ['b'], node: ['n2'] }, '1h')
    expect(values).toEqual({ job: ['b'], node: ['n2'] })
  })
})

describe('패널 질의', () => {
  it('변수를 넣은 질의를 실행하고 범례 이름을 붙인다. 모두 실패하면 failed다', async () => {
    const panel = findPanel(dashboard, 7)!
    queryPrometheusRange.mockResolvedValueOnce([
      {
        labels: { i: 'n1' },
        points: [
          [0, 1],
          [60, Number.NaN],
        ],
      },
    ])
    const ok = await queryPanel(config, panel, { job: ['a'], node: ['n1', 'n2'] }, '1h')
    expect(queryPrometheusRange.mock.calls[0]![1]).toBe('up{job="a",i=~"(n1|n2)"}')
    expect(ok).toEqual({
      series: [
        {
          name: 'n1',
          labels: { i: 'n1' },
          points: [
            [0, 1],
            [60, null],
          ],
        },
      ],
      hiddenCount: 0,
      failed: false,
    })

    queryPrometheusRange.mockRejectedValueOnce(new Error('500'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect((await queryPanel(config, panel, {}, '1h')).failed).toBe(true)
    expect(findPanel(dashboard, 99)).toBeNull()
  })
})
