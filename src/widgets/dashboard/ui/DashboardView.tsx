'use client'

import { useEffect } from 'react'

import { useSnapshot } from '@/shared/api/linear/query'
import { useNow } from '@/shared/lib/use-now'

import { useDashboardStore } from '../model/store'
import { Dashboard } from './Dashboard'

export function DashboardView() {
  // 다른 페이지에 다녀오면 묶음 선택을 처음(전체)으로 돌린다. 필터는 주소에 남아 그대로다.
  useEffect(() => () => useDashboardStore.setState({ bucket: 'all' }), [])
  return <Dashboard snapshot={useSnapshot()} now={useNow()} />
}
