import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { existsSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { REPORTS } from '../model/reports'
import { LinksView } from './LinksView'

const openReportAction = vi.fn()
vi.mock('@/shared/api/reports/actions', () => ({
  openReportAction: (...a: unknown[]) => openReportAction(...a),
}))

const URL_WITH_KEY = 'https://claude.ai/artifact/abc?sk=share-key'

beforeEach(() => {
  openReportAction.mockReset()
  URL.createObjectURL = vi.fn(() => 'blob:http://localhost/report')
  URL.revokeObjectURL = vi.fn()
})

async function openWithPassword(title: string, password: string) {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: new RegExp(title) }))
  const dialog = await screen.findByRole('dialog')
  await user.type(within(dialog).getByLabelText('팀 비밀번호'), `${password}{Enter}`)
  return user
}

describe('링크 모음', () => {
  it('리포트 상자만 보이고, 공유 키가 붙은 원본 주소는 보이지 않는다', () => {
    const { container } = render(<LinksView />)
    for (const r of REPORTS)
      expect(screen.getByRole('button', { name: new RegExp(r.title) })).toBeInTheDocument()
    expect(container.innerHTML).not.toContain('claude.ai')
  })

  it('상자를 누르면 비밀번호 창이 뜨고, 맞으면 창이 닫히고 리포트가 바로 보인다', async () => {
    openReportAction.mockResolvedValue({ ok: true, html: '<h1>리포트</h1>', url: URL_WITH_KEY })
    render(<LinksView />)

    const user = await openWithPassword('트랜잭션', 'team-secret')

    expect(openReportAction).toHaveBeenCalledWith('transaction', 'team-secret')
    expect(await screen.findByTitle('트랜잭션')).toHaveAttribute(
      'src',
      'blob:http://localhost/report#apply',
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: '원본 열기' })).toHaveAttribute('href', URL_WITH_KEY)
    await user.click(screen.getByRole('button', { name: '복사하기' }))
    expect(await navigator.clipboard.readText()).toBe(URL_WITH_KEY)
  })

  it('비밀번호가 틀리면 창에 오류를 보여 주고 리포트를 띄우지 않는다', async () => {
    openReportAction.mockResolvedValue({ ok: false, reason: 'password' })
    render(<LinksView />)

    await openWithPassword('카프카', 'wrong')

    expect(
      await within(screen.getByRole('dialog')).findByText('비밀번호가 맞지 않아요.'),
    ).toBeInTheDocument()
    expect(screen.queryByTitle('카프카')).not.toBeInTheDocument()
  })

  it('한 번 맞히면 목록으로 돌아가 다른 리포트를 눌러도 비밀번호를 다시 묻지 않는다', async () => {
    openReportAction.mockResolvedValue({ ok: true, html: '<h1>리포트</h1>', url: URL_WITH_KEY })
    render(<LinksView />)

    const user = await openWithPassword('종합점검', 'team-secret')
    await user.click(await screen.findByRole('button', { name: '링크 모음' }))
    await user.click(screen.getByRole('button', { name: /카프카/ }))

    expect(await screen.findByTitle('카프카')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(openReportAction).toHaveBeenLastCalledWith('kafka', 'team-secret')
  })

  it('리포트마다 암호화한 복사본이 있다', () => {
    for (const r of REPORTS) expect(existsSync(`reports/${r.slug}.enc.json`)).toBe(true)
  })
})
