import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { Snapshot } from '@/shared/api/linear'
import { SNAPSHOT_QUERY_KEY } from '@/shared/api/linear/query'

import { SnapshotFallback } from './SnapshotFallback'

const show = (saved?: Snapshot) => {
  const client = new QueryClient()
  if (saved) client.setQueryData(SNAPSHOT_QUERY_KEY, saved)
  render(
    <QueryClientProvider client={client}>
      <SnapshotFallback failure="Linear 요청 한도에 걸렸어요">
        <p>화면 내용</p>
      </SnapshotFallback>
    </QueryClientProvider>,
  )
  return client
}

describe('서버가 보여 줄 값이 없을 때', () => {
  it('브라우저에 남긴 값이 있으면 그 값에 실패 이유를 붙여 화면을 보여 준다', async () => {
    const client = show({ fetchedAt: '2026-11-05T02:40:00.000Z', issues: [], cycles: [] })
    expect(await screen.findByText('화면 내용')).toBeInTheDocument()
    expect(client.getQueryData<Snapshot>(SNAPSHOT_QUERY_KEY)?.failure).toBe(
      'Linear 요청 한도에 걸렸어요',
    )
  })

  it('남긴 값도 없으면 오류 화면을 보여 준다', async () => {
    show()
    expect(await screen.findByText('Linear에서 티켓을 받지 못했어요')).toBeInTheDocument()
    expect(screen.getByText(/Linear 요청 한도에 걸렸어요/)).toBeInTheDocument()
    expect(screen.queryByText('화면 내용')).not.toBeInTheDocument()
  })
})
