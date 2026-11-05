'use client'

import { ChevronDown, ChevronRight } from '@gravity-ui/icons'
import { Button, Chip, Table } from '@heroui/react'
import { useState } from 'react'

import { MemberAvatar } from '@/entities/member'
import { BUCKET_LABEL, dueLabel, type Bucket, type DueTone } from '@/entities/ticket'
import type { Issue } from '@/shared/api/linear'

const PAGE = 5
/** 라벨과 마일스톤 칩. 기본 칩은 안쪽 여백이 좁아 글자가 테두리에 붙어 보여서 넓힌다. */
const TAG_CHIP = 'h-6 max-w-full px-2.5'
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
  collapsible,
  emptyText,
  title,
}: {
  bucket: Bucket
  issues: Issue[]
  today: string
  defaultOpen: boolean
  /** 머리줄을 눌러 접고 펼칠 수 있는지(전체 보기일 때) */
  collapsible?: boolean
  /** 묶음 하나만 볼 때 티켓이 없으면 보여 줄 안내 */
  emptyText?: string
  /** 묶음 이름 대신 쓸 제목(달력에서 날짜를 골랐을 때) */
  title?: string
}) {
  const [isOpen, setOpen] = useState(defaultOpen)
  const [shown, setShown] = useState(PAGE)
  const label = title ?? BUCKET_LABEL[bucket]
  const visible = issues.slice(0, shown)
  const hidden = issues.length - visible.length
  const canToggle = collapsible && issues.length > 0

  return (
    <section aria-label={label} className="flex flex-col gap-3">
      {canToggle ? (
        // 머리줄 전체를 눌러 펼치고 접는다.
        <h3>
          <Button
            variant="ghost"
            aria-expanded={isOpen}
            onPress={() => setOpen(!isOpen)}
            className="-ml-3 gap-2 px-3 font-semibold"
          >
            {isOpen ? (
              <ChevronDown aria-hidden className="size-4" />
            ) : (
              <ChevronRight aria-hidden className="size-4" />
            )}
            {label}
            <Chip size="sm">{issues.length}</Chip>
          </Button>
        </h3>
      ) : collapsible ? (
        // 0건이라 펼칠 게 없다. 버튼 대신 같은 자리·같은 크기의 글자로 두고 화살표만 흐리게 한다.
        <h3 className="-ml-3 flex h-10 items-center gap-2 px-3 text-sm font-semibold md:h-9">
          <ChevronRight aria-hidden className="size-4 opacity-30" />
          {label}
          <Chip size="sm">{issues.length}</Chip>
        </h3>
      ) : (
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{label}</h3>
          <Chip size="sm">{issues.length}</Chip>
        </div>
      )}
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
                            <Chip
                              key={l.id}
                              size="sm"
                              className={TAG_CHIP}
                              // 라벨마다 Linear에 정해 둔 색을 옅게 깔아 종류를 나눈다.
                              style={
                                l.color
                                  ? {
                                      backgroundColor: `color-mix(in oklab, ${l.color} 22%, transparent)`,
                                      color: `color-mix(in oklab, ${l.color} 65%, var(--foreground))`,
                                    }
                                  : undefined
                              }
                            >
                              <span title={l.name} className="truncate">
                                {l.name}
                              </span>
                            </Chip>
                          ))}
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <Chip size="sm" className={TAG_CHIP}>
                          <span
                            title={issue.milestone?.name ?? '마일스톤 없음'}
                            className="truncate"
                          >
                            {issue.milestone?.name ?? '마일스톤 없음'}
                          </span>
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
          variant="ghost"
          size="sm"
          className="-ml-3 gap-2 self-start px-3"
          onPress={() => setShown(issues.length)}
        >
          <ChevronDown aria-hidden className="size-4" />
          {hidden}건 더 보기
        </Button>
      )}
    </section>
  )
}
