import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MonitoringView, ServicesSection } from './MonitoringView'

describe('모니터링', () => {
  it('그라파나 연결 정보가 없으면 안내만 보인다', () => {
    render(<MonitoringView data={{ status: 'notConfigured' }} />)
    expect(screen.getByText('그라파나 연결 정보가 없어요')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('판정에 문제 있는 서비스 이름을 보이고, 표는 문제 순으로 정렬하며 기준을 넘은 값만 빨강이다', () => {
    render(
      <MonitoringView
        data={{
          status: 'ok',
          fetchedAt: '2026-11-18T01:00:00Z',
          partial: true,
          trends: { errors: null, rps: null, p95: null, heap: null },
          brief: [],
          resources: [],
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
              rpsPeak: null,
              over2sRatio: null,
              cpu: null,
              heapRatio: null,
              dbActive: null,
              dbMax: null,
              dbPending: null,
            },
            {
              job: 'member-service',
              name: '회원',
              up: true,
              rps: 0.5,
              errorRatio: 0.02,
              p95Seconds: 0.376,
              heapBytes: 93_340_632,
              rpsPeak: null,
              over2sRatio: null,
              cpu: null,
              heapRatio: null,
              dbActive: null,
              dbMax: null,
              dbPending: null,
            },
          ],
        }}
      />,
    )
    expect(screen.getByText(/문제 2곳/)).toBeInTheDocument()
    expect(screen.getByText('주문, 회원')).toBeInTheDocument()
    expect(screen.getByText('1곳')).toHaveClass('text-danger')
    const rows = within(screen.getByRole('table', { name: '서비스별 지표' })).getAllByRole('row')
    expect(rows[1]).toHaveTextContent('주문')
    const member = within(screen.getByRole('table', { name: '서비스별 지표' }))
      .getByText('회원')
      .closest('tr')!
    expect(within(member).getByText('2.0%')).toHaveClass('text-danger')
    expect(within(member).getByText('376ms')).not.toHaveClass('text-danger')
    expect(within(member).getByText('89MB')).toBeInTheDocument()
    expect(screen.getByText(/일부 지표 받지 못함/)).toBeInTheDocument()
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
            errors: [{ job: 'member-service', name: '회원', points: series([0, 0.03]) }],
            rps: [{ job: 'member-service', name: '회원', points: series([1, 2]) }],
            p95: [{ job: 'member-service', name: '회원', points: series([0.1, 0.25]) }],
            heap: null,
          },
          brief: [],
          resources: [],
        }}
      />,
    )
    // 지표를 다 받았고 문제가 없으면 「모두 정상」
    expect(screen.getByText('모두 정상')).toBeInTheDocument()
    // 기본은 서버 오류 비율이고, 맨 위 큰 그래프는 요청 수로 가중한 전체 오류 비율이다
    expect(screen.getByText('지금 3.0%')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /^전체 서버 오류 비율 최근 1시간/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '초당 요청' }))
    expect(screen.getByText('지금 2.00')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '응답 시간(95%)' }))
    expect(screen.getByText('지금 250ms')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '힙 메모리' }))
    expect(screen.getByText('힙 메모리 추이를 받지 못했어요')).toBeInTheDocument()
  })

  it('서비스 표에 TPS 지금·최대, 응답 시간 등급, 2초 넘은 비율, CPU, 힙 사용률, DB 연결을 보이고 기준을 넘은 값만 빨강이다', () => {
    const base = {
      up: true,
      rps: 12,
      rpsPeak: 30,
      errorRatio: 0,
      heapBytes: 200 * 1024 * 1024,
      dbPending: 0,
    }
    render(
      <ServicesSection
        partial={false}
        services={[
          {
            ...base,
            job: 'order-service',
            name: '주문',
            p95Seconds: 2.4,
            over2sRatio: 0.06,
            cpu: 0.85,
            heapRatio: 0.95,
            dbActive: 10,
            dbMax: 10,
            dbPending: 3,
          },
          {
            ...base,
            job: 'member-service',
            name: '회원',
            p95Seconds: 0.7,
            over2sRatio: 0,
            cpu: 0.2,
            heapRatio: 0.4,
            dbActive: 2,
            dbMax: 10,
          },
          {
            ...base,
            job: 'gateway',
            name: '게이트웨이',
            p95Seconds: 0.1,
            over2sRatio: 0,
            cpu: 0.1,
            heapRatio: 0.3,
            dbActive: null,
            dbMax: null,
            dbPending: null,
          },
        ]}
      />,
    )
    const table = within(screen.getByRole('table', { name: '서비스별 지표' }))
    const order = table.getByText('주문').closest('tr')!
    expect(order).toHaveTextContent('12.0 / 30.0')
    expect(within(order).getByText(/2400ms/)).toHaveClass('text-danger')
    expect(within(order).getByText('실패')).toBeInTheDocument()
    expect(within(order).getByText('6.0%')).toHaveClass('text-danger')
    expect(within(order).getByText('85.0%')).toHaveClass('text-danger')
    expect(within(order).getByText(/95\.0%/)).toHaveClass('text-danger')
    expect(within(order).getByText(/10 \/ 10/)).toHaveClass('text-danger')
    expect(within(order).getByText(/대기 3/)).toHaveClass('text-danger')
    const member = table.getByText('회원').closest('tr')!
    // 500ms를 넘으면 빨강이지만 2초 전에는 「실패」가 붙지 않는다
    expect(within(member).getByText(/700ms/)).toHaveClass('text-danger')
    expect(within(member).queryByText('실패')).not.toBeInTheDocument()
    expect(within(member).getByText('2 / 10')).not.toHaveClass('text-danger')
    expect(within(member).getByText('20.0%')).not.toHaveClass('text-danger')
    // DB를 쓰지 않는 게이트웨이는 연결 칸이 「-」
    const gw = table.getByText('게이트웨이').closest('tr')!
    expect(within(gw).getAllByText('-').length).toBeGreaterThan(0)
  })
})
