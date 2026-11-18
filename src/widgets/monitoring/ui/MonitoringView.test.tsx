import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MonitoringView } from './MonitoringView'

describe('모니터링', () => {
  it('그라파나 연결 정보가 없으면 안내만 보인다', () => {
    render(<MonitoringView data={{ status: 'notConfigured' }} />)
    expect(screen.getByText('그라파나 연결 정보가 없어요')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('정상 수와 서비스 지표를 보여 주고, 받지 못한 지표는 - 로 보인다', () => {
    render(
      <MonitoringView
        data={{
          status: 'ok',
          fetchedAt: '2026-11-18T01:00:00Z',
          partial: true,
          trends: { rps: null, p95: null, heap: null },
          targets: [
            { job: 'order-service', name: '주문', instance: 'a', up: false },
            { job: 'member-service', name: '회원', instance: 'b', up: true },
            { job: 'mysql', name: 'MySQL', instance: 'c', up: true },
          ],
          services: [
            {
              job: 'order-service',
              name: '주문',
              up: false,
              rps: null,
              errorRatio: null,
              p95Seconds: null,
              heapBytes: null,
            },
            {
              job: 'member-service',
              name: '회원',
              up: true,
              rps: 0.5,
              errorRatio: 0.02,
              p95Seconds: 0.376,
              heapBytes: 93_340_632,
            },
          ],
        }}
      />,
    )
    expect(screen.getByText('1 / 2')).toBeInTheDocument()
    expect(screen.getByText('1 / 1')).toBeInTheDocument()
    const member = within(screen.getByRole('table', { name: '서비스별 지표' }))
      .getByText('회원')
      .closest('tr')!
    expect(within(member).getByText('2.0%')).toBeInTheDocument()
    expect(within(member).getByText('376ms')).toBeInTheDocument()
    expect(within(member).getByText('89MB')).toBeInTheDocument()
    expect(screen.getByText(/일부 지표를 받지 못해/)).toBeInTheDocument()
  })

  it('추이 지표를 바꾸면 서비스 그래프가 그 지표로 바뀐다', () => {
    const series = (values: number[]) => values.map((v, i): [number, number] => [i * 60, v])
    render(
      <MonitoringView
        data={{
          status: 'ok',
          fetchedAt: '2026-11-18T01:00:00Z',
          partial: false,
          targets: [{ job: 'member-service', name: '회원', instance: 'b', up: true }],
          services: [],
          trends: {
            rps: [{ job: 'member-service', name: '회원', points: series([1, 2]) }],
            p95: [{ job: 'member-service', name: '회원', points: series([0.1, 0.25]) }],
            heap: null,
          },
        }}
      />,
    )
    expect(screen.getAllByText('지금 2.00')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: '응답 시간(95%)' }))
    expect(screen.getByText('지금 250ms')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '힙 메모리' }))
    expect(screen.getByText('힙 메모리 추이를 받지 못했어요')).toBeInTheDocument()
  })
})
