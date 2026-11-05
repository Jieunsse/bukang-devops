'use client'

import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'

import { loadSnapshotAction } from './actions'
import type { Snapshot } from './schema'

export const SNAPSHOT_QUERY_KEY = ['snapshot'] as const

/** 서버가 처음 그린 데이터를 이어받는다. 레이아웃이 먼저 채워 두므로 기다리지 않는다. */
export function useSnapshot() {
  const queryClient = useQueryClient()
  return useSuspenseQuery({
    queryKey: SNAPSHOT_QUERY_KEY,
    queryFn: async (): Promise<Snapshot> => {
      const result = await loadSnapshotAction()
      if (result.snapshot) return result.snapshot
      // 서버에도 보여 줄 값이 없으면 지금 가진 값에 실패 이유만 붙여 계속 보여 준다.
      const current = queryClient.getQueryData<Snapshot>(SNAPSHOT_QUERY_KEY)
      if (current) return { ...current, failure: result.failure }
      throw new Error(result.failure)
    },
  }).data
}
