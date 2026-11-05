'use client'

import { Chip, EmptyState, Table } from '@heroui/react'
import { useMemo } from 'react'

import { MemberAvatar } from '@/entities/member'
import { milestoneColumnWidth, TITLE_MIN_PX } from '@/entities/ticket'
import { applyFilters, useFilters } from '@/features/filter'
import type { DoneIssue } from '@/shared/api/linear'
import { formatMonthDay, kstDate } from '@/shared/lib/date'

/** 완료와 취소 티켓을 한 표에 늦게 닫힌 순으로 보여 준다. 받은 순서가 이미 그 순서다. */
export function DoneList({ issues }: { issues: DoneIssue[] }) {
  const { filters } = useFilters()
  const shown = useMemo(() => applyFilters(issues, filters), [issues, filters])
  const canceled = shown.filter((i) => i.state.type === 'canceled').length
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

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">
        완료 {shown.length - canceled}건 · 취소 {canceled}건
      </p>
      <Table>
        <Table.ScrollContainer>
          <Table.Content
            aria-label="완료·취소 티켓"
            className="table-fixed"
            // 고정 칸(번호·담당자·결과·닫은 날·라벨 496px)과 마일스톤 칸을 빼고도 제목 칸이 남게 넓힌다.
            style={{ minWidth: Math.max(800, 496 + milestoneWidth + TITLE_MIN_PX) }}
          >
            <Table.Header>
              <Table.Column isRowHeader>제목</Table.Column>
              <Table.Column className="w-24">번호</Table.Column>
              <Table.Column className="w-24">담당자</Table.Column>
              <Table.Column className="w-20">결과</Table.Column>
              <Table.Column className="w-20">닫은 날</Table.Column>
              <Table.Column className="w-36">라벨</Table.Column>
              <Table.Column style={{ width: milestoneWidth }}>마일스톤</Table.Column>
            </Table.Header>
            <Table.Body>
              {shown.map((issue) => (
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
                  <Table.Cell className="whitespace-nowrap">
                    {issue.state.type === 'canceled' ? '취소' : '완료'}
                  </Table.Cell>
                  <Table.Cell className="whitespace-nowrap text-muted">
                    {formatMonthDay(kstDate(issue.closedAt))}
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex flex-wrap gap-1">
                      {issue.labels.map((l) => (
                        <Chip key={l.id} size="sm">
                          {l.name}
                        </Chip>
                      ))}
                    </div>
                  </Table.Cell>
                  {/* 마일스톤은 자르면 어느 것인지 몰라서, 칸을 가장 긴 이름만큼 잡고 한 줄로 보여 준다. */}
                  <Table.Cell className="whitespace-nowrap">
                    <Chip size="sm">{issue.milestone?.name ?? '마일스톤 없음'}</Chip>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>
    </div>
  )
}
