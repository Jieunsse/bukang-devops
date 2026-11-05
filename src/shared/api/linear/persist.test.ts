import { describe, expect, it } from 'vitest'

import { keepValidSnapshot } from './persist'

const stored = (data: unknown) =>
  JSON.stringify({
    timestamp: 1,
    buster: 'x',
    clientState: {
      mutations: [],
      queries: [
        { queryKey: ['snapshot'], queryHash: '["snapshot"]', state: { data } },
        { queryKey: ['done', 'a', 'b'], queryHash: 'd', state: { data: [] } },
      ],
    },
  })

describe('브라우저에 남긴 값 검사', () => {
  it('형식이 맞는 지난 스냅샷은 그대로 쓴다', () => {
    const data = { fetchedAt: '2026-11-05T02:40:00.000Z', issues: [], cycles: [] }
    expect(keepValidSnapshot(stored(data)).clientState.queries).toHaveLength(2)
  })

  it('형식이 다른 지난 스냅샷은 버리고 다른 값은 남긴다', () => {
    const client = keepValidSnapshot(stored({ fetchedAt: 'yesterday', issues: 'x' }))
    expect(client.clientState.queries.map((q) => q.queryKey[0])).toEqual(['done'])
  })
})
