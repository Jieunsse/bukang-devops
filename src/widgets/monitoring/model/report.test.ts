import { describe, expect, it } from 'vitest'

import { BRIEF_FORMAT } from './format'
import type { MonitoringData } from './load'
import { resolveWatch, resourceBars, serviceLine, tabHref } from './report'

type Ok = Extract<MonitoringData, { status: 'ok' }>

const T = (m: number) => Date.UTC(2026, 10, 18, 11, 54 + m) / 1000 // 20:54 KST부터
const data = {
  status: 'ok',
  fetchedAt: '2026-11-18T12:00:00Z',
  partial: false,
  targets: [{ job: 'order-service', name: '주문', instance: 'a', up: true }],
  services: [
    {
      job: 'order-service',
      name: '주문',
      up: true,
      rps: 1,
      errorRatio: 0,
      p95Seconds: 0.02,
      heapBytes: null,
      rpsPeak: null,
      over2sRatio: null,
      cpu: null,
      heapRatio: null,
      dbActive: null,
      dbMax: null,
      dbPending: null,
    },
  ],
  trends: { errors: null, rps: null, p95: null, heap: null },
  brief: [
    {
      key: 'latency',
      title: '응답 시간(95%)',
      unit: 's',
      caption: '',
      alert: null,
      series: [
        {
          name: '상품',
          points: [
            [T(0), 0.03],
            [T(1), 0.038],
            [T(2), 0.03],
          ],
        },
        {
          name: '주문',
          points: [
            [T(0), 0.026],
            [T(2), 0.416],
            [T(4), 0.022],
          ],
        },
      ],
    },
    {
      key: 'cpu',
      title: 'CPU',
      unit: 'percentunit',
      caption: '',
      alert: null,
      series: [
        {
          name: '앱 서버',
          points: [
            [T(0), 0.1],
            [T(1), 0.13],
          ],
        },
      ],
    },
    {
      key: 'dbConn',
      title: 'DB 연결 사용률',
      unit: 'percentunit',
      caption: '',
      alert: null,
      series: [
        {
          name: '상품',
          points: [
            [T(0), 0.1],
            [T(1), 0],
          ],
        },
      ],
    },
  ],
  resources: [{ name: '앱 서버', memory: 0.814, disk: 0.78, swap: null }],
} as unknown as Ok

describe('리포트 계산(코드가 하는 부분)', () => {
  it('눈여겨볼 카드는 AI가 고른 지표·대상의 최대값·시각·지금 값을 브리핑 표기로 보여 준다', () => {
    const w = resolveWatch(data, {
      metric: 'latency',
      target: '주문',
      title: '주문 응답 시간',
      note: '잠깐 올랐어요',
    })
    expect(w).toMatchObject({
      title: '주문 응답 시간',
      value: BRIEF_FORMAT.s(0.416),
      at: '20:56',
      sub: `지금 ${BRIEF_FORMAT.s(0.022)} · 기준 500ms`,
      note: '잠깐 올랐어요',
    })
    expect(w?.points).toHaveLength(3)
  })

  it('자원 지표는 그래프 없이 지금 값과 기준까지 남은 양을 보여 준다', () => {
    expect(
      resolveWatch(data, {
        metric: 'memory',
        target: '앱 서버',
        title: '앱 서버 메모리',
        note: '',
      }),
    ).toMatchObject({ value: '81.4%', at: null, sub: '기준 90%까지 8.6%p', points: null })
  })

  it('AI가 고른 대상을 못 찾으면 다른 대상 숫자를 대신 쓰지 않고 카드를 뺀다', () => {
    expect(
      resolveWatch(data, { metric: 'latency', target: '없음', title: 't', note: '' }),
    ).toBeNull()
    expect(
      resolveWatch(data, { metric: 'memory', target: '없음', title: 't', note: '' }),
    ).toBeNull()
    expect(resolveWatch(data, { metric: 'lock', target: 'MySQL', title: 't', note: '' })).toBeNull()
  })

  it('기준과 같은 값의 판정이 상세 탭 브리핑과 같다(응답 시간만 초과, 나머지는 이상)', () => {
    const at = (key: string, unit: string, v: number) =>
      ({
        ...data,
        brief: [
          {
            key,
            title: '',
            unit,
            caption: '',
            alert: null,
            series: [{ name: '주문', points: [[T(0), v]] }],
          },
        ],
      }) as unknown as typeof data
    const w = (d: typeof data, metric: 'dbConn' | 'pending' | 'latency') =>
      resolveWatch(d, { metric, target: '주문', title: 't', note: '' })?.danger
    expect(w(at('dbConn', 'percentunit', 1), 'dbConn')).toBe(true)
    expect(w(at('pending', 'short', 1), 'pending')).toBe(true)
    expect(w(at('latency', 's', 0.5), 'latency')).toBe(false)
  })

  it('자원 막대는 서버별 CPU·메모리·디스크와 DB 연결을 기준과 함께 준다', () => {
    expect(resourceBars(data)).toEqual([
      { label: '앱 서버 CPU', ratio: 0.13, limit: 0.8, text: '13%' },
      { label: '앱 서버 메모리', ratio: 0.814, limit: 0.9, text: '81.4%' },
      { label: '앱 서버 디스크', ratio: 0.78, limit: 0.9, text: '78.0%' },
      { label: 'DB 연결 최대', ratio: 0, limit: 1, text: '0%' },
    ])
  })

  it('서비스 줄은 문제가 없으면 정상 수를, 있으면 이름을 쓴다', () => {
    expect(serviceLine(data)).toBe('특이 사항 없음 · 1곳 정상')
    const bad = { ...data, services: [{ ...data.services[0]!, up: false }] }
    expect(serviceLine(bad)).toBe('문제 1곳: 주문')
  })

  it('할 일의 탭 이름을 대시보드 주소로 바꾼다', () => {
    const links = [
      { uid: 'node', name: '서버' },
      { uid: 'k6', name: '부하 테스트(k6)' },
    ]
    expect(tabHref('서버', links)).toBe('/monitoring/node')
    expect(tabHref('부하 테스트', links)).toBe('/monitoring/k6')
    expect(tabHref('MySQL', links)).toBeNull()
  })
})
