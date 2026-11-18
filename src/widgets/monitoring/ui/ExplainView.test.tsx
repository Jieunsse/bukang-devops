import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { MonitoringData } from '../model/load'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('../api/actions', () => ({ refreshMonitoringAction: vi.fn() }))

const { ExplainView } = await import('./ExplainView')

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
          name: '주문',
          points: [
            [T(0), 0.026],
            [T(2), 1.2],
            [T(4), 0.022],
          ],
        },
      ],
    },
  ],
  resources: [{ name: '앱 서버', memory: 0.95, disk: 0.78, swap: null }],
} as unknown as Extract<MonitoringData, { status: 'ok' }>
const links = [{ uid: 'jvm-uid', name: 'JVM' }]

describe('AI 리포트', () => {
  it('판정·요약·그래프 카드·원인 점검·자원 막대·서비스·할 일 링크를 보여 주고, 기준을 넘은 값만 빨강이다', () => {
    render(
      <ExplainView
        data={data}
        links={links}
        result={{
          status: 'ok',
          explanation: {
            summary: '주문 응답 시간이 잠깐 1초를 넘었어요.',
            watch: [
              {
                metric: 'latency',
                target: '주문',
                title: '주문 응답 시간',
                note: '예매가 느렸을 수 있어요',
              },
            ],
            causes: [{ label: 'DB 연결·락', verdict: '아님', evidence: '대기 0건' }],
            nextSteps: [{ tab: 'JVM', action: '주문 GC 확인' }],
            createdAt: '2026-11-18T12:05:00Z',
          },
        }}
      />,
    )
    expect(screen.getByText('모두 정상')).toBeInTheDocument()
    expect(screen.getByText('주문 응답 시간이 잠깐 1초를 넘었어요.')).toBeInTheDocument()
    expect(screen.getByText(/21:05 기준/)).toBeInTheDocument()
    const card = screen.getByRole('article', { name: '주문 응답 시간' })
    expect(within(card).getByText('1.2초').closest('span')).toHaveClass('text-danger')
    expect(within(card).getByRole('img', { name: /그래프/ })).toBeInTheDocument()
    expect(screen.getByText('대기 0건')).toBeInTheDocument()
    expect(screen.getByText('95.0%')).toHaveClass('text-danger')
    expect(screen.getByText('78.0%')).not.toHaveClass('text-danger')
    expect(screen.getByText('특이 사항 없음 · 1곳 정상')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'JVM 탭' })).toHaveAttribute(
      'href',
      '/monitoring/jvm-uid',
    )
  })

  it('AI 연결이 없어도 코드가 그리는 자원 막대와 서비스 줄은 보이고, 새로고침 버튼은 없다', () => {
    render(<ExplainView data={data} links={links} result={{ status: 'notConfigured' }} />)
    expect(screen.getByText('AI 연결 정보가 없어요')).toBeInTheDocument()
    expect(screen.getByText('특이 사항 없음 · 1곳 정상')).toBeInTheDocument()
    expect(screen.getByRole('list', { name: '기준까지 남은 양' })).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('실패하면 받지 못했다고 보이고 다시 시도할 수 있다', () => {
    render(<ExplainView data={data} links={links} result={{ status: 'failed' }} />)
    expect(screen.getByText('AI 리포트를 받지 못했어요')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '지표와 AI 리포트 새로 받기' })).toBeInTheDocument()
  })
})
