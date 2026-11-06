import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ScheduleCalendar } from './ScheduleCalendar'

const actions = vi.hoisted(() => ({
  listSchedulesAction: vi.fn(),
  writeScheduleAction: vi.fn(),
}))
vi.mock('@/shared/api/schedule/actions', () => actions)

// 한국 시간 2026-11-05(목) 12시
const NOW = new Date('2026-11-05T03:00:00.000Z').getTime()

const renderCalendar = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ScheduleCalendar now={NOW} />
    </QueryClientProvider>,
  )

beforeEach(() => {
  actions.listSchedulesAction.mockResolvedValue([
    { id: 'a1', title: '개발 마감 주간', start: '2026-11-16', end: '2026-11-18' },
  ])
  actions.writeScheduleAction.mockReset()
})

describe('일정 달력', () => {
  it('기간 일정을 시작일부터 종료일까지 날짜 칸마다 보여 준다', async () => {
    renderCalendar()
    await screen.findAllByText('개발 마감 주간')
    for (const day of ['16', '17', '18']) {
      const cell = screen.getByRole('listitem', { name: new RegExp(`^11월 ${day}일`) })
      expect(within(cell).getByText('개발 마감 주간')).toBeInTheDocument()
    }
    const outside = screen.getByRole('listitem', { name: /^11월 19일/ })
    expect(within(outside).queryByText('개발 마감 주간')).not.toBeInTheDocument()
  })

  it('비밀번호가 틀리면 창을 닫지 않고 알려 준다', async () => {
    actions.writeScheduleAction.mockResolvedValue({ ok: false, reason: 'password' })
    const user = userEvent.setup()
    renderCalendar()

    await user.click(screen.getByRole('button', { name: '일정 추가' }))
    await user.type(screen.getByRole('textbox', { name: '제목' }), '최종 리허설')
    await user.type(screen.getByLabelText('팀 비밀번호'), 'wrong')
    await user.click(screen.getByRole('button', { name: '저장' }))

    expect(await screen.findByText('비밀번호가 맞지 않아요.')).toBeInTheDocument()
    expect(actions.writeScheduleAction).toHaveBeenCalledWith('wrong', {
      kind: 'create',
      input: { title: '최종 리허설', start: '2026-11-05', end: '2026-11-05' },
    })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('창을 닫았다 다시 열면 지난번 입력과 오류가 남지 않는다', async () => {
    actions.writeScheduleAction.mockResolvedValue({ ok: false, reason: 'password' })
    const user = userEvent.setup()
    renderCalendar()

    await user.click(screen.getByRole('button', { name: '일정 추가' }))
    await user.type(screen.getByRole('textbox', { name: '제목' }), '최종 리허설')
    await user.click(screen.getByRole('button', { name: '저장' }))
    await screen.findByText('비밀번호가 맞지 않아요.')
    await user.click(screen.getByRole('button', { name: '닫기' }))
    await user.click(screen.getByRole('button', { name: '일정 추가' }))

    expect(screen.getByRole('textbox', { name: '제목' })).toHaveValue('')
    expect(screen.queryByText('비밀번호가 맞지 않아요.')).not.toBeInTheDocument()
  })

  it('날짜 칸 빈 곳을 두 번 누르면 그 날짜로 추가 창이 열리고, 일정을 두 번 누르면 고치기 창이 열린다', async () => {
    const user = userEvent.setup()
    renderCalendar()

    const cell = await screen.findByRole('listitem', { name: /^11월 20일/ })
    await user.dblClick(cell)
    const dialog = screen.getByRole('dialog', { name: '일정 추가' })
    expect(within(dialog).getByLabelText('시작일')).toHaveValue('2026-11-20')
    expect(within(dialog).getByLabelText('종료일')).toHaveValue('2026-11-20')
    await user.click(within(dialog).getByRole('button', { name: '닫기' }))

    await user.dblClick((await screen.findAllByRole('button', { name: /^개발 마감 주간/ }))[0]!)
    expect(screen.getByRole('dialog', { name: '일정 고치기' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: '일정 추가' })).not.toBeInTheDocument()
  })

  it('비밀번호가 맞으면 저장하고 목록을 새로 받는다', async () => {
    actions.writeScheduleAction.mockResolvedValue({ ok: true })
    const user = userEvent.setup()
    renderCalendar()

    await user.click((await screen.findAllByRole('button', { name: /^개발 마감 주간/ }))[0]!)
    await user.type(screen.getByLabelText('팀 비밀번호'), 'team-secret')
    await user.click(screen.getByRole('button', { name: '삭제' }))
    // 한 번 누르면 묻기만 하고 지우지 않는다.
    expect(actions.writeScheduleAction).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: '한 번 더 누르면 지워요' }))

    await waitFor(() =>
      expect(actions.writeScheduleAction).toHaveBeenCalledWith('team-secret', {
        kind: 'delete',
        id: 'a1',
      }),
    )
    await waitFor(() => expect(actions.listSchedulesAction).toHaveBeenCalledTimes(2))
  })
})
