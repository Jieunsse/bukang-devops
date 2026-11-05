'use client'

import { ChevronRight } from '@gravity-ui/icons'
import { Button, Card } from '@heroui/react'

import { MemberAvatar } from '@/entities/member'
import {
  BUCKET_LABEL,
  BUCKETS,
  dueLabel,
  TagChip,
  type Bucket,
  type DueTone,
} from '@/entities/ticket'
import type { Issue } from '@/shared/api/linear'
import { CountChip } from '@/shared/ui'

/** 카드마다 처음 보여 줄 티켓 수 */
const PAGE = 5
const TONE_CLASS: Record<DueTone, string> = {
  danger: 'text-danger',
  warning: 'text-warning',
  default: 'text-muted',
}
/** 넓은 화면(6칸)에서 급한 두 묶음은 반씩, 나머지 셋은 3분의 1씩 차지한다. */
const SPAN: Record<Bucket, string> = {
  overdue: 'xl:col-span-3',
  today: 'xl:col-span-3',
  thisWeek: 'xl:col-span-2',
  later: 'xl:col-span-2',
  noDue: 'xl:col-span-2',
}

/** 전체 보기의 마감 목록. 묶음마다 카드 하나를 두고, 누르면 그 묶음을 골라 표로 보여 준다. */
export function DeadlineGrid({
  groups,
  today,
  onSelect,
}: {
  groups: Record<Bucket, Issue[]>
  today: string
  onSelect: (bucket: Bucket) => void
}) {
  return (
    <ul aria-label="마감 묶음 카드" className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
      {BUCKETS.map((b) => (
        // 0건 카드는 줄 높이에 맞춰 늘이지 않아 작게 남긴다.
        <li key={b} className={`${SPAN[b]} ${groups[b].length === 0 ? 'self-start' : ''}`}>
          <BucketCard
            label={BUCKET_LABEL[b]}
            issues={groups[b]}
            today={today}
            onOpen={() => onSelect(b)}
          />
        </li>
      ))}
    </ul>
  )
}

function BucketCard({
  label,
  issues,
  today,
  onOpen,
}: {
  label: string
  issues: Issue[]
  today: string
  onOpen: () => void
}) {
  const hidden = issues.length - PAGE
  return (
    <Card className="h-full">
      <section aria-label={label} className="flex h-full flex-col gap-3">
        <Card.Header>
          <h3>
            {issues.length > 0 ? (
              <Button
                variant="ghost"
                onPress={onOpen}
                className="-ml-3 cursor-pointer gap-2 px-3 font-semibold"
              >
                {label}
                <CountChip>{issues.length}</CountChip>
                <ChevronRight aria-hidden className="size-4" />
              </Button>
            ) : (
              <span className="flex items-center gap-2 font-semibold">
                {label}
                <CountChip>0</CountChip>
              </span>
            )}
          </h3>
        </Card.Header>
        <Card.Content className="flex-1">
          {issues.length === 0 ? (
            <p className="text-sm text-muted">없어요</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {issues.slice(0, PAGE).map((issue) => (
                <TicketLine key={issue.id} issue={issue} today={today} />
              ))}
            </ul>
          )}
        </Card.Content>
        {issues.length > 0 && (
          <Card.Footer>
            <Button variant="tertiary" size="sm" className="cursor-pointer" onPress={onOpen}>
              {hidden > 0 ? `${hidden}건 더 보기` : '전체 보기'}
            </Button>
          </Card.Footer>
        )}
      </section>
    </Card>
  )
}

function TicketLine({ issue, today }: { issue: Issue; today: string }) {
  const due = dueLabel(issue.dueDate, today)
  return (
    <li className="relative flex items-center gap-2 text-sm">
      <span className="shrink-0 text-xs text-muted tabular-nums">{issue.identifier}</span>
      <a
        href={issue.url}
        target="_blank"
        rel="noreferrer"
        title={issue.title}
        // 글자 링크를 줄 전체로 넓혀, 어디를 눌러도 Linear 이슈로 간다.
        className="min-w-0 flex-1 cursor-pointer truncate font-medium after:absolute after:inset-0 hover:underline"
      >
        {issue.title}
      </a>
      {issue.assignee ? (
        // 좁은 카드라 이름은 프로필 위 마우스 올림 설명과 화면 읽기 글자로만 남긴다.
        <span title={issue.assignee.name} className="flex shrink-0">
          <span aria-hidden>
            <MemberAvatar {...issue.assignee} />
          </span>
          <span className="sr-only">{issue.assignee.name}</span>
        </span>
      ) : (
        <span className="shrink-0 text-xs text-muted">담당 없음</span>
      )}
      <TagChip className={`shrink-0 whitespace-nowrap ${TONE_CLASS[due.tone]}`}>{due.text}</TagChip>
    </li>
  )
}
