import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ScheduleDialog } from './ScheduleDialog'

const actions = vi.hoisted(() => ({ writeScheduleAction: vi.fn() }))
vi.mock('@/shared/api/schedule/actions', () => actions)

const renderDialog = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ScheduleDialog
        onClose={() => {}}
        schedule={null}
        defaults={{ title: '', start: '2026-11-20', end: '2026-11-20' }}
        password="1234"
        onPasswordChange={() => {}}
      />
    </QueryClientProvider>,
  )

beforeEach(() => {
  actions.writeScheduleAction.mockReset()
  actions.writeScheduleAction.mockResolvedValue({ ok: true })
})

describe('일정 창 단축키', () => {
  it.each([
    ['Cmd+Enter(맥)', '{Meta>}{Enter}{/Meta}'],
    ['Ctrl+Enter(윈도우)', '{Control>}{Enter}{/Control}'],
  ])('%s를 누르면 저장한다', async (_, keys) => {
    const user = userEvent.setup()
    renderDialog()

    await user.type(screen.getByRole('textbox', { name: '제목' }), '테스트 마감')
    await user.keyboard(keys)

    await waitFor(() => expect(actions.writeScheduleAction).toHaveBeenCalledTimes(1))
    expect(actions.writeScheduleAction).toHaveBeenCalledWith('1234', {
      kind: 'create',
      input: expect.objectContaining({ title: '테스트 마감', start: '2026-11-20' }),
    })
  })

  it('색 버튼을 고른 뒤에도 Cmd+Enter로 그 색을 저장한다', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.type(screen.getByRole('textbox', { name: '제목' }), '테스트 마감')
    await user.click(screen.getByRole('radio', { name: '보라' }))
    await user.keyboard('{Meta>}{Enter}{/Meta}')

    await waitFor(() => expect(actions.writeScheduleAction).toHaveBeenCalledTimes(1))
    expect(actions.writeScheduleAction).toHaveBeenCalledWith('1234', {
      kind: 'create',
      input: expect.objectContaining({ color: 'violet' }),
    })
  })
})
