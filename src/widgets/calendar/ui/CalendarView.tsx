'use client'

import { ToggleButton, ToggleButtonGroup } from '@heroui/react'
import { useState } from 'react'

import { FilterButton } from '@/features/filter'
import { RefreshButton } from '@/features/refresh'
import { useSnapshot } from '@/shared/api/linear/query'
import { useNow } from '@/shared/lib/use-now'

import { MonthCalendar } from './MonthCalendar'
import { ScheduleCalendar } from './ScheduleCalendar'

type View = 'tickets' | 'schedules'

export function CalendarView() {
  const [view, setView] = useState<View>('tickets')
  const snapshot = useSnapshot()
  const now = useNow()
  const viewToggle = (
    <ToggleButtonGroup
      aria-label="달력 보기"
      size="sm"
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={[view]}
      onSelectionChange={(keys) => setView([...keys][0] as View)}
    >
      <ToggleButton id="tickets">티켓 보기</ToggleButton>
      <ToggleButton id="schedules">일정 보기</ToggleButton>
    </ToggleButtonGroup>
  )

  // 두 보기를 모두 그려 두고 하나만 보여 준다. 보기를 바꿔도 각자 보던 달이 남는다.
  return (
    <>
      <div hidden={view !== 'tickets'}>
        <MonthCalendar
          snapshot={snapshot}
          now={now}
          actions={
            <>
              {viewToggle}
              <RefreshButton />
              <FilterButton />
            </>
          }
        />
      </div>
      <div hidden={view !== 'schedules'}>
        <ScheduleCalendar now={now} actions={viewToggle} />
      </div>
    </>
  )
}
