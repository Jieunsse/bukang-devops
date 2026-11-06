'use client'

import { Button, Card, toast } from '@heroui/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef, useState, type ReactNode } from 'react'

import type { Schedule } from '@/shared/api/schedule'
import { writeScheduleAction } from '@/shared/api/schedule/actions'
import { SCHEDULES_QUERY_KEY, useSchedules } from '@/shared/api/schedule/query'
import { formatMonthDay, kstDate, type DateString } from '@/shared/lib/date'
import { PageToolbar } from '@/shared/ui'

import {
  FINAL_PRESENTATION,
  monthLabel,
  monthWeeks,
  moveRange,
  schedulesByDate,
  type Month,
} from '../lib/month'
import { SCHEDULE_COLOR_STYLE } from '../lib/colors'
import { cellLabel, WEEKDAYS } from './MonthCalendar'
import { MonthNav } from './MonthNav'
import { ScheduleDialog } from './ScheduleDialog'

/** 팀이 직접 넣는 개발 일정 달력. 보기는 누구나, 추가·수정·삭제는 팀 비밀번호가 있어야 한다. */
export function ScheduleCalendar({ now, actions }: { now: number; actions?: ReactNode }) {
  const today = kstDate(now)
  const [month, setMonth] = useState<Month>(today.slice(0, 7))
  // 고칠 일정, 또는 새 일정을 넣을 날짜. null이면 창이 닫혀 있다.
  const [editing, setEditing] = useState<Schedule | DateString | null>(null)
  const [password, setPassword] = useState('')
  const { data: schedules = [], isPending, isError } = useSchedules()
  const queryClient = useQueryClient()
  // 끌고 있는 일정과 그 일정을 잡은 날짜. 기간 일정은 어느 날 칸에서 잡았는지에 따라 옮길 날 수가 달라진다.
  const dragging = useRef<{ schedule: Schedule; from: DateString } | null>(null)
  const [dropTarget, setDropTarget] = useState<DateString | null>(null)

  // 끌어 옮기기는 서버 응답을 기다리지 않고 바로 새 자리에 보여 준다. 거절되면 원래 자리로 되돌린다.
  const move = useMutation({
    mutationFn: async (moved: Schedule) => {
      const { id, ...input } = moved
      const result = await writeScheduleAction(password, { kind: 'update', id, input })
      if (!result.ok) throw result
    },
    onMutate: async (moved) => {
      await queryClient.cancelQueries({ queryKey: SCHEDULES_QUERY_KEY })
      const before = queryClient.getQueryData<Schedule[]>(SCHEDULES_QUERY_KEY)
      queryClient.setQueryData<Schedule[]>(SCHEDULES_QUERY_KEY, (list) =>
        list?.map((s) => (s.id === moved.id ? moved : s)),
      )
      return { before }
    },
    onError: (error, _moved, context) => {
      queryClient.setQueryData(SCHEDULES_QUERY_KEY, context?.before)
      const reason = (error as { reason?: string }).reason
      if (reason === 'password') {
        // 틀린 비밀번호를 계속 쓰지 않게 지운다. 다음에 옮기면 창에서 다시 묻는다.
        setPassword('')
        toast.danger('비밀번호가 맞지 않아 원래 자리로 되돌렸어요.')
      } else if (reason === 'missing') {
        toast.danger('다른 사람이 이미 지운 일정이에요.')
      } else {
        toast.danger('옮기지 못해 원래 자리로 되돌렸어요. 잠시 뒤 다시 해 주세요.')
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: SCHEDULES_QUERY_KEY }),
  })

  const drop = (to: DateString) => {
    const drag = dragging.current
    dragging.current = null
    setDropTarget(null)
    if (!drag || drag.from === to) return
    const moved = { ...drag.schedule, ...moveRange(drag.schedule, drag.from, to) }
    // 비밀번호를 아직 안 넣었으면 옮긴 날짜를 채운 고치기 창에서 묻는다.
    if (password) move.mutate(moved)
    else setEditing(moved)
  }

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
            <Button size="sm" className="cursor-pointer" onPress={() => setEditing(today)}>
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
                  onAdd={setEditing}
                  isDropTarget={dropTarget === date}
                  onDragStart={(schedule) => (dragging.current = { schedule, from: date })}
                  onDragEnter={() => dragging.current && setDropTarget(date)}
                  onDrop={() => drop(date)}
                  onDragEnd={() => {
                    // 칸 밖에 놓거나 Esc로 끌기를 그만두면 강조를 지운다.
                    dragging.current = null
                    setDropTarget(null)
                  }}
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
          key={typeof editing === 'string' ? `new-${editing}` : editing.id}
          onClose={() => setEditing(null)}
          schedule={typeof editing === 'string' ? null : editing}
          defaults={{
            title: '',
            start: typeof editing === 'string' ? editing : today,
            end: typeof editing === 'string' ? editing : today,
          }}
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
  onAdd,
  isDropTarget,
  onDragStart,
  onDragEnter,
  onDrop,
  onDragEnd,
}: {
  date: DateString
  today: DateString
  outside: boolean
  schedules: Schedule[]
  onOpen: (schedule: Schedule) => void
  /** 칸의 빈 곳을 두 번 누르면 그 날짜로 추가 창을 연다. 키보드는 「일정 추가」 버튼을 쓴다. */
  onAdd: (date: DateString) => void
  isDropTarget: boolean
  /** 일정을 끌어 다른 날짜 칸에 놓으면 옮긴다. 키보드는 일정을 눌러 고치기 창에서 날짜를 바꾼다. */
  onDragStart: (schedule: Schedule) => void
  onDragEnter: () => void
  onDrop: () => void
  onDragEnd: () => void
}) {
  const isToday = date === today
  const isFinal = date === FINAL_PRESENTATION
  return (
    <li
      aria-label={cellLabel(date)}
      aria-current={isToday ? 'date' : undefined}
      // 일정 버튼 위에서 두 번 누른 것은 고치기로 두고, 빈 곳만 추가로 이어지게 한다.
      onDoubleClick={(e) => {
        if (!(e.target as HTMLElement).closest('button')) onAdd(date)
      }}
      onDragEnter={onDragEnter}
      // 기본 동작을 막아야 이 칸에 놓을 수 있다.
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        onDrop()
      }}
      className={`flex min-h-16 min-w-0 cursor-pointer flex-col gap-1 border-r border-b border-separator p-1 select-none md:min-h-32 ${
        isFinal ? 'ring-2 ring-accent ring-inset' : ''
      } ${isDropTarget ? 'bg-accent/10' : ''}`}
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
          <li
            key={s.id}
            className="min-w-0"
            draggable
            onDragStart={(e) => {
              // Firefox는 옮길 값이 있어야 끌기를 시작한다.
              e.dataTransfer?.setData('text/plain', s.id)
              if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
              onDragStart(s)
            }}
            onDragEnd={onDragEnd}
          >
            <Button
              size="sm"
              variant="ghost"
              aria-label={`${s.title}, ${formatMonthDay(s.start)}~${formatMonthDay(s.end)}`}
              className={`h-auto w-full min-w-0 cursor-pointer justify-start rounded border-l-4 px-1 text-xs leading-5 font-medium text-foreground ${SCHEDULE_COLOR_STYLE[s.color].bar}`}
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
