'use client'

import { report as s, ReportSection } from '@/shared/ui'
import { MultiLineChart } from '@/shared/ui/chart/MultiLineChart'

import type { BriefCard, BriefUnit } from '../model/brief'

// 자동 브리핑. 맨 위에 주의 문장을 모으고, 아래에 병목이 번지는 순서대로 카드 6장을 둔다.
// 기준을 넘은 항목은 「주의」 글자를 빨강으로 쓴다(CLAUDE.md 모니터링 예외).

const FORMAT: Record<BriefUnit, (v: number) => string> = {
  reqps: (v) => v.toFixed(v < 10 ? 2 : 1),
  percentunit: (v) => `${Math.round(v * 100)}%`,
  s: (v) => (v < 1 ? `${Math.round(v * 1000)}ms` : `${v.toFixed(1)}초`),
  short: (v) => (Number.isInteger(v) ? String(v) : v.toFixed(v < 10 ? 2 : 1)),
}
const NUMBERS = ['①', '②', '③', '④', '⑤', '⑥']

export function BriefSection({ cards }: { cards: BriefCard[] }) {
  const alerts = cards.map((c) => c.alert).filter((a): a is string => a !== null)
  return (
    <ReportSection title="자동 브리핑" description="최근 1시간">
      <div className="flex flex-col gap-3">
        <div className={s.lead} role="status">
          {alerts.length ? (
            alerts.map((a, i) => (
              <p key={i}>
                <strong className="text-danger">주의</strong> {a}
              </p>
            ))
          ) : (
            <p>최근 1시간 동안 기준을 넘은 지표가 없어요.</p>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {cards.map((c, i) => (
            <section key={c.key} aria-label={c.title} className={`${s.fact} gap-2 p-4`}>
              {c.series.length ? (
                <MultiLineChart title={c.title} series={c.series} format={FORMAT[c.unit]} />
              ) : (
                <p className="m-0 py-10 text-center text-sm text-muted">그래프가 없어요</p>
              )}
              <h4 className="m-0 text-base font-bold">
                {NUMBERS[i]} {c.title}
                {c.alert && <span className="ml-2 text-sm text-danger">· 주의</span>}
              </h4>
              <p className={`m-0 text-sm ${c.alert ? 'font-semibold' : 'text-muted'}`}>
                {c.caption}
              </p>
            </section>
          ))}
        </div>
      </div>
    </ReportSection>
  )
}
