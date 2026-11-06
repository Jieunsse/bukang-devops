'use client'

import { Button, Card } from '@heroui/react'
import { useState, type ReactNode } from 'react'

import type { Schedule } from '@/shared/api/schedule'
import { useSchedules } from '@/shared/api/schedule/query'
import { formatMonthDay, kstDate, type DateString } from '@/shared/lib/date'
import { PageToolbar } from '@/shared/ui'

import {
  FINAL_PRESENTATION,
  monthLabel,
  monthWeeks,
  schedulesByDate,
  type Month,
} from '../lib/month'
import { cellLabel, WEEKDAYS } from './MonthCalendar'
import { MonthNav } from './MonthNav'
import { ScheduleDialog } from './ScheduleDialog'

/** 팀이 직접 넣는 개발 일정 달력. 보기는 누구나, 추가·수정·삭제는 팀 비밀번호가 있어야 한다. */
export function ScheduleCalendar({ now, actions }: { now: number; actions?: ReactNode }) {
  const today = kstDate(now)
  const [month, setMonth] = useState<Month>(today.slice(0, 7))
  const [editing, setEditing] = useState<Schedule | 'new' | null>(null)
  const [password, setPassword] = useState('')
  const { data: schedules = [], isPending, isError } = useSchedules()

  const days = monthWeeks(month).flat()
  const byDate = schedulesByDate(schedules, days)
  const monthCount = schedules.filter(
    (s) => s.start <= `${month}-31` && s.end >= `${month}-01`,
  ).length

  return (
    <div className="flex flex-col gap-4">
      <PageToolbar
        title="달력"
        summary={`이 달 일정 ${monthCount}건`}
        actions={
          <>
            {actions}
            <Button size="sm" className="cursor-pointer" onPress={() => setEditing('new')}>
              일정 추가
            </Button>
          </>
        }
      />
      <Card>
        <MonthNav month={month} today={today} onChange={setMonth} />
        <Card.Content className="flex flex-col gap-3">
          {isPending && <p className="text-sm text-muted">일정을 불러오는 중이에요</p>}
          {isError && <p className="text-sm text-danger">일정을 불러오지 못했어요</p>}
          {!isPending && !isError && monthCount === 0 && (
            <p className="text-sm text-muted">
              이 달에 일정이 없어요. 「일정 추가」로 넣어 주세요.
            </p>
          )}
          <div>
            <div aria-hidden className="grid grid-cols-7 text-center text-xs text-muted">
              {WEEKDAYS.map((w) => (
                <span key={w} className="pb-1">
                  {w}
                </span>
              ))}
            </div>
            <ol
              aria-label={`${monthLabel(month)} 일정 달력`}
              className="grid grid-cols-7 border-t border-l border-separator"
            >
              {days.map((date) => (
                <DayCell
                  key={date}
                  date={date}
                  today={today}
                  outside={!date.startsWith(month)}
                  schedules={byDate.get(date) ?? []}
                  onOpen={setEditing}
                />
              ))}
            </ol>
          </div>
          <p className="text-xs text-muted">일정을 누르면 고치거나 지울 수 있어요</p>
        </Card.Content>
      </Card>
      {editing && (
        <ScheduleDialog
          // 열 때마다 새로 그려 지난번 입력과 오류가 남지 않게 한다.
          key={editing === 'new' ? 'new' : editing.id}
          onClose={() => setEditing(null)}
          schedule={editing === 'new' ? null : editing}
          defaults={{ title: '', start: today, end: today }}
          password={password}
          onPasswordChange={setPassword}
        />
      )}
    </div>
  )
}

function DayCell({
  date,
  today,
  outside,
  schedules,
  onOpen,
}: {
  date: DateString
  today: DateString
  outside: boolean
  schedules: Schedule[]
  onOpen: (schedule: Schedule) => void
}) {
  const isToday = date === today
  const isFinal = date === FINAL_PRESENTATION
  return (
    <li
      aria-label={cellLabel(date)}
      aria-current={isToday ? 'date' : undefined}
      className={`flex min-h-16 min-w-0 flex-col gap-1 border-r border-b border-separator p-1 md:min-h-32 ${
        isFinal ? 'ring-2 ring-accent ring-inset' : ''
      }`}
    >
      <div className="flex justify-end text-xs">
        <span
          className={
            isToday
              ? 'grid size-6 place-items-center rounded-full bg-warning font-semibold text-warning-foreground'
              : `px-1 leading-6 ${outside ? 'text-muted' : ''}`
          }
        >
          {date.endsWith('-01') ? formatMonthDay(date) : Number(date.slice(8))}
        </span>
      </div>
      <ul className="flex min-w-0 flex-col gap-0.5">
        {schedules.map((s) => (
          <li key={s.id} className="min-w-0">
            <Button
              size="sm"
              variant="tertiary"
              aria-label={`${s.title}, ${formatMonthDay(s.start)}~${formatMonthDay(s.end)}`}
              className="h-auto w-full min-w-0 cursor-pointer justify-start rounded px-1 text-xs leading-5 font-normal"
              onPress={() => onOpen(s)}
            >
              <span className="truncate">{s.title}</span>
            </Button>
          </li>
        ))}
      </ul>
    </li>
  )
}
