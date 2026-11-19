'use client'

import { DEFAULT_RANGE, RANGES, type RangeKey } from '@/shared/lib/time-range'
import { report as s, ReportSection } from '@/shared/ui'
import { MultiLineChart } from '@/shared/ui/chart/MultiLineChart'

import type { BriefCard, BriefUnit } from '../model/brief'
import { BRIEF_FORMAT } from '../model/format'

// 병목 흐름 카드 6장. 같은 크기로 병목이 번지는 순서대로 둔다. 주의 문장은 판정 칸에 모아 보여 준다.
// 기준을 넘은 항목은 「주의」 글자를 빨강으로 쓴다(CLAUDE.md 모니터링 예외).

const FORMAT: Record<BriefUnit, (v: number) => string> = BRIEF_FORMAT
const NUMBERS = ['①', '②', '③', '④', '⑤', '⑥']

export function BriefSection({
  cards,
  range = DEFAULT_RANGE,
}: {
  cards: BriefCard[]
  range?: RangeKey
}) {
  return (
    <ReportSection
      title="병목 흐름"
      description={`최근 ${RANGES[range].label} · 요청에서 DB까지 번지는 순서`}
    >
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((c, i) => (
            <section key={c.key} aria-label={c.title} className={s.card}>
              {c.series.length ? (
                <MultiLineChart title={c.title} series={c.series} format={FORMAT[c.unit]} />
              ) : (
                <p className="m-0 py-10 text-center text-base text-muted">그래프가 없어요</p>
              )}
              <h4 className="m-0 text-base font-bold">
                {NUMBERS[i]} {c.title}
                {c.alert && <span className="ml-2 text-base text-danger">· 주의</span>}
              </h4>
              <p className={`m-0 text-base ${c.alert ? 'font-semibold' : 'text-muted'}`}>
                {c.caption}
              </p>
            </section>
          ))}
        </div>
      </div>
    </ReportSection>
  )
}
