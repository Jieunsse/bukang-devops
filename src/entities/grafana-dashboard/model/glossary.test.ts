import { describe, expect, it } from 'vitest'

import { panelLabel, sectionLabel } from './glossary'
import { colorLevel, levelOf, parseDashboard } from './parse'

const t = (expr: string) => [{ refId: 'A', expr, legend: '' }]

describe('읽기 쉬운 이름', () => {
  it('아는 패널은 뜻과 읽는 법, 원래 이름을 함께 준다', () => {
    expect(panelLabel({ title: 'RAM Used', targets: t('x') })).toMatchObject({
      name: '메모리 사용률',
      original: 'RAM Used',
    })
    expect(panelLabel({ title: 'RAM Used', targets: t('x') }).help).toContain('90%')
  })

  it('모르는 패널은 원래 이름, 이름 없는 패널은 질의 지표로 이름을 붙인다', () => {
    expect(panelLabel({ title: 'Foo', targets: t('x') })).toEqual({
      name: 'Foo',
      original: null,
      help: null,
      ignoreThresholds: false,
      spec: null,
    })
    expect(
      panelLabel({ title: '', targets: t('node_memory_MemTotal_bytes{instance="a"}') }).name,
    ).toBe('전체 메모리')
    expect(
      panelLabel({ title: '', targets: t('count(count(node_cpu_seconds_total{a="b"}) by (cpu))') })
        .name,
    ).toBe('CPU 코어 수')
    expect(panelLabel({ title: '', targets: t('up') }).name).toBe('이름 없는 지표')
    expect(sectionLabel('Quick Facts')).toEqual({ name: '한눈에 보기', original: 'Quick Facts' })
  })
})

describe('그라파나 기준값', () => {
  it('색 이름·hex·rgba를 위험·주의·정상으로 읽는다', () => {
    expect(['red', 'dark-red', '#d44a3a', 'rgba(245, 54, 54, 0.9)'].map(colorLevel)).toEqual([
      'bad',
      'bad',
      'bad',
      'bad',
    ])
    expect(['orange', 'dark-yellow', 'rgba(237, 129, 40, 0.89)'].map(colorLevel)).toEqual([
      'warn',
      'warn',
      'warn',
    ])
    expect(['green', 'dark-green', '#299c46', undefined].map(colorLevel)).toEqual([
      'ok',
      'ok',
      'ok',
      'ok',
    ])
  })

  it('새 형식과 옛 형식 기준값을 읽고, 값이 속한 단계를 고른다(낮을수록 위험한 기준도)', () => {
    const d = parseDashboard('u', {
      dashboard: {
        panels: [
          {
            id: 1,
            type: 'gauge',
            targets: [{ expr: 'a' }],
            fieldConfig: {
              defaults: {
                thresholds: {
                  steps: [
                    { color: 'green', value: null },
                    { color: 'orange', value: 80 },
                    { color: 'red', value: 90 },
                  ],
                },
              },
            },
          },
          {
            id: 2,
            type: 'singlestat',
            targets: [{ expr: 'b' }],
            thresholds: '300,3600',
            colors: ['#d44a3a', 'orange', 'green'],
          },
        ],
      },
    })
    const [high, low] = d.sections[0]!.panels
    expect([50, 85, 95].map((v) => levelOf(high!.steps, v))).toEqual(['ok', 'warn', 'bad'])
    expect([10, 600, 7200].map((v) => levelOf(low!.steps, v))).toEqual(['bad', 'warn', 'ok'])
    expect(levelOf([], 1)).toBe('ok')
  })

  it('그라파나가 자동으로 넣었지만 화면에 안 쓰는 기준값은 읽지 않는다', () => {
    const auto = {
      thresholds: {
        steps: [
          { color: 'green', value: null },
          { color: 'red', value: 80 },
        ],
      },
    }
    const d = parseDashboard('u', {
      dashboard: {
        panels: [
          {
            id: 1,
            type: 'timeseries',
            targets: [{ expr: 'a' }],
            fieldConfig: { defaults: { ...auto, custom: { thresholdsStyle: { mode: 'off' } } } },
          },
          {
            id: 2,
            type: 'timeseries',
            targets: [{ expr: 'b' }],
            fieldConfig: { defaults: { ...auto, color: { mode: 'thresholds' } } },
          },
          {
            id: 3,
            type: 'stat',
            targets: [{ expr: 'c' }],
            options: { colorMode: 'none' },
            fieldConfig: { defaults: auto },
          },
          { id: 4, type: 'gauge', targets: [{ expr: 'd' }], fieldConfig: { defaults: auto } },
        ],
      },
    })
    expect(d.sections[0]!.panels.map((p) => p.steps.length)).toEqual([0, 2, 0, 2])
    expect(colorLevel('#FADE2A')).toBe('warn')
  })

  it('원본 기준값이 맞지 않는 패널은 판정에 쓰지 않는다고 표시한다', () => {
    expect(panelLabel({ title: 'Current QPS', targets: t('x') }).ignoreThresholds).toBe(true)
    expect(panelLabel({ title: 'RAM Used', targets: t('x') }).ignoreThresholds).toBe(false)
    expect(panelLabel({ title: '', targets: t('node_memory_SwapTotal_bytes') }).spec).toBe('스왑')
  })
})
