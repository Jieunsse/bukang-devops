import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MonitoringTabs } from './MonitoringTabs'

describe('모니터링 탭', () => {
  it('대시보드 목록이 비어도 요약과 상세 지표로 갈 수 있고, 지금 탭을 표시한다', () => {
    render(<MonitoringTabs links={[]} current="detail" />)
    expect(screen.getByRole('link', { name: '요약' })).toHaveAttribute('href', '/monitoring')
    expect(screen.getByRole('link', { name: '상세 지표' })).toHaveAttribute('aria-current', 'page')
  })
})
