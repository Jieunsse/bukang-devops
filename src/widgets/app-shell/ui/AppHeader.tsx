'use client'

import { currentPeriod, type Period } from '@/entities/ticket'
import { FilterButton } from '@/features/filter'
import { RefreshButton } from '@/features/refresh'
import { ThemeToggle } from '@/features/theme'
import { useSnapshot } from '@/shared/api/linear/query'
import { useNow } from '@/shared/lib/use-now'
import { formatKstDateTime, formatMonthDay } from '@/shared/lib/date'

export function periodLabel(period: Period): string {
  const range = `${formatMonthDay(period.start)}~${formatMonthDay(period.end)}`
  if (period.kind === 'outside') return `사이클 밖 · ${range}`
  const { number, name } = period.cycle
  return `사이클 ${number}${name ? ` ${name}` : ''} · ${range}`
}

export function AppHeader() {
  const { cycles, fetchedAt } = useSnapshot()
  const now = useNow()

  return (
    <header className="flex flex-col gap-3">
      <h1 className="text-xl font-semibold">bukang-devops</h1>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="font-medium">{periodLabel(currentPeriod(now, cycles))}</p>
        <p className="text-sm text-muted">마지막으로 받은 시각 {formatKstDateTime(fetchedAt)}</p>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <RefreshButton />
          <FilterButton />
        </div>
      </div>
    </header>
  )
}
