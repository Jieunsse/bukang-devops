'use client'

import { Button, Spinner } from '@heroui/react'
import { useQuery } from '@tanstack/react-query'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { FilterButton, FilterChips } from '@/features/filter'
import { RefreshButton } from '@/features/refresh'
import { parseDoneRange, type DoneRange } from '@/shared/api/linear'
import { loadDoneAction } from '@/shared/api/linear/done-actions'
import { useSnapshot } from '@/shared/api/linear/query'
import { kstDate } from '@/shared/lib/date'
import { useNow } from '@/shared/lib/use-now'

import { DoneList } from './DoneList'
import { RangeForm } from './RangeForm'

/** 이 페이지에 들어올 때만 기간에 맞춰 따로 받는다. 대시보드 스냅샷에는 넣지 않는다. */
export function DoneView() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const snapshot = useSnapshot()
  const { range, error } = parseDoneRange(searchParams, kstDate(useNow()))
  const query = useQuery({
    queryKey: ['done', range.start, range.end],
    queryFn: () => loadDoneAction(range),
  })

  // 고른 기간은 주소에 남겨 링크로 같은 화면을 나눠 볼 수 있다. 필터 값은 그대로 둔다.
  const setRange = (next: DoneRange) => {
    const params = new URLSearchParams(searchParams)
    params.set('from', next.start)
    params.set('to', next.end)
    router.replace(`${pathname}?${params}`, { scroll: false })
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold">완료·취소</h2>
      <div role="group" aria-label="완료·취소 도구" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <RangeForm range={range} onSubmit={setRange} />
          <div className="flex items-center gap-2">
            <RefreshButton />
            <FilterButton />
          </div>
        </div>
        {/* 이름은 대시보드가 받아 둔 티켓에서 찾는다. 완료·취소 목록은 기간마다 달라서다. */}
        <FilterChips issues={snapshot.issues} />
      </div>
      {error && <p className="text-sm text-muted">{error}</p>}
      {query.isPending ? (
        <div className="flex justify-center py-12">
          <Spinner aria-label="완료·취소 티켓을 받는 중" />
        </div>
      ) : query.isError ? (
        <div className="flex flex-col items-start gap-3 py-6">
          <p className="font-medium">Linear에서 완료·취소 티켓을 받지 못했어요</p>
          <p className="text-sm text-muted">잠시 뒤 다시 시도해 주세요.</p>
          <Button variant="secondary" onPress={() => query.refetch()}>
            다시 시도
          </Button>
        </div>
      ) : (
        <DoneList issues={query.data} />
      )}
    </div>
  )
}
