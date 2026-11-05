'use client'

import { Table } from '@heroui/react'

import { MemberAvatar } from '@/entities/member'
import {
  BUCKET_LABEL,
  dueLabel,
  LabelChip,
  MilestoneChip,
  TITLE_MIN_PX,
  type Bucket,
  type DueTone,
} from '@/entities/ticket'
import { CountChip } from '@/shared/ui'
import type { Issue } from '@/shared/api/linear'

const TONE_CLASS: Record<DueTone, string> = {
  danger: 'text-danger',
  warning: 'text-warning',
  default: 'text-muted',
}

/** 묶음 하나나 고른 날짜의 티켓 전체를 표로 보여 준다. */
export function DeadlineSection({
  bucket,
  issues,
  today,
  emptyText,
  title,
  milestoneWidth,
}: {
  bucket: Bucket
  issues: Issue[]
  today: string
  /** 티켓이 없으면 보여 줄 안내 */
  emptyText: string
  /** 묶음 이름 대신 쓸 제목(달력에서 날짜를 골랐을 때) */
  title?: string
  /** 묶음 표끼리 칸을 맞추려고 바깥에서 같은 폭(px)을 넘긴다. */
  milestoneWidth: number
}) {
  const label = title ?? BUCKET_LABEL[bucket]

  return (
    <section aria-label={label} className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold">{label}</h3>
        <CountChip>{issues.length}</CountChip>
      </div>
      {issues.length === 0 && <p className="text-sm text-muted">{emptyText}</p>}
      {issues.length > 0 && (
        <Table>
          <Table.ScrollContainer>
            <Table.Content
              aria-label={`${label} 티켓`}
              className="table-fixed"
              // 고정 칸(번호·담당자·기한·라벨 448px)과 마일스톤 칸을 빼고도 제목 칸이 남게 넓힌다.
              style={{ minWidth: Math.max(800, 448 + milestoneWidth + TITLE_MIN_PX) }}
            >
              <Table.Header>
                <Table.Column isRowHeader>제목</Table.Column>
                <Table.Column className="w-24">번호</Table.Column>
                <Table.Column className="w-24">담당자</Table.Column>
                <Table.Column className="w-28">기한</Table.Column>
                <Table.Column className="w-36">라벨</Table.Column>
                <Table.Column style={{ width: milestoneWidth }}>마일스톤</Table.Column>
              </Table.Header>
              <Table.Body>
                {issues.map((issue) => {
                  const due = dueLabel(issue.dueDate, today)
                  return (
                    <Table.Row key={issue.id} id={issue.id} className="relative">
                      <Table.Cell>
                        <a
                          href={issue.url}
                          target="_blank"
                          rel="noreferrer"
                          // 글자 링크를 줄 전체로 넓혀, 어느 칸을 눌러도 Linear 이슈로 간다.
                          title={issue.title}
                          className="block truncate font-medium after:absolute after:inset-0 hover:underline"
                        >
                          {issue.title}
                        </a>
                      </Table.Cell>
                      <Table.Cell className="whitespace-nowrap text-muted">
                        {issue.identifier}
                      </Table.Cell>
                      <Table.Cell className="whitespace-nowrap">
                        {issue.assignee ? (
                          <span className="flex items-center gap-2">
                            <MemberAvatar {...issue.assignee} />
                            {issue.assignee.name}
                          </span>
                        ) : (
                          <span className="text-muted">담당 없음</span>
                        )}
                      </Table.Cell>
                      <Table.Cell className={`whitespace-nowrap ${TONE_CLASS[due.tone]}`}>
                        {due.text}
                      </Table.Cell>
                      <Table.Cell>
                        <div className="flex flex-wrap gap-1">
                          {issue.labels.map((l) => (
                            <LabelChip key={l.id} label={l} />
                          ))}
                        </div>
                      </Table.Cell>
                      {/* 마일스톤은 자르면 어느 것인지 몰라서, 칸을 가장 긴 이름만큼 잡고 한 줄로 보여 준다. */}
                      <Table.Cell className="whitespace-nowrap">
                        <MilestoneChip name={issue.milestone?.name ?? null} />
                      </Table.Cell>
                    </Table.Row>
                  )
                })}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      )}
    </section>
  )
}
