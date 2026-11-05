'use client'

import { currentPeriod, periodLabel } from '@/entities/ticket'
import { useSnapshot } from '@/shared/api/linear/query'
import { useNow } from '@/shared/lib/use-now'
import { formatKstDateTime } from '@/shared/lib/date'

export function AppHeader() {
  const { cycles, fetchedAt } = useSnapshot()
  const now = useNow()

  return (
    <header className="flex flex-col gap-3">
      <h1 className="text-xl font-semibold">bukang-devops</h1>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="font-medium">{periodLabel(currentPeriod(now, cycles))}</p>
        <p className="text-sm text-muted">마지막으로 받은 시각 {formatKstDateTime(fetchedAt)}</p>
      </div>
    </header>
  )
}
