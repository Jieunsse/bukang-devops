'use client'

import { Chip, CloseButton } from '@heroui/react'
import { useMemo } from 'react'

import type { Issue } from '@/shared/api/linear'

import { FIELD_LABEL, FILTER_KEYS } from '../lib/filter'
import { filterOptions } from '../lib/options'
import { useFilters } from '../lib/use-filters'

/** 걸린 필터 조건을 칩으로 보여 주고, 칩마다 그 조건만 지운다. */
export function FilterChips({ issues }: { issues: Issue[] }) {
  const { filters, setFilters } = useFilters()
  const options = useMemo(() => filterOptions(issues), [issues])
  const active = FILTER_KEYS.filter((key) => filters[key])
  if (active.length === 0) return null

  return (
    <ul aria-label="고른 필터 조건" className="flex flex-wrap gap-2">
      {active.map((key) => {
        // 주소에 남은 값이 받아 둔 티켓에 없으면 id를 보여 주지 않는다.
        const name = options[key].find((o) => o.id === filters[key])?.name ?? '알 수 없음'
        return (
          <li key={key}>
            <Chip className="h-7 gap-1 pr-1 pl-2.5">
              <span>
                {FIELD_LABEL[key]}: {name}
              </span>
              <CloseButton
                aria-label={`${FIELD_LABEL[key]} 조건 지우기`}
                className="size-5"
                onPress={() => setFilters({ ...filters, [key]: undefined })}
              />
            </Chip>
          </li>
        )
      })}
    </ul>
  )
}
