'use client'

import { BUCKET_LABEL, type Bucket } from '@/entities/ticket'
import { StatCards } from '@/shared/ui'

const SUMMARY: Bucket[] = ['overdue', 'today', 'thisWeek', 'noDue']
const COUNT_COLOR: Partial<Record<Bucket, string>> = {
  overdue: 'text-danger',
  today: 'text-warning',
}

export function SummaryCards({
  counts,
  selected,
  onSelect,
}: {
  counts: Record<Bucket, number>
  selected: Bucket | 'all'
  onSelect: (bucket: Bucket | 'all') => void
}) {
  return (
    <StatCards
      items={SUMMARY.map((b) => ({
        key: b,
        label: BUCKET_LABEL[b],
        count: counts[b],
        className: COUNT_COLOR[b],
      }))}
      selected={selected === 'all' ? null : selected}
      // 고른 칸을 다시 누르면 전체로 돌아간다.
      onSelect={(b) => onSelect(selected === b ? 'all' : b)}
    />
  )
}
