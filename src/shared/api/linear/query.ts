'use client'

import { useSuspenseQuery } from '@tanstack/react-query'

import { loadSnapshotAction } from './actions'

export const SNAPSHOT_QUERY_KEY = ['snapshot'] as const

/** 서버가 처음 그린 데이터를 이어받는다. 레이아웃이 먼저 채워 두므로 기다리지 않는다. */
export function useSnapshot() {
  return useSuspenseQuery({ queryKey: SNAPSHOT_QUERY_KEY, queryFn: () => loadSnapshotAction() })
    .data
}
