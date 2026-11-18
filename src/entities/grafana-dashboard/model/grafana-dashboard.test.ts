import { describe, expect, it } from 'vitest'

import { formatValues, interpolate, legendName } from './interpolate'
import { parseDashboard } from './parse'
import { formatUnit } from './units'

const time = { stepSeconds: 60, rangeSeconds: 3600, scrapeSeconds: 15 }

describe('대시보드 읽기', () => {
  it('새 형식은 row 패널 아래 패널을 묶고, 접힌 row의 안쪽 패널도 읽는다', () => {
    const d = parseDashboard('u', {
      dashboard: {
        title: '서버',
        panels: [
          { id: 1, type: 'stat', title: 'Up', targets: [{ expr: 'up' }] },
          { id: 2, type: 'row', title: 'CPU' },
          {
            id: 3,
            type: 'timeseries',
            title: 'Busy',
            targets: [{ expr: 'a', legendFormat: '{{cpu}}' }],
            fieldConfig: { defaults: { unit: 'percent' } },
          },
          {
            id: 4,
            type: 'row',
            title: 'Disk',
            collapsed: true,
            panels: [{ id: 5, type: 'graph', title: 'IO', targets: [{ expr: 'b' }] }],
          },
          { id: 6, type: 'text', title: '설명' },
        ],
      },
    })
    expect(d.sections.map((s) => [s.title, s.panels.map((p) => `${p.id}:${p.kind}`)])).toEqual([
      ['개요', ['1:stat']],
      ['CPU', ['3:timeseries']],
      ['Disk', ['5:timeseries']],
    ])
    expect(d.sections[1]!.panels[0]).toMatchObject({
      unit: 'percent',
      targets: [{ expr: 'a', legend: '{{cpu}}' }],
    })
  })

  it('옛 형식(rows)과 변수 질의 두 종류를 읽고, 숨긴 질의는 뺀다', () => {
    const d = parseDashboard('u', {
      dashboard: {
        rows: [
          {
            title: 'JVM',
            panels: [
              {
                id: 1,
                type: 'singlestat',
                targets: [{ expr: 'x' }, { expr: 'y', hide: true }],
                format: 'none',
              },
            ],
          },
        ],
        templating: {
          list: [
            { name: 'ds', type: 'datasource', query: 'prometheus' },
            {
              name: 'job',
              type: 'query',
              query: 'label_values(up{env="a"}, job)',
              multi: true,
              includeAll: true,
            },
            { name: 'app', type: 'query', query: { query: 'label_values(application)' } },
            { name: 'q', type: 'query', query: 'metrics(k6_http_req_duration_)' },
          ],
        },
      },
    })
    expect(d.sections[0]!.panels[0]).toMatchObject({
      kind: 'stat',
      unit: null,
      targets: [{ expr: 'x' }],
    })
    expect(d.variables.map((v) => [v.name, v.query])).toEqual([
      ['job', { kind: 'labelValues', selector: 'up{env="a"}', label: 'job' }],
      ['app', { kind: 'labelValues', selector: null, label: 'application' }],
      ['q', { kind: 'metrics', pattern: 'k6_http_req_duration_' }],
    ])
  })
})

describe('변수 바꾸기', () => {
  it('세 가지 표기와 시간 매크로를 바꾸고, 모르는 변수는 그대로 둔다', () => {
    const out = interpolate(
      'rate(x{job="$job",i="${node}",n=~"[[name]]",z="$zzz"}[$__rate_interval]) / $__interval',
      { job: ['node'], node: ['10.0.0.1:9100'], name: ['a', 'b.c'] },
      time,
    )
    expect(out).toBe('rate(x{job="node",i="10.0.0.1:9100",n=~"(a|b\\.c)",z="$zzz"}[75s]) / 60s')
  })

  it('수집 주기 × 4 가 더 크면 rate 구간은 그 값이다', () => {
    expect(interpolate('[$__rate_interval]', {}, { ...time, stepSeconds: 15 })).toBe('[60s]')
  })

  it('값 하나는 그대로 쓴다', () => {
    expect(formatValues(['a.b'])).toBe('a.b')
  })

  it('범례는 {{라벨}}을 바꾸고, 없으면 라벨을 이어 쓴다', () => {
    expect(legendName('{{cpu}} 사용', { cpu: '0' })).toBe('0 사용')
    expect(legendName('', { __name__: 'up', job: 'a' })).toBe('up{job="a"}')
    expect(legendName('', {})).toBe('값')
  })
})

describe('단위', () => {
  it('자주 쓰는 단위를 읽기 좋게 바꾼다', () => {
    expect(formatUnit(0.4567, 'percentunit')).toBe('45.7%')
    expect(formatUnit(1536, 'bytes')).toBe('1.5KiB')
    expect(formatUnit(2048, 'Bps')).toBe('2KiB/s')
    expect(formatUnit(0.13, 's')).toBe('130ms')
    expect(formatUnit(90, 's')).toBe('1.5분')
    expect(formatUnit(12_300, 'short')).toBe('12.3K')
    expect(formatUnit(3, 'reqps')).toBe('3 req/s')
    expect(formatUnit(1, 'bool_yes_no')).toBe('예')
    expect(formatUnit(Number.NaN, 'bytes')).toBe('-')
  })
})
