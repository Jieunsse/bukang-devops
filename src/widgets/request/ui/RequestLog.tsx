'use client'

import { Card, Separator, Spinner } from '@heroui/react'
import { useQuery } from '@tanstack/react-query'
import { Fragment } from 'react'

import { MemberAvatar } from '@/entities/member'
import { StateIcon, stateLabel } from '@/entities/ticket'
import { loadRequestLogAction } from '@/shared/api/request/actions'
import { formatKstDateTime } from '@/shared/lib/date'

export const REQUEST_LOG_KEY = ['request-log']

/** 작업 요청으로 만든 티켓을 최근 것부터 보여 준다. 누가 누구에게 보냈는지와 지금 상태만 보인다. */
export function RequestLog() {
  const log = useQuery({ queryKey: REQUEST_LOG_KEY, queryFn: () => loadRequestLogAction() })
  return (
    <section aria-labelledby="request-log-title" className="flex flex-col gap-3">
      <h3 id="request-log-title" className="text-base font-semibold">
        요청 내역{log.data ? ` ${log.data.length}건` : ''}
      </h3>
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
        <Card>
          <Card.Content className="flex flex-col gap-3">
            {log.data.map((entry, i) => (
              <Fragment key={entry.identifier}>
                {i > 0 && <Separator />}
                <div className="flex flex-col gap-1">
                  <a
                    href={entry.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-w-0 gap-2 text-sm hover:underline"
                  >
                    <span className="shrink-0 text-muted">{entry.identifier}</span>
                    <span className="truncate font-medium">{entry.title}</span>
                  </a>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                    <span className="flex items-center gap-1">
                      {entry.requester ?? '알 수 없음'}
                      <span aria-hidden>→</span>
                      <span className="sr-only">에게</span>
                      {entry.assignee ? (
                        <>
                          <MemberAvatar
                            name={entry.assignee.name}
                            avatarUrl={entry.assignee.avatarUrl}
                            small
                          />
                          {entry.assignee.name}
                        </>
                      ) : (
                        ' 담당자 없음'
                      )}
                    </span>
                    <span className="flex items-center gap-1">
                      <StateIcon state={entry.state} />
                      {/* 아이콘에 같은 이름이 있어 화면 읽기 프로그램은 한 번만 읽게 한다. */}
                      <span aria-hidden>{stateLabel(entry.state)}</span>
                    </span>
                    <span>{formatKstDateTime(entry.createdAt)} 요청</span>
                  </div>
                </div>
              </Fragment>
            ))}
          </Card.Content>
        </Card>
      )}
    </section>
  )
}
