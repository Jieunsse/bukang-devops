'use client'

import { Card } from '@heroui/react'

import { presentationCountdown } from '../lib/presentation'

export function PresentationCard({ today }: { today: string }) {
  const { dateLabel, dDay } = presentationCountdown(today)
  return (
    <Card>
      <Card.Content className="flex flex-col gap-1">
        <p className="text-sm text-muted">최종 발표 {dateLabel}</p>
        <p className="text-4xl font-semibold tabular-nums">{dDay}</p>
      </Card.Content>
    </Card>
  )
}
