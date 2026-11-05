'use client'

import { Badge, Calendar, Card, I18nProvider } from '@heroui/react'
import { buttonVariants } from '@heroui/styles'
import { parseDate } from '@internationalized/date'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import { dayTone, inCycle } from '@/entities/ticket'
import type { Cycle } from '@/shared/api/linear'
import { formatMonthDay } from '@/shared/lib/date'

import { FINAL_PRESENTATION } from '../lib/presentation'

export function CalendarCard({
  counts,
  cycles,
  today,
  selected,
  onSelect,
}: {
  counts: Map<string, number>
  cycles: Cycle[]
  today: string
  selected: string | null
  onSelect: (date: string | null) => void
}) {
  // 필터가 남도록 지금 주소의 뒷부분을 그대로 붙인다.
  const search = useSearchParams().toString()
  return (
    <Card>
      <Card.Header className="flex-row items-center justify-between gap-2">
        <Card.Title>기한 달력</Card.Title>
        <Link
          href={`/calendar${search ? `?${search}` : ''}`}
          className={buttonVariants({ variant: 'ghost', size: 'sm' })}
        >
          크게 보기
        </Link>
      </Card.Header>
      <Card.Content className="flex flex-col gap-3">
        {/* 이미 고른 날짜를 다시 누르면 선택을 푼다. 달력은 같은 날을 다시 골라도 알려 주지 않아서,
            누르기 시작할 때 고른 칸인지 보고 달력보다 먼저 처리한다. 키보드로는 「날짜 선택 풀기」 버튼으로 푼다. */}
        <div
          onPointerDownCapture={(event) => {
            const cell = (event.target as HTMLElement).closest('[data-slot="calendar-cell"]')
            if (cell?.hasAttribute('data-selected')) {
              event.stopPropagation()
              onSelect(null)
            }
          }}
        >
          <I18nProvider locale="ko-KR">
            <Calendar
              aria-label="기한 달력"
              // 기본 달력은 폭이 252px로 고정이라 카드 폭에 맞게 늘린다.
              className="w-full max-w-none"
              value={selected ? parseDate(selected) : null}
              defaultFocusedValue={parseDate(today)}
              onChange={(value) => onSelect(value.toString())}
            >
              <Calendar.Header>
                <Calendar.Heading />
                <Calendar.NavButton slot="previous" />
                <Calendar.NavButton slot="next" />
              </Calendar.Header>
              <Calendar.Grid className="w-full gap-x-1 gap-y-1.5">
                <Calendar.GridHeader>
                  {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
                </Calendar.GridHeader>
                <Calendar.GridBody>
                  {(date) => {
                    const day = date.toString()
                    const count = counts.get(day) ?? 0
                    const isFinal = day === FINAL_PRESENTATION
                    return (
                      <Calendar.Cell
                        date={date}
                        className={[
                          'mx-auto aspect-square size-10 text-sm sm:size-11',
                          // 사이클 바탕은 회색으로 둬서 파란 「오늘」 바탕과 구분한다. 오늘·선택 칸에는 덮어쓰지 않는다.
                          inCycle(day, cycles) ? 'not-data-selected:not-data-today:bg-default/60' : '',
                          isFinal ? 'ring-2 ring-accent ring-inset' : '',
                        ].join(' ')}
                      >
                        {({ formattedDate }) => (
                          <>
                            {formattedDate}
                            {count > 0 && (
                              <Badge
                                color={dayTone(day, today)}
                                size="sm"
                                placement="top-right"
                                className="tabular-nums"
                              >
                                {count}
                              </Badge>
                            )}
                          </>
                        )}
                      </Calendar.Cell>
                    )
                  }}
                </Calendar.GridBody>
              </Calendar.Grid>
            </Calendar>
          </I18nProvider>
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          <li className="flex items-center gap-1">
            <span aria-hidden className="size-3 rounded bg-default/60" />
            사이클 기간
          </li>
          <li className="flex items-center gap-1">
            <span aria-hidden className="size-3 rounded ring-2 ring-accent ring-inset" />
            최종 발표 {formatMonthDay(FINAL_PRESENTATION)}
          </li>
          <li>날짜 위 숫자는 그날 기한인 남은 티켓 수예요</li>
        </ul>
      </Card.Content>
    </Card>
  )
}
