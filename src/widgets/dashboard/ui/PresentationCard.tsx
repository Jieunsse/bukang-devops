'use client'

import { Card, Label, ProgressBar } from '@heroui/react'

import type { Cycle, Issue } from '@/shared/api/linear'
import { kstDate } from '@/shared/lib/date'

import { cycleProgress, dailyPace, presentationCountdown } from '../lib/presentation'

/**
 * 대시보드 맨 위의 작은 카드 세 개.
 * cycleIssues는 필터를 걸기 전 티켓이다. 사이클 진행은 사이클 전체 기준이기 때문이다.
 * openIssues는 필터를 건 티켓이라, 담당자를 고르면 그 사람의 속도가 나온다.
 */
export function PresentationCard({
  now,
  cycles,
  cycleIssues,
  openIssues,
}: {
  now: number
  cycles: Cycle[]
  cycleIssues: Issue[]
  openIssues: Issue[]
}) {
  const { dateLabel, dDay, daysLeft } = presentationCountdown(kstDate(now))
  const cycle = cycleProgress(now, cycles, cycleIssues)
  const pace = dailyPace(openIssues.length, daysLeft)

  return (
    <section aria-label="한눈에 보기" className="grid gap-4 md:grid-cols-3">
      <Card>
        <Card.Content className="flex flex-col gap-1">
          <p className="text-sm text-muted">최종 발표 {dateLabel}</p>
          <p className="text-4xl font-semibold tabular-nums">{dDay}</p>
        </Card.Content>
      </Card>

      <Card>
        <Card.Content className="flex flex-col gap-2">
          <p className="text-sm text-muted">지금 사이클</p>
          <p className="text-lg font-semibold">{cycle.label}</p>
          {cycle.progress ? (
            <ProgressBar
              aria-label="지금 사이클 완료 비율"
              value={cycle.progress.completed}
              maxValue={Math.max(1, cycle.progress.total)}
            >
              <Label className="text-sm text-muted">
                완료 {cycle.progress.completed} / 전체 {cycle.progress.total}
              </Label>
              <ProgressBar.Output />
              <ProgressBar.Track>
                <ProgressBar.Fill />
              </ProgressBar.Track>
            </ProgressBar>
          ) : (
            <p className="text-sm text-muted">
              {cycle.next
                ? `다음 ${cycle.next.title} · ${cycle.next.start} 시작`
                : '예정된 사이클이 없어요'}
            </p>
          )}
        </Card.Content>
      </Card>

      <Card>
        <Card.Content className="flex flex-col gap-1">
          <p className="text-sm text-muted">하루 평균 끝내야 하는 티켓</p>
          <p className="text-4xl font-semibold tabular-nums">{pace === null ? '-' : `${pace}건`}</p>
          <p className="text-sm text-muted">
            {pace === null
              ? `끝나지 않은 티켓 ${openIssues.length}건 · ${dDay === 'D-day' ? '오늘이 발표일이에요' : '발표일이 지났어요'}`
              : `끝나지 않은 티켓 ${openIssues.length}건 · 발표까지 ${daysLeft}일`}
          </p>
        </Card.Content>
      </Card>
    </section>
  )
}
