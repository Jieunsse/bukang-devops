import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { CalendarView } from './CalendarView'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/calendar',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/features/refresh', () => ({ RefreshButton: () => null }))
vi.mock('@/shared/api/linear/query', () => ({
  useSnapshot: () => ({ fetchedAt: '2026-11-05T02:55:00.000Z', cycles: [], issues: [] }),
}))
vi.mock('@/shared/api/schedule/actions', () => ({
  listSchedulesAction: vi.fn(async () => []),
  writeScheduleAction: vi.fn(),
}))

describe('달력 보기 전환', () => {
  it('처음에는 티켓 보기이고, 일정 보기를 누르면 일정 달력으로 바뀐다', async () => {
    const user = userEvent.setup()
    render(
      <QueryClientProvider client={new QueryClient()}>
        <CalendarView />
      </QueryClientProvider>,
    )

    expect(screen.getByRole('list', { name: /달력$/ })).toBeVisible()
    expect(screen.queryByRole('button', { name: '일정 추가' })).not.toBeInTheDocument()

    await user.click(screen.getAllByRole('radio', { name: '일정 보기' })[0]!)

    expect(screen.getByRole('list', { name: /일정 달력$/ })).toBeVisible()
    expect(screen.getByRole('button', { name: '일정 추가' })).toBeVisible()
  })
})
