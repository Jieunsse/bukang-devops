import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { CONCLUSIONS, LOAD } from '@/entities/performance'

import { formatMs, PerformanceView } from './PerformanceView'

describe('성능 측정', () => {
  it('처음에는 개요가 열려 결론과 서비스별 결과가 보인다', () => {
    render(<PerformanceView />)
    for (const c of CONCLUSIONS) expect(screen.getByText(c)).toBeInTheDocument()
    const table = screen.getByRole('table', { name: '서비스별 결과 표' })
    for (const r of LOAD) expect(within(table).getByText(r.name)).toBeInTheDocument()
    const toc = screen.getByRole('navigation', { name: '성능 측정 목차' })
    expect(within(toc).getByRole('button', { name: '개요' })).toHaveAttribute(
      'aria-current',
      'true',
    )
  })

  it('목차에서 서비스를 고르면 그 서비스의 주소별 응답 시간이 보인다', async () => {
    const user = userEvent.setup()
    render(<PerformanceView />)
    const toc = screen.getByRole('navigation', { name: '성능 측정 목차' })
    await user.click(within(toc).getByRole('button', { name: /크루/ }))
    const table = screen.getByRole('table', { name: '크루 주소별 응답 시간' })
    expect(within(table).getByText('GET /member/crews/me')).toBeInTheDocument()
  })

  it('개요의 서비스 상자를 누르면 그 서비스 화면으로 간다', async () => {
    const user = userEvent.setup()
    render(<PerformanceView />)
    const cards = screen.getByRole('group', { name: '서비스별 결과' })
    await user.click(within(cards).getByRole('button', { name: /게시판/ }))
    expect(screen.getByRole('list', { name: '게시판 시간 순서' })).toBeInTheDocument()
  })

  it('측정 조건 화면에 smoke 결과가 있다', async () => {
    const user = userEvent.setup()
    render(<PerformanceView />)
    await user.click(screen.getByRole('button', { name: '측정 조건' }))
    expect(screen.getByRole('table', { name: '스크립트 확인 결과' })).toBeInTheDocument()
  })

  it('1초 미만은 ms로, 그 이상은 초로 적는다', () => {
    expect(formatMs(347)).toBe('347ms')
    expect(formatMs(14890)).toBe('14.9s')
  })
})
