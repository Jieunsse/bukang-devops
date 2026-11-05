'use client'

import { useSnapshot } from '@/shared/api/linear/query'
import { useNow } from '@/shared/lib/use-now'

import { Dashboard } from './Dashboard'

export function DashboardView() {
  return <Dashboard snapshot={useSnapshot()} now={useNow()} />
}
