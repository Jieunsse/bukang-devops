'use client'

import { useIsRestoring, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import type { Snapshot } from '@/shared/api/linear'
import { SNAPSHOT_QUERY_KEY } from '@/shared/api/linear/query'

/**
 * 서버가 채운 스냅샷을 브라우저 저장소에 남긴다.
 * 저장은 복원이 끝난 뒤 바뀐 값만 따라가서, 서버가 먼저 채운 값은 다음에 다시 받을 때까지 남지 않았다.
 * 복원이 끝나면 같은 값을 한 번 다시 넣어 저장하게 한다. 그래야 Linear가 실패해도 이 값을 보여 줄 수 있다.
 */
export function SaveSnapshot() {
  const queryClient = useQueryClient()
  const isRestoring = useIsRestoring()
  useEffect(() => {
    if (isRestoring) return
    // 부모(HydrationBoundary)가 자기 effect에서 값을 채우므로, 그 뒤에 실행되게 한 박자 미룬다.
    const timer = setTimeout(() => {
      const state = queryClient.getQueryState<Snapshot>(SNAPSHOT_QUERY_KEY)
      if (!state?.data) return
      queryClient.setQueryData(SNAPSHOT_QUERY_KEY, state.data, { updatedAt: state.dataUpdatedAt })
    }, 0)
    return () => clearTimeout(timer)
  }, [isRestoring, queryClient])
  return null
}
