'use client'

import { Spinner } from '@heroui/react'
import { useIsRestoring, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import type { Snapshot } from '@/shared/api/linear'
import { SNAPSHOT_QUERY_KEY } from '@/shared/api/linear/query'
import { ErrorScreen } from '@/shared/ui'

/**
 * 서버에 보여 줄 값이 하나도 없을 때 쓴다. 브라우저에 하루 동안 남긴 값이 있으면 거기에 실패 이유를 붙여 화면을 그린다.
 * 남긴 값도 없을 때만 오류 화면을 보여 준다.
 */
export function SnapshotFallback({
  failure,
  children,
}: {
  failure: string
  children: React.ReactNode
}) {
  const queryClient = useQueryClient()
  const isRestoring = useIsRestoring()
  const saved = isRestoring ? undefined : queryClient.getQueryState<Snapshot>(SNAPSHOT_QUERY_KEY)

  // 받은 시각은 그대로 두고 실패 이유만 붙인다. 그래야 배지가 마지막 값을 보여 주는 중이라고 알린다.
  useEffect(() => {
    if (!saved?.data || saved.data.failure === failure) return
    queryClient.setQueryData(
      SNAPSHOT_QUERY_KEY,
      { ...saved.data, failure },
      {
        updatedAt: saved.dataUpdatedAt,
      },
    )
  }, [saved, queryClient, failure])

  if (!isRestoring && saved?.data) return children
  if (!isRestoring) {
    return (
      <ErrorScreen
        title="Linear에서 티켓을 받지 못했어요"
        description={`${failure}. 잠시 뒤 다시 들어와 주세요.`}
      />
    )
  }
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background">
      <Spinner size="lg" aria-label="저장해 둔 티켓을 찾는 중" />
    </main>
  )
}
