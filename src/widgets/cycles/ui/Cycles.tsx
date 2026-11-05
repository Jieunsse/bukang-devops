'use client'

import { Card, Chip, EmptyState, Label, ProgressBar, Table, Tabs } from '@heroui/react'
import { useMemo, useState } from 'react'

import { MemberAvatar } from '@/entities/member'
import { dueLabel, type DueTone } from '@/entities/ticket'
import { applyFilters, NONE, useFilters } from '@/features/filter'
import type { Snapshot } from '@/shared/api/linear'
import { kstDate } from '@/shared/lib/date'

import {
  cycleTabs,
  defaultTabKey,
  groupByAssignee,
  type AssigneeGroup,
  type CycleTab,
} from '../lib/cycles'

const TONE_CLASS: Record<DueTone, string> = {
  danger: 'text-danger',
  warning: 'text-warning',
  default: 'text-muted',
}

export function Cycles({ snapshot, now }: { snapshot: Snapshot; now: number }) {
  const { filters } = useFilters()
  const tabs = useMemo(
    () => cycleTabs(snapshot.issues, snapshot.cycles, now),
    [snapshot.issues, snapshot.cycles, now],
  )
  const fallback = defaultTabKey(tabs, snapshot.cycles, now)
  const [picked, setPicked] = useState<string | null>(null)
  // 새로 받은 목록에서 고른 탭이 사라지면 지금 기간 탭으로 돌아간다.
  const selected = tabs.find((t) => t.key === picked) ?? tabs.find((t) => t.key === fallback)

  if (!selected) {
    return (
      <EmptyState className="py-12">
        <p className="font-medium">보여 줄 사이클이 없어요</p>
        <p className="text-sm text-muted">Linear에서 사이클을 만들면 여기에 보여요.</p>
      </EmptyState>
    )
  }

  return (
    <Tabs
      className="w-full"
      selectedKey={selected.key}
      onSelectionChange={(key) => setPicked(String(key))}
    >
      <Tabs.ListContainer className="w-fit max-w-full">
        <Tabs.List aria-label="사이클">
          {tabs.map((t) => (
            <Tabs.Tab key={t.key} id={t.key} className="whitespace-nowrap">
              {t.title}
              <Tabs.Indicator />
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs.ListContainer>
      <Tabs.Panel id={selected.key} className="flex flex-col gap-6 pt-6">
        <CycleSummary tab={selected} />
        <CycleIssues
          tab={selected}
          issues={applyFilters(selected.issues, filters)}
          today={kstDate(now)}
        />
      </Tabs.Panel>
    </Tabs>
  )
}

function CycleSummary({ tab }: { tab: CycleTab }) {
  const { progress } = tab
  return (
    <Card>
      <Card.Content className="flex flex-col gap-2">
        {tab.range && <p className="text-sm text-muted">{tab.range}</p>}
        {progress ? (
          <ProgressBar
            aria-label="진행률"
            value={
              progress.total === 0 ? 0 : Math.round((progress.completed / progress.total) * 100)
            }
          >
            <Label>
              완료 {progress.completed} / 전체 {progress.total}
            </Label>
            <ProgressBar.Output />
            <ProgressBar.Track>
              <ProgressBar.Fill />
            </ProgressBar.Track>
          </ProgressBar>
        ) : (
          <p className="font-medium">남은 티켓 {tab.issues.length}건</p>
        )}
      </Card.Content>
    </Card>
  )
}

function CycleIssues({
  tab,
  issues,
  today,
}: {
  tab: CycleTab
  issues: CycleTab['issues']
  today: string
}) {
  if (issues.length === 0) {
    return (
      <EmptyState className="py-12">
        <p className="font-medium">
          {tab.issues.length === 0 ? '이 사이클에 남은 티켓이 없어요' : '필터에 맞는 티켓이 없어요'}
        </p>
        {tab.issues.length > 0 && <p className="text-sm text-muted">필터를 바꿔 보세요.</p>}
      </EmptyState>
    )
  }
  return (
    <div className="flex flex-col gap-6">
      {groupByAssignee(issues).map((group) => (
        <AssigneeSection key={group.id} group={group} today={today} />
      ))}
    </div>
  )
}

function AssigneeSection({ group, today }: { group: AssigneeGroup; today: string }) {
  return (
    <section aria-label={group.name} className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {group.id !== NONE && <MemberAvatar name={group.name} avatarUrl={group.avatarUrl} />}
        <h3 className="font-semibold">{group.name}</h3>
        <Chip size="sm">{group.issues.length}</Chip>
      </div>
      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label={`${group.name} 티켓`} className="min-w-[700px] table-fixed">
            <Table.Header>
              <Table.Column isRowHeader>제목</Table.Column>
              <Table.Column className="w-24">번호</Table.Column>
              <Table.Column className="w-28">기한</Table.Column>
              <Table.Column className="w-36">라벨</Table.Column>
              <Table.Column className="w-32">마일스톤</Table.Column>
            </Table.Header>
            <Table.Body>
              {group.issues.map((issue) => {
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
                    <Table.Cell className={`whitespace-nowrap ${TONE_CLASS[due.tone]}`}>
                      {due.text}
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
                    <Table.Cell>
                      <Chip size="sm">{issue.milestone?.name ?? '마일스톤 없음'}</Chip>
                    </Table.Cell>
                  </Table.Row>
                )
              })}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>
    </section>
  )
}
