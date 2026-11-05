'use client'

import { cardVariants } from '@heroui/styles'

import { BUCKET_LABEL, type Bucket } from '@/entities/ticket'

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
  const card = cardVariants()
  return (
    <div role="group" aria-label="숫자 요약" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {SUMMARY.map((bucket) => {
        const isSelected = selected === bucket
        return (
          <button
            key={bucket}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelect(isSelected ? 'all' : bucket)}
            className={card.base({
              className: `text-left outline-none focus-visible:ring-2 focus-visible:ring-accent ${isSelected ? 'ring-2 ring-accent' : ''}`,
            })}
          >
            <span className="text-sm text-muted">{BUCKET_LABEL[bucket]}</span>
            <span className={`text-3xl font-semibold tabular-nums ${COUNT_COLOR[bucket] ?? ''}`}>
              {counts[bucket]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
