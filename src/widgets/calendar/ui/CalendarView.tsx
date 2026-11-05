'use client'

import { useSnapshot } from '@/shared/api/linear/query'
import { useNow } from '@/shared/lib/use-now'

import { MonthCalendar } from './MonthCalendar'

export function CalendarView() {
  return <MonthCalendar snapshot={useSnapshot()} now={useNow()} />
}
