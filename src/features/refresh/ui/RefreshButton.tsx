'use client'

import { ArrowsRotateRight } from '@gravity-ui/icons'
import { Button, Chip, Spinner, toast, Tooltip } from '@heroui/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { SNAPSHOT_QUERY_KEY, useSnapshot } from '@/shared/api/linear/query'
import { formatKstDateTime, kstDate } from '@/shared/lib/date'
import { useNow } from '@/shared/lib/use-now'

import { refreshSnapshotAction } from '../api/actions'

export function RefreshButton() {
  const queryClient = useQueryClient()
  const { fetchedAt, failure } = useSnapshot()
  const now = useNow()
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

  // 마지막으로 받은 시각. 오늘 받았으면 시각만, 아니면 날짜까지 쓴다.
  const fetched = formatKstDateTime(fetchedAt)
  const fetchedLabel = kstDate(fetchedAt) === kstDate(now) ? fetched.split(' ')[1] : fetched

  return (
    <>
      {failure ? (
        // 새로 받지 못해 마지막 값을 보여 주는 중이다. 이유는 마우스를 올리면 보인다.
        <Tooltip delay={300} closeDelay={0}>
          <Tooltip.Trigger
            aria-label={`마지막으로 받은 시각 ${fetched}, 새로 받지 못했어요: ${failure}`}
          >
            <Chip size="sm" variant="soft" color="warning">
              {fetchedLabel} 기준 · 새로 받지 못했어요
            </Chip>
          </Tooltip.Trigger>
          <Tooltip.Content className="text-xs">{failure}</Tooltip.Content>
        </Tooltip>
      ) : (
        <Chip size="sm" variant="soft" aria-label={`마지막으로 받은 시각 ${fetched}`}>
          {fetchedLabel} 기준
        </Chip>
      )}
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
    </>
  )
}
