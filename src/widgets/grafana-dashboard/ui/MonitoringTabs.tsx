'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import { RangeSelect } from '@/features/time-range'
import { parseRange, rangeHref } from '@/shared/lib/time-range'
import { report as s } from '@/shared/ui'

import type { DashboardLink } from '../model/dashboards'

// 요약 페이지(서버 컴포넌트)에서도 쓰므로 클라이언트 부품으로 둔다. report 스타일이 클라이언트 모듈이라서다.

/** 모니터링 위쪽 탭과 기간 고르기. 탭을 옮겨도 고른 기간이 따라간다 */
export function MonitoringTabs({
  links,
  current,
}: {
  links: DashboardLink[]
  /** 지금 보고 있는 대시보드 uid. 요약이면 null, 상세 지표면 'detail' */
  current: string | null
}) {
  const range = parseRange(useSearchParams().get('range'))
  const href = (path: string) => rangeHref(path, '', range)
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <nav aria-label="모니터링 화면" className={`${s.seg} flex-wrap`}>
        <Link href={href('/monitoring')} aria-current={current === null ? 'page' : undefined}>
          요약
        </Link>
        <Link
          href={href('/monitoring/detail')}
          aria-current={current === 'detail' ? 'page' : undefined}
        >
          상세 지표
        </Link>
        {links.map((l) => (
          <Link
            key={l.uid}
            href={href(`/monitoring/${l.uid}`)}
            aria-current={current === l.uid ? 'page' : undefined}
          >
            {l.name}
          </Link>
        ))}
      </nav>
      <RangeSelect />
    </div>
  )
}
