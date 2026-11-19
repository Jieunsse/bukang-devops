'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'

import { cacheSecondsOf, DEFAULT_RANGE, parseRange } from '@/shared/lib/time-range'

import type { RangedMetrics } from '../model/load'
import { BriefSection } from './BriefSection'
import { TrendsSection } from './TrendsSection'

/**
 * 병목 흐름과 추이. 주소의 기간(range)으로 브라우저가 따로 받는다.
 * 긴 기간은 질의가 몇 초 걸려서, 서버가 그리는 판정·표를 기다리게 하지 않으려고 나눴다.
 * initial은 서버가 함께 받은 1시간 값이라 기본 기간에서는 다시 부르지 않는다.
 */
export function RangedSections({
  initial,
  initialAt,
}: {
  initial: RangedMetrics
  /** initial을 받은 시각(ISO) */
  initialAt: string
}) {
  const range = parseRange(useSearchParams().get('range'))
  const cacheMs = cacheSecondsOf(range) * 1000
  const query = useQuery({
    queryKey: ['monitoring', range],
    queryFn: async (): Promise<RangedMetrics> => {
      const res = await fetch(`/api/monitoring/range?range=${range}`)
      if (!res.ok) throw new Error(String(res.status))
      return res.json() as Promise<RangedMetrics>
    },
    initialData: range === DEFAULT_RANGE ? initial : undefined,
    initialDataUpdatedAt: Date.parse(initialAt),
    staleTime: cacheMs,
    refetchInterval: cacheMs,
    // 기간을 바꾸는 동안 이전 그래프를 두어 빈 칸으로 깜빡이지 않게 한다
    placeholderData: keepPreviousData,
  })
  // 처음 연 기간을 못 받으면 서버가 함께 받은 1시간 그래프를 보인다(이름도 1시간)
  const shown = query.data ?? initial
  return (
    <div aria-busy={query.isFetching} className="flex flex-col gap-8">
      {query.isError && !query.data && (
        <p className="m-0 text-base text-muted">이 기간 지표를 받지 못해 최근 1시간을 보여 줘요</p>
      )}
      <BriefSection cards={shown.brief} range={shown.range} />
      <TrendsSection trends={shown.trends} range={shown.range} />
    </div>
  )
}
