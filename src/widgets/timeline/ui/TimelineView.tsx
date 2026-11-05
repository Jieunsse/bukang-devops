'use client'

import { useSnapshot } from '@/shared/api/linear/query'
import { useNow } from '@/shared/lib/use-now'

import { Timeline } from './Timeline'

export function TimelineView() {
  return <Timeline snapshot={useSnapshot()} now={useNow()} />
}
