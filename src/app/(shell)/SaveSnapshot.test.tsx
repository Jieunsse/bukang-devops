import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { SNAPSHOT_QUERY_KEY } from '@/shared/api/linear/query'

import { SaveSnapshot } from './SaveSnapshot'

describe('서버가 채운 스냅샷 저장', () => {
  it('복원이 끝나면 같은 값을 한 번 다시 넣어 브라우저 저장이 일어나게 한다', async () => {
    const client = new QueryClient()
    const data = { fetchedAt: '2026-11-05T02:40:00.000Z', issues: [], cycles: [] }
    client.setQueryData(SNAPSHOT_QUERY_KEY, data, { updatedAt: 1000 })
    const before = client.getQueryState(SNAPSHOT_QUERY_KEY)!.dataUpdateCount
    render(
      <QueryClientProvider client={client}>
        <SaveSnapshot />
      </QueryClientProvider>,
    )
    await waitFor(() =>
      expect(client.getQueryState(SNAPSHOT_QUERY_KEY)!.dataUpdateCount).toBe(before + 1),
    )
    // 받은 시각은 그대로라 「n분 기준」 배지와 다시 받는 시점이 바뀌지 않는다.
    expect(client.getQueryState(SNAPSHOT_QUERY_KEY)!.dataUpdatedAt).toBe(1000)
  })
})
