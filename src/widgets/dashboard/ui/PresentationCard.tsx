'use client'

import { Card, ProgressBar, Tooltip } from '@heroui/react'
import type { ReactNode } from 'react'

import type { Cycle, Issue, Project } from '@/shared/api/linear'
import { kstDate } from '@/shared/lib/date'

import { cycleProgress, presentationCountdown } from '../lib/presentation'

/**
 * 대시보드 맨 위의 작은 카드 세 개.
 * cycleIssues는 필터를 걸기 전 티켓이다. 사이클 진행은 사이클 전체 기준이기 때문이다.
 * 프로젝트 진행률은 Linear가 계산한 값이라 필터와 상관없다.
 */
export function PresentationCard({
  now,
  cycles,
  cycleIssues,
  project,
}: {
  now: number
  cycles: Cycle[]
  cycleIssues: Issue[]
  project: Project | null | undefined
}) {
  const { dateLabel, dDay } = presentationCountdown(kstDate(now))
  const cycle = cycleProgress(now, cycles, cycleIssues)
  const percent = project ? Math.round(project.progress * 100) : null

  return (
    <section aria-label="한눈에 보기" className="panel-group md:grid-cols-3">
      <StatCard name="최종 발표" value={dDay} hint={dateLabel} />
      <StatCard name={cycle.name} value={cycle.value} hint={cycle.hint}>
        {cycle.ratio !== null && (
          <ProgressBar
            aria-label={cycle.name}
            value={Math.round(cycle.ratio * 100)}
            size="sm"
            className="mt-1"
          >
            <ProgressBar.Track>
              <ProgressBar.Fill />
            </ProgressBar.Track>
          </ProgressBar>
        )}
      </StatCard>
      <StatCard
        name="프로젝트 진행률"
        value={percent === null ? '-' : `${percent}%`}
        hint={project ? `${project.name} · 진행 중인 티켓은 4분의 1만큼 셈` : null}
      >
        {percent !== null && (
          <ProgressBar aria-label="프로젝트 진행률" value={percent} size="sm" className="mt-1">
            <ProgressBar.Track>
              <ProgressBar.Fill />
            </ProgressBar.Track>
          </ProgressBar>
        )}
      </StatCard>
    </section>
  )
}

/** 아래 숫자 카드와 같은 모양: 짧은 이름 한 줄과 큰 값 하나. 설명은 값에 마우스를 올리면 보인다. */
function StatCard({
  name,
  value,
  hint,
  children,
}: {
  name: string
  value: string
  hint: string | null
  children?: ReactNode
}) {
  const big = <span className="text-3xl font-semibold tabular-nums">{value}</span>
  return (
    <Card>
      <Card.Content className="flex flex-col gap-1">
        <span className="text-sm text-muted">{name}</span>
        {hint ? (
          <Tooltip delay={300} closeDelay={0}>
            <Tooltip.Trigger className="w-fit" aria-label={`${value}, ${hint}`}>
              {big}
            </Tooltip.Trigger>
            <Tooltip.Content className="text-xs">{hint}</Tooltip.Content>
          </Tooltip>
        ) : (
          big
        )}
        {children}
      </Card.Content>
    </Card>
  )
}
