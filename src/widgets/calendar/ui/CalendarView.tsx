'use client'

import { FilterButton } from '@/features/filter'
import { RefreshButton } from '@/features/refresh'
import { useSnapshot } from '@/shared/api/linear/query'
import { useNow } from '@/shared/lib/use-now'

import { MonthCalendar } from './MonthCalendar'

export function CalendarView() {
  return (
    <MonthCalendar
      snapshot={useSnapshot()}
      now={useNow()}
      actions={
        <>
          <RefreshButton />
          <FilterButton />
        </>
      }
    />
  )
}
