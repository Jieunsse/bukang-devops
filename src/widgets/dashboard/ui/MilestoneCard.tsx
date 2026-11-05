'use client'

import { Card, Label, ProgressBar } from '@heroui/react'

import { NONE } from '@/features/filter'

import type { MilestoneRow } from '../lib/summary'

export function MilestoneCard({
  milestones,
  noMilestone,
  onSelect,
}: {
  milestones: MilestoneRow[]
  noMilestone: number
  onSelect: (milestoneId: string) => void
}) {
  return (
    <Card>
      <Card.Header>
        <Card.Title>마일스톤 진행률</Card.Title>
      </Card.Header>
      <Card.Content className="flex flex-col gap-1">
        {milestones.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onSelect(m.id)}
            className="rounded-lg px-2 py-1.5 text-left outline-none hover:bg-default focus-visible:ring-2 focus-visible:ring-accent"
          >
            <ProgressBar aria-label={m.name} value={Math.round(m.progress * 100)} size="sm">
              <Label className="truncate">
                {m.name} <span className="text-muted">· 남은 티켓 {m.remaining}건</span>
              </Label>
              <ProgressBar.Output />
              <ProgressBar.Track>
                <ProgressBar.Fill />
              </ProgressBar.Track>
            </ProgressBar>
          </button>
        ))}
        {noMilestone > 0 && (
          <button
            type="button"
            onClick={() => onSelect(NONE)}
            className="rounded-lg px-2 py-1.5 text-left text-sm text-muted outline-none hover:bg-default focus-visible:ring-2 focus-visible:ring-accent"
          >
            마일스톤 없음 {noMilestone}건
          </button>
        )}
        {milestones.length === 0 && noMilestone === 0 && (
          <p className="text-sm text-muted">보여 줄 티켓이 없어요</p>
        )}
      </Card.Content>
    </Card>
  )
}
