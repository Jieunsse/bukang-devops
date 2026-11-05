'use client'

import { useSnapshot } from '@/shared/api/linear/query'
import { useNow } from '@/shared/lib/use-now'

import { Cycles } from './Cycles'

export function CyclesView() {
  return <Cycles snapshot={useSnapshot()} now={useNow()} />
}
