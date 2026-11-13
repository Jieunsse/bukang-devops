import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { REPORTS } from '../model/reports'
import { ReportView } from './ReportView'

const openReportAction = vi.fn()
vi.mock('@/shared/api/reports/actions', () => ({
  openReportAction: (...a: unknown[]) => openReportAction(...a),
}))

describe('리포트 화면', () => {
  beforeEach(() => openReportAction.mockReset())

  it('처음에는 리포트 없이 비밀번호 칸만 보인다', () => {
    render(<ReportView report={REPORTS[0]} />)
    expect(screen.getByLabelText('팀 비밀번호')).toBeInTheDocument()
    expect(screen.queryByTitle('종합점검')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '복사하기' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '원본 열기' })).not.toBeInTheDocument()
  })

  it('비밀번호가 틀리면 리포트를 띄우지 않고 오류를 보여 준다', async () => {
    openReportAction.mockResolvedValue({ ok: false, reason: 'password' })
    const user = userEvent.setup()
    render(<ReportView report={REPORTS[0]} />)

    await user.type(screen.getByLabelText('팀 비밀번호'), 'wrong')
    await user.click(screen.getByRole('button', { name: '보기' }))

    expect(openReportAction).toHaveBeenCalledWith('overall', 'wrong')
    expect(await screen.findByText('비밀번호가 맞지 않아요.')).toBeInTheDocument()
    expect(screen.queryByTitle('종합점검')).not.toBeInTheDocument()
  })

  it('비밀번호가 맞으면 받은 HTML을 띄우고, 원본 주소 복사와 열기를 보여 준다', async () => {
    const url = 'https://claude.ai/artifact/abc?sk=share-key'
    openReportAction.mockResolvedValue({ ok: true, html: '<h1>리포트</h1>', url })
    const user = userEvent.setup()
    render(<ReportView report={REPORTS[0]} />)

    await user.type(screen.getByLabelText('팀 비밀번호'), 'team-secret{Enter}')

    expect((await screen.findByTitle('종합점검')).getAttribute('srcdoc')).toBe('<h1>리포트</h1>')
    expect(screen.getByRole('link', { name: '원본 열기' }).getAttribute('href')).toBe(url)
    await user.click(screen.getByRole('button', { name: '복사하기' }))
    expect(await navigator.clipboard.readText()).toBe(url)
    expect(screen.getByRole('button', { name: '복사됨' })).toBeInTheDocument()
  })
})
