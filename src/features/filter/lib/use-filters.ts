'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo } from 'react'

import { parseFilters, toSearch, type Filters } from './filter'

/** 필터는 주소에 남긴다. 링크로 같은 화면을 나눠 볼 수 있다. */
export function useFilters() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const filters = useMemo(() => parseFilters(searchParams), [searchParams])

  const setFilters = useCallback(
    (next: Filters) => {
      const search = toSearch(next)
      // 주소만 바뀌고 데이터는 브라우저가 가진 목록에서 다시 거른다.
      router.replace(`${pathname}${search ? `?${search}` : ''}`, { scroll: false })
    },
    [pathname, router],
  )

  return { filters, setFilters }
}
