import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { CONCLUSIONS, LOAD } from '@/entities/performance'

import { formatMs, PerformanceView } from './PerformanceView'

describe('성능 측정', () => {
  it('결론과 서비스 카드가 먼저 보이고, 처음에는 게시판 상세가 열려 있다', () => {
    render(<PerformanceView />)
    for (const c of CONCLUSIONS) expect(screen.getByText(c)).toBeInTheDocument()
    const cards = screen.getByRole('group', { name: '서비스별 결과' })
    for (const r of LOAD) expect(within(cards).getByText(r.name)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /게시판/, pressed: true })).toBeInTheDocument()
    expect(screen.getByRole('grid', { name: '게시판 시간 순서' })).toBeInTheDocument()
  })

  it('서비스 카드를 누르면 그 서비스의 주소별 응답 시간이 보인다', async () => {
    const user = userEvent.setup()
    render(<PerformanceView />)
    await user.click(screen.getByRole('button', { name: /크루/ }))
    const table = screen.getByRole('grid', { name: '크루 주소별 응답 시간' })
    expect(within(table).getByText('GET /member/crews/me')).toBeInTheDocument()
    expect(screen.queryByRole('grid', { name: '게시판 시간 순서' })).not.toBeInTheDocument()
  })

  it('측정 조건과 smoke 결과는 접혀 있다가 누르면 펼쳐진다', async () => {
    const user = userEvent.setup()
    render(<PerformanceView />)
    expect(screen.queryByRole('grid', { name: '스크립트 확인 결과' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /스크립트 확인/ }))
    expect(screen.getByRole('grid', { name: '스크립트 확인 결과' })).toBeInTheDocument()
  })

  it('1초 미만은 ms로, 그 이상은 초로 적는다', () => {
    expect(formatMs(347)).toBe('347ms')
    expect(formatMs(14890)).toBe('14.9s')
  })
})
