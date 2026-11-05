'use client'

import { Card, Label, ProgressBar } from '@heroui/react'

import { presentationCountdown } from '../lib/presentation'

export function PresentationCard({ today }: { today: string }) {
  const { dateLabel, daysLeft, elapsedRatio } = presentationCountdown(today)
  return (
    <Card>
      <Card.Content className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted">최종 발표 {dateLabel}까지</p>
          <p className="text-4xl font-semibold tabular-nums">
            {daysLeft > 0 ? `${daysLeft}일` : '오늘'}
          </p>
        </div>
        <ProgressBar
          aria-label="프로젝트 기간 중 지난 비율"
          value={Math.round(elapsedRatio * 100)}
          className="w-full sm:max-w-md"
        >
          <Label className="text-sm text-muted">10/28 시작부터 지난 기간</Label>
          <ProgressBar.Output />
          <ProgressBar.Track>
            <ProgressBar.Fill />
          </ProgressBar.Track>
        </ProgressBar>
      </Card.Content>
    </Card>
  )
}
