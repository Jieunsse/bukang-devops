import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { resolveStatsPeriod } from '@/entities/usage-stats'

import { AnalyticsView } from './AnalyticsView'

const period = resolveStatsPeriod('7d', '2026-11-12')
const empty = {
  status: 'ok' as const,
  kind: '7d' as const,
  period,
  realtime: null,
  visitors: null,
  purchases: null,
  buyer: null,
  seller: null,
  formErrors: null,
}

describe('이용 통계', () => {
  it('GA4 키가 없으면 연결 정보 안내만 보인다', () => {
    render(<AnalyticsView data={{ status: 'notConfigured' }} />)
    expect(screen.getByText('GA4 연결 정보가 없어요')).toBeInTheDocument()
    expect(screen.queryByText('지금 접속 중')).not.toBeInTheDocument()
  })

  it('실패한 영역만 불러오지 못했다고 보이고 나머지는 숫자가 보인다', () => {
    render(
      <AnalyticsView
        data={{ ...empty, realtime: { activeUsers: 1234, topScreens: [] }, formErrors: [] }}
      />,
    )
    expect(screen.getByText('1,234명')).toBeInTheDocument()
    expect(screen.getByText('이 기간에는 입력 오류가 없어요')).toBeInTheDocument()
    // 방문자·구매·구매 단계·판매자 단계 네 영역
    expect(screen.getAllByRole('alert')).toHaveLength(4)
  })

  it('고른 기간 버튼에 현재 위치 표시가 붙는다', () => {
    render(
      <AnalyticsView
        data={{ ...empty, kind: '30d', period: resolveStatsPeriod('30d', '2026-11-12') }}
      />,
    )
    expect(screen.getByRole('link', { name: '지난 30일' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: '지난 7일' })).not.toHaveAttribute('aria-current')
  })
})
