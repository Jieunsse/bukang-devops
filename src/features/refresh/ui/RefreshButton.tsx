'use client'

import { Button, toast, Tooltip } from '@heroui/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { SNAPSHOT_QUERY_KEY } from '@/shared/api/linear/query'

import { refreshSnapshotAction } from '../api/actions'

export function RefreshButton() {
  const queryClient = useQueryClient()
  const { mutate, isPending } = useMutation({
    mutationFn: () => refreshSnapshotAction(),
    onSuccess: (result) => {
      queryClient.setQueryData(SNAPSHOT_QUERY_KEY, result.snapshot, {
        updatedAt: Date.parse(result.snapshot.fetchedAt),
      })
      if (result.status === 'tooSoon') toast(`방금 새로 받았어요(${result.secondsAgo}초 전)`)
      else toast.success('Linear에서 새로 받았어요')
    },
    onError: () => toast.danger('새로 받지 못했어요. 잠시 뒤 다시 눌러 주세요.'),
  })

  return (
    <Tooltip delay={300}>
      <Button
        isIconOnly
        variant="tertiary"
        aria-label="Linear에서 새로 받기"
        isPending={isPending}
        onPress={() => mutate()}
      >
        <RefreshIcon />
      </Button>
      <Tooltip.Content placement="bottom">Linear에서 새로 받기</Tooltip.Content>
    </Tooltip>
  )
}

function RefreshIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M21 12a9 9 0 0 1-15.5 6.2M3 12a9 9 0 0 1 15.5-6.2" strokeLinecap="round" />
      <path d="M21 4v5h-5M3 20v-5h5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
