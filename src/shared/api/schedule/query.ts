'use client'

import { useQuery } from '@tanstack/react-query'

import { listSchedulesAction } from './actions'

export const SCHEDULES_QUERY_KEY = ['schedules'] as const

export function useSchedules() {
  // 다른 팀원이 넣은 일정이 바로 보이게 페이지에 올 때마다 새로 받는다.
  return useQuery({
    queryKey: SCHEDULES_QUERY_KEY,
    queryFn: () => listSchedulesAction(),
    staleTime: 0,
  })
}
