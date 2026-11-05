'use client'

import { Card, EmptyState, Table } from '@heroui/react'
import { useMemo, useState } from 'react'

import { MemberAvatar } from '@/entities/member'
import {
  LabelChip,
  MilestoneChip,
  milestoneColumnWidth,
  TagChip,
  TITLE_MIN_PX,
} from '@/entities/ticket'
import { applyFilters, NONE, useFilters, visibleMembers } from '@/features/filter'
import type { DoneIssue, Member } from '@/shared/api/linear'
import { formatMonthDay, kstDate } from '@/shared/lib/date'
import { CollapseButton } from '@/shared/ui'

import { groupDone, type DoneGroup } from '../lib/group'

/** 완료·취소 티켓을 사람별로 묶어 누가 무엇을 끝냈는지 보여 준다. */
export function DoneList({
  issues,
  members = [],
}: {
  issues: DoneIssue[]
  /** 완료·취소가 0건이어도 묶음을 둘 팀원 */
  members?: Member[]
}) {
  const { filters } = useFilters()
  const shown = useMemo(() => applyFilters(issues, filters), [issues, filters])
  const groups = useMemo(
    () => groupDone(shown, visibleMembers(members, filters)),
    [shown, members, filters],
  )
  // 표가 묶음마다 따로라서 칸 폭을 모든 묶음에서 같게 맞춘다.
  // 필터 전 목록으로 재서 필터를 바꿔도 칸 폭이 흔들리지 않는다.
  const milestoneWidth = useMemo(
    () => milestoneColumnWidth(issues.flatMap((i) => (i.milestone ? [i.milestone.name] : []))),
    [issues],
  )

  if (shown.length === 0) {
    return (
      <EmptyState className="py-12">
        <p className="font-medium">이 기간에 완료하거나 취소한 티켓이 없어요</p>
        <p className="text-sm text-muted">기간이나 필터를 바꿔 보세요.</p>
      </EmptyState>
    )
  }

  const canceled = groups.reduce((sum, g) => sum + g.canceled, 0)
  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted">
        완료 {shown.length - canceled}건 · 취소 {canceled}건
      </p>
      <CompletedCard groups={groups} />
      {groups.map((group) => (
        <GroupSection key={group.id} group={group} milestoneWidth={milestoneWidth} />
      ))}
    </div>
  )
}

/** 대시보드 사람별 카드와 같은 모양으로 완료 수만 막대로 견준다. */
function CompletedCard({ groups: all }: { groups: DoneGroup[] }) {
  const groups = all.filter((g) => g.completed > 0)
  if (groups.length === 0) return null
  const max = Math.max(1, ...groups.map((g) => g.completed))
  return (
    <Card>
      <Card.Header>
        <Card.Title>사람별 완료</Card.Title>
      </Card.Header>
      <Card.Content>
        <ul aria-label="사람별 완료" className="flex flex-col gap-1">
          {groups.map((g) => (
            <li
              key={g.id}
              aria-label={`${g.name} 완료 ${g.completed}건`}
              className="grid grid-cols-[7rem_1fr_2rem] items-center gap-3 px-2 py-1.5 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2">
                {g.id === NONE ? (
                  <span aria-hidden className="size-6 shrink-0" />
                ) : (
                  <MemberAvatar name={g.name} avatarUrl={g.avatarUrl} />
                )}
                <span className="truncate">{g.name}</span>
              </span>
              <span
                className="h-3 rounded-full bg-accent"
                style={{ width: `${(g.completed / max) * 100}%` }}
              />
              <span className="text-right text-muted tabular-nums">{g.completed}</span>
            </li>
          ))}
        </ul>
      </Card.Content>
    </Card>
  )
}

function GroupSection({ group, milestoneWidth }: { group: DoneGroup; milestoneWidth: number }) {
  const [isOpen, setOpen] = useState(true)
  return (
    <section aria-label={group.name} className="flex flex-col gap-3">
      <h3>
        <CollapseButton
          isOpen={isOpen}
          onToggle={() => setOpen(!isOpen)}
          className="cursor-pointer"
        >
          {/* 사진이 없을 때 보이는 첫 글자가 버튼 이름에 섞이지 않게 숨긴다. */}
          {group.id !== NONE && (
            <span aria-hidden>
              <MemberAvatar name={group.name} avatarUrl={group.avatarUrl} />
            </span>
          )}
          {group.name}{' '}
          <span className="text-sm font-normal text-muted">
            완료 {group.completed} · 취소 {group.canceled}
          </span>
        </CollapseButton>
      </h3>
      {isOpen && (
        <Table>
          <Table.ScrollContainer>
            <Table.Content
              aria-label={`${group.name} 완료·취소 티켓`}
              className="table-fixed"
              // 마일스톤 칸이 길어져도 제목 칸 최소 폭이 남게 표 최소 폭을 늘린다(번호·닫은 날·라벨 320px).
              style={{ minWidth: milestoneWidth + 320 + TITLE_MIN_PX }}
            >
              <Table.Header>
                <Table.Column isRowHeader>제목</Table.Column>
                <Table.Column className="w-24">번호</Table.Column>
                <Table.Column className="w-20">닫은 날</Table.Column>
                <Table.Column className="w-36">라벨</Table.Column>
                <Table.Column style={{ width: milestoneWidth }}>마일스톤</Table.Column>
              </Table.Header>
              <Table.Body>
                {group.issues.map((issue) => (
                  <Table.Row key={issue.id} id={issue.id} className="relative cursor-pointer">
                    <Table.Cell>
                      <span className="flex min-w-0 items-center gap-2">
                        <a
                          href={issue.url}
                          target="_blank"
                          rel="noreferrer"
                          title={issue.title}
                          // 글자 링크를 줄 전체로 넓혀, 어느 칸을 눌러도 Linear 이슈로 간다.
                          className="truncate font-medium after:absolute after:inset-0 hover:underline"
                        >
                          {issue.title}
                        </a>
                        {issue.state.type === 'canceled' && (
                          <TagChip className="shrink-0">취소</TagChip>
                        )}
                      </span>
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap text-muted">
                      {issue.identifier}
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap text-muted">
                      {formatMonthDay(kstDate(issue.closedAt))}
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
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      )}
    </section>
  )
}
