'use client'

import { Button, Chip, Table } from '@heroui/react'
import { useState } from 'react'

import { MemberAvatar } from '@/entities/member'
import { BUCKET_LABEL, dueLabel, type Bucket, type DueTone } from '@/entities/ticket'
import type { Issue } from '@/shared/api/linear'

const PAGE = 5
const TONE_CLASS: Record<DueTone, string> = {
  danger: 'text-danger',
  warning: 'text-warning',
  default: 'text-muted',
}

export function DeadlineSection({
  bucket,
  issues,
  today,
  defaultOpen,
  emptyText,
}: {
  bucket: Bucket
  issues: Issue[]
  today: string
  defaultOpen: boolean
  /** 묶음 하나만 볼 때 티켓이 없으면 보여 줄 안내 */
  emptyText?: string
}) {
  const [isOpen, setOpen] = useState(defaultOpen)
  const [shown, setShown] = useState(PAGE)
  const label = BUCKET_LABEL[bucket]
  const visible = issues.slice(0, shown)
  const hidden = issues.length - visible.length

  return (
    <section aria-label={label} className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold">{label}</h3>
        <Chip size="sm" variant="soft">
          {issues.length}
        </Chip>
        {!defaultOpen && issues.length > 0 && (
          <Button size="sm" variant="ghost" className="ml-auto" onPress={() => setOpen(!isOpen)}>
            {isOpen ? '접기' : '펼치기'}
          </Button>
        )}
      </div>
      {emptyText && issues.length === 0 && <p className="text-sm text-muted">{emptyText}</p>}
      {isOpen && issues.length > 0 && (
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label={`${label} 티켓`} className="min-w-[800px] table-fixed">
              <Table.Header>
                <Table.Column isRowHeader>제목</Table.Column>
                <Table.Column className="w-24">번호</Table.Column>
                <Table.Column className="w-24">담당자</Table.Column>
                <Table.Column className="w-28">기한</Table.Column>
                <Table.Column className="w-36">라벨</Table.Column>
                <Table.Column className="w-32">마일스톤</Table.Column>
              </Table.Header>
              <Table.Body>
                {visible.map((issue) => {
                  const due = dueLabel(issue.dueDate, today)
                  return (
                    <Table.Row key={issue.id} id={issue.id} className="relative">
                      <Table.Cell>
                        <a
                          href={issue.url}
                          target="_blank"
                          rel="noreferrer"
                          // 글자 링크를 줄 전체로 넓혀, 어느 칸을 눌러도 Linear 이슈로 간다.
                          className="font-medium after:absolute after:inset-0 hover:underline"
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
                            <Chip key={l.id} size="sm" variant="soft">
                              {l.name}
                            </Chip>
                          ))}
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <Chip size="sm" variant="soft">
                          {issue.milestone?.name ?? '마일스톤 없음'}
                        </Chip>
                      </Table.Cell>
                    </Table.Row>
                  )
                })}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      )}
      {isOpen && hidden > 0 && (
        <Button
          variant="tertiary"
          size="sm"
          className="self-start"
          onPress={() => setShown(issues.length)}
        >
          {hidden}건 더 보기
        </Button>
      )}
    </section>
  )
}
