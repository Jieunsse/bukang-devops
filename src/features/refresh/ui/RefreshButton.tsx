'use client'

import { ArrowsRotateRight } from '@gravity-ui/icons'
import { Button, Spinner, toast, Tooltip } from '@heroui/react'
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
        {isPending ? (
          <Spinner size="sm" color="current" />
        ) : (
          <ArrowsRotateRight aria-hidden className="size-4" />
        )}
      </Button>
      <Tooltip.Content placement="bottom">Linear에서 새로 받기</Tooltip.Content>
    </Tooltip>
  )
}
