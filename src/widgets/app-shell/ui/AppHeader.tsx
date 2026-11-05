'use client'

import { currentPeriod, type Period } from '@/entities/ticket'
import { FilterButton } from '@/features/filter'
import { RefreshButton } from '@/features/refresh'
import { useSnapshot } from '@/shared/api/linear/query'
import { useNow } from '@/shared/lib/use-now'
import { daysBetween, formatKstDateTime, formatMonthDay, kstDate } from '@/shared/lib/date'

const FINAL_PRESENTATION = '2026-11-23'

export function dDayLabel(today: string, target: string): string {
  const days = daysBetween(today, target)
  if (days === 0) return 'D-day'
  return days > 0 ? `D-${days}` : `D+${-days}`
}

export function periodLabel(period: Period): string {
  const range = `${formatMonthDay(period.start)}~${formatMonthDay(period.end)}`
  if (period.kind === 'outside') return `사이클 밖 · ${range}`
  const { number, name } = period.cycle
  return `사이클 ${number}${name ? ` ${name}` : ''} · ${range}`
}

export function AppHeader() {
  const { cycles, fetchedAt } = useSnapshot()
  const now = useNow()
  const today = kstDate(now)

  return (
    <header className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">bukang-devops</h1>
        <p className="text-sm font-medium">
          최종 발표 <span className="tabular-nums">{dDayLabel(today, FINAL_PRESENTATION)}</span>
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="font-medium">{periodLabel(currentPeriod(now, cycles))}</p>
        <p className="text-sm text-muted">마지막으로 받은 시각 {formatKstDateTime(fetchedAt)}</p>
        <div className="ml-auto flex items-center gap-2">
          <RefreshButton />
          <FilterButton />
        </div>
      </div>
    </header>
  )
}
