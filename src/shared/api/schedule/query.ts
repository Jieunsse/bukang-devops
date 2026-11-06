'use client'

import { useQuery } from '@tanstack/react-query'

import { listSchedulesAction } from './actions'
import { scheduleSchema } from './schema'

export const SCHEDULES_QUERY_KEY = ['schedules'] as const

export function useSchedules() {
  // 다른 팀원이 넣은 일정이 바로 보이게 페이지에 올 때마다 새로 받는다.
  return useQuery({
    queryKey: SCHEDULES_QUERY_KEY,
    queryFn: () => listSchedulesAction(),
    staleTime: 0,
    // 브라우저 저장소에 남은 예전 목록(색이 없던 때)도 화면에 쓰기 전에 기본색으로 채운다.
    select: (list) => list.map((s) => scheduleSchema.parse(s)),
  })
}
