import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { Snapshot } from '@/shared/api/linear'

let snapshot: Snapshot = { fetchedAt: '2026-11-05T02:40:00.000Z', issues: [], cycles: [] }
vi.mock('@/shared/api/linear/query', () => ({
  SNAPSHOT_QUERY_KEY: ['snapshot'],
  useSnapshot: () => snapshot,
}))
vi.mock('@/shared/lib/use-now', () => ({ useNow: () => Date.parse('2026-11-05T03:00:00.000Z') }))
vi.mock('../api/actions', () => ({ refreshSnapshotAction: vi.fn() }))

const { RefreshButton } = await import('./RefreshButton')

const show = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RefreshButton />
    </QueryClientProvider>,
  )

describe('받은 시각 배지', () => {
  it('새로 받았으면 「11:40 기준」만 보여 준다', () => {
    show()
    expect(screen.getByText('11:40 기준')).toBeInTheDocument()
  })

  it('마지막 값을 보여 주는 중이면 「새로 받지 못했어요」를 붙이고 이유를 이름에 담는다', () => {
    snapshot = { ...snapshot, failure: 'Linear 요청 한도에 걸렸어요' }
    show()
    const badge = screen.getByText('11:40 기준 · 새로 받지 못했어요')
    expect(badge.closest('[aria-label]')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Linear 요청 한도에 걸렸어요'),
    )
  })
})
