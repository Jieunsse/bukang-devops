'use client'

import { ChevronLeft, ChevronRight } from '@gravity-ui/icons'
import { Button, Card } from '@heroui/react'

import type { DateString } from '@/shared/lib/date'

import { monthLabel, shiftMonth, type Month } from '../lib/month'

/** 달력 카드 머리: 몇 년 몇 월, 이전 달·오늘·다음 달 버튼 */
export function MonthNav({
  month,
  today,
  onChange,
}: {
  month: Month
  today: DateString
  onChange: (month: Month) => void
}) {
  return (
    <Card.Header className="flex-row flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-semibold">{monthLabel(month)}</h2>
      <div className="flex items-center gap-1">
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          aria-label="이전 달"
          className="cursor-pointer"
          onPress={() => onChange(shiftMonth(month, -1))}
        >
          <ChevronLeft aria-hidden className="size-4" />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="cursor-pointer"
          onPress={() => onChange(today.slice(0, 7))}
        >
          오늘
        </Button>
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          aria-label="다음 달"
          className="cursor-pointer"
          onPress={() => onChange(shiftMonth(month, 1))}
        >
          <ChevronRight aria-hidden className="size-4" />
        </Button>
      </div>
    </Card.Header>
  )
}
