'use client'

import { Chip } from '@heroui/react'

import { periodBadge } from '@/entities/ticket'
import { useSnapshot } from '@/shared/api/linear/query'
import { useNow } from '@/shared/lib/use-now'

export function AppHeader() {
  const { cycles } = useSnapshot()
  const badge = periodBadge(useNow(), cycles)

  return (
    <header className="flex flex-col gap-2">
      <h1 className="text-xl font-semibold">bukang-devops</h1>
      {/* 지금 기간을 칩과 날짜를 묶은 배지 하나로 보여 준다. */}
      <div
        aria-label="지금 기간"
        className="inline-flex w-fit flex-wrap items-center gap-2 rounded-full border border-border py-1 pr-3 pl-1 text-sm"
      >
        <Chip size="sm" variant="soft" color={badge.inCycle ? 'accent' : 'default'}>
          {badge.chip}
        </Chip>
        <span>{badge.range}</span>
        {badge.dayOf && <span className="text-muted">· {badge.dayOf}</span>}
      </div>
    </header>
  )
}
