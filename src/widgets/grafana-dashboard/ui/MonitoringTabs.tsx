'use client'

import Link from 'next/link'

import { report as s } from '@/shared/ui'

import type { DashboardLink } from '../model/dashboards'

// 요약 페이지(서버 컴포넌트)에서도 쓰므로 클라이언트 부품으로 둔다. report 스타일이 클라이언트 모듈이라서다.

/** 모니터링 위쪽 탭. 요약과 그라파나 대시보드들로 옮겨 간다 */
export function MonitoringTabs({
  links,
  current,
}: {
  links: DashboardLink[]
  /** 지금 보고 있는 대시보드 uid. 요약이면 null */
  current: string | null
}) {
  return (
    <nav aria-label="모니터링 화면" className={`${s.seg} flex-wrap`}>
      <Link href="/monitoring" aria-current={current === null ? 'page' : undefined}>
        요약
      </Link>
      {links.map((l) => (
        <Link
          key={l.uid}
          href={`/monitoring/${l.uid}`}
          aria-current={current === l.uid ? 'page' : undefined}
        >
          {l.name}
        </Link>
      ))}
    </nav>
  )
}
