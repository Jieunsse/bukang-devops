'use client'

import { Calendar, Card, I18nProvider } from '@heroui/react'
import { parseDate } from '@internationalized/date'

import type { DueTone } from '@/entities/ticket'
import type { Cycle } from '@/shared/api/linear'
import { formatMonthDay, kstDate } from '@/shared/lib/date'

import { dayTone } from '../lib/calendar'
import { FINAL_PRESENTATION } from '../lib/presentation'

const COUNT_COLOR: Record<DueTone, string> = {
  danger: 'text-danger',
  warning: 'text-warning',
  default: 'text-muted',
}

/** 사이클 기간(한국 날짜)에 드는지. 끝 시각은 사이클에 들지 않는다. */
const inCycle = (date: string, cycles: Cycle[]) =>
  cycles.some((c) => kstDate(c.startsAt) <= date && date <= kstDate(Date.parse(c.endsAt) - 1))

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
  return (
    <Card>
      <Card.Header>
        <Card.Title>기한 달력</Card.Title>
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
                          // 지름을 고정한 원을 칸 가운데에 둔다. 옆 날짜와 떨어지게 격자에 간격을 준다.
                          'mx-auto aspect-square size-10 flex-col gap-0 text-sm sm:size-11',
                          inCycle(day, cycles) ? 'bg-accent-soft/60' : '',
                          isFinal ? 'ring-2 ring-accent ring-inset' : '',
                        ].join(' ')}
                      >
                        {({ formattedDate }) => (
                          <span className="flex size-full flex-col items-center justify-center">
                            <span>{formattedDate}</span>
                            <span
                              className={`text-[11px] leading-none font-semibold tabular-nums ${count ? COUNT_COLOR[dayTone(day, today)] : 'invisible'}`}
                            >
                              {count || 0}
                            </span>
                          </span>
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
            <span aria-hidden className="size-3 rounded bg-accent-soft" />
            사이클 기간
          </li>
          <li className="flex items-center gap-1">
            <span aria-hidden className="size-3 rounded ring-2 ring-accent ring-inset" />
            최종 발표 {formatMonthDay(FINAL_PRESENTATION)}
          </li>
          <li>숫자는 그날 기한인 남은 티켓 수예요</li>
        </ul>
      </Card.Content>
    </Card>
  )
}
