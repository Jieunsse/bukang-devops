import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { screenGroups } from '@/entities/api-flow'

import { ApiFlowView } from './ApiFlowView'

describe('API 명세', () => {
  it('처음에는 개요에 모든 화면에 같은 규칙이 보인다', () => {
    render(<ApiFlowView />)
    expect(screen.getByRole('heading', { name: 'API 명세' })).toBeInTheDocument()
    expect(screen.getByText('토큰 재발급')).toBeInTheDocument()
  })

  it('목차에서 화면 묶음을 고르면 그 묶음의 화면 표가 보인다', async () => {
    const user = userEvent.setup()
    const group = screenGroups()[0]!
    render(<ApiFlowView />)
    const toc = screen.getByRole('navigation', { name: 'API 명세 목차' })
    await user.click(within(toc).getByRole('button', { name: new RegExp(group.title) }))
    const table = screen.getByRole('table', { name: '화면별 보내는 요청' })
    expect(within(table).getByText(group.rows[0]!.name)).toBeInTheDocument()
  })

  it('찾기 칸에 글자를 넣으면 모든 묶음에서 찾은 화면과 요청이 보인다', async () => {
    const user = userEvent.setup()
    render(<ApiFlowView />)
    await user.type(screen.getByRole('searchbox', { name: '찾기' }), 'crews')
    expect(screen.getByRole('heading', { name: '「crews」 찾기' })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'API별 보내는 화면' })).toBeInTheDocument()
  })
})
