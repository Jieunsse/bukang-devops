'use client'

import { Label, ListBox, Select } from '@heroui/react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

import { parseRange, RANGES, rangeHref, type RangeKey } from '@/shared/lib/time-range'

/** 모니터링 기간 고르기. 주소의 range만 바꿔서 대상 고르기 값과 탭은 그대로 둔다 */
export function RangeSelect() {
  const router = useRouter()
  const pathname = usePathname()
  const search = useSearchParams()
  const range = parseRange(search.get('range'))
  // 서버가 새 기간으로 그리는 동안 지금 화면을 그대로 둔다
  const [pending, startTransition] = useTransition()
  return (
    <Select
      className="w-32 text-base"
      value={range}
      isDisabled={pending}
      onChange={(v) =>
        v !== null &&
        startTransition(() =>
          router.push(rangeHref(pathname, search.toString(), parseRange(String(v)))),
        )
      }
    >
      <Label className="sr-only">기간</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {(Object.keys(RANGES) as RangeKey[]).map((r) => (
            <ListBox.Item key={r} id={r} textValue={RANGES[r].label}>
              {RANGES[r].label}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  )
}
