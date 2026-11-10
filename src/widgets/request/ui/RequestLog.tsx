'use client'

import { Disclosure, Spinner, Table } from '@heroui/react'
import { useQuery } from '@tanstack/react-query'

import { MemberAvatar } from '@/entities/member'
import { StateIcon, stateLabel } from '@/entities/ticket'
import { loadRequestLogAction } from '@/shared/api/request/actions'
import { formatKstDateTime } from '@/shared/lib/date'

export const REQUEST_LOG_KEY = ['request-log']

/** 작업 요청으로 만든 티켓을 최근 것부터 표로 보여 준다. 제목을 눌러 접고 펼친다. */
export function RequestLog() {
  const log = useQuery({ queryKey: REQUEST_LOG_KEY, queryFn: () => loadRequestLogAction() })
  return (
    <Disclosure defaultExpanded>
      <Disclosure.Heading>
        <Disclosure.Trigger className="flex w-full items-center gap-2 text-base font-semibold">
          요청 내역{log.data ? ` ${log.data.length}건` : ''}
          <Disclosure.Indicator />
        </Disclosure.Trigger>
      </Disclosure.Heading>
      <Disclosure.Content>
        <Disclosure.Body className="pt-3">
          {log.isPending ? (
            <div className="flex justify-center py-8">
              <Spinner aria-label="요청 내역을 받는 중" />
            </div>
          ) : log.isError ? (
            <p role="alert" className="text-sm text-danger">
              Linear에서 요청 내역을 받지 못했어요. 잠시 뒤 다시 열어 주세요.
            </p>
          ) : log.data.length === 0 ? (
            <p className="text-sm text-muted">아직 보낸 요청이 없어요.</p>
          ) : (
            <Table>
              <Table.ScrollContainer>
                {/* 좁은 화면에서는 표 안에서 옆으로 밀어 본다. 제목 칸이 남도록 최소 폭을 잡는다. */}
                <Table.Content aria-label="요청 내역" className="min-w-[720px] table-fixed">
                  <Table.Header>
                    <Table.Column isRowHeader>제목</Table.Column>
                    <Table.Column className="w-24">번호</Table.Column>
                    <Table.Column className="w-28">요청한 사람</Table.Column>
                    <Table.Column className="w-28">받는 사람</Table.Column>
                    <Table.Column className="w-24">상태</Table.Column>
                    <Table.Column className="w-28">요청 시각</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {log.data.map((entry) => (
                      <Table.Row key={entry.identifier} id={entry.identifier}>
                        <Table.Cell>
                          <a
                            href={entry.url}
                            target="_blank"
                            rel="noreferrer"
                            title={entry.title}
                            className="block truncate font-medium hover:underline"
                          >
                            {entry.title}
                          </a>
                        </Table.Cell>
                        <Table.Cell className="whitespace-nowrap text-muted">
                          {entry.identifier}
                        </Table.Cell>
                        <Table.Cell className="whitespace-nowrap">
                          {entry.requester ? (
                            <span className="flex items-center gap-2">
                              <MemberAvatar
                                name={entry.requester}
                                avatarUrl={entry.requesterAvatarUrl}
                              />
                              {entry.requester}
                            </span>
                          ) : (
                            <span className="text-muted">알 수 없음</span>
                          )}
                        </Table.Cell>
                        <Table.Cell className="whitespace-nowrap">
                          {entry.assignee ? (
                            <span className="flex items-center gap-2">
                              <MemberAvatar {...entry.assignee} />
                              {entry.assignee.name}
                            </span>
                          ) : (
                            <span className="text-muted">담당자 없음</span>
                          )}
                        </Table.Cell>
                        <Table.Cell className="whitespace-nowrap">
                          <span className="flex items-center gap-1">
                            <StateIcon state={entry.state} />
                            {/* 아이콘에 같은 이름이 있어 화면 읽기 프로그램은 한 번만 읽게 한다. */}
                            <span aria-hidden>{stateLabel(entry.state)}</span>
                          </span>
                        </Table.Cell>
                        <Table.Cell className="whitespace-nowrap text-muted">
                          {formatKstDateTime(entry.createdAt)}
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          )}
        </Disclosure.Body>
      </Disclosure.Content>
    </Disclosure>
  )
}
