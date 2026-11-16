import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { LOAD } from '@/entities/performance'

import { formatMs, PerformanceView } from './PerformanceView'

describe('성능 측정', () => {
  it('서비스별 결과 표에 측정한 서비스가 모두 나온다', () => {
    render(<PerformanceView />)
    const table = screen.getByRole('grid', { name: '서비스별 결과' })
    for (const r of LOAD) expect(within(table).getByText(r.name)).toBeInTheDocument()
    expect(within(table).getByText('47초 만에 무너져 자동 중단')).toBeInTheDocument()
  })

  it('서비스 탭을 바꾸면 그 서비스의 주소별 응답 시간이 보인다', async () => {
    const user = userEvent.setup()
    render(<PerformanceView />)
    expect(screen.getByRole('grid', { name: '게시판 시간 순서' })).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: '크루' }))
    const table = await screen.findByRole('grid', { name: '크루 주소별 응답 시간' })
    expect(within(table).getByText('GET /member/crews/me')).toBeInTheDocument()
  })

  it('1초 미만은 ms로, 그 이상은 초로 적는다', () => {
    expect(formatMs(347)).toBe('347ms')
    expect(formatMs(14890)).toBe('14.9s')
  })
})
