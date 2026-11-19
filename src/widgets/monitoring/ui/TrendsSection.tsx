'use client'

import { useState } from 'react'

import { DEFAULT_RANGE, RANGES, type RangeKey } from '@/shared/lib/time-range'
import { report as s, ReportSection } from '@/shared/ui'

import { mbText, msText, percentText, rpsText } from '../model/format'
import type { TrendKind, Trends } from '../model/load'
import { totalErrorTrend } from '../model/verdict'
import { TrendChart } from './TrendChart'

const stepText = (sec: number) => (sec < 60 ? `${sec}초` : `${Math.round(sec / 60)}분`)

/** 추이에서 고를 수 있는 지표. 지표마다 단위가 달라 그래프를 따로 그린다 */
const TREND_ITEMS: { kind: TrendKind; label: string; format: (v: number) => string }[] = [
  { kind: 'errors', label: '서버 오류 비율', format: (v) => percentText(v) },
  { kind: 'rps', label: '초당 요청', format: (v) => rpsText(v) },
  { kind: 'p95', label: '응답 시간(95%)', format: (v) => msText(v) },
  { kind: 'heap', label: '힙 메모리', format: (v) => mbText(v) },
]

/** 추이: 전체 서버 오류 비율 큰 그래프와 서비스(모듈)별 그래프. 요약 탭과 상세 지표 탭이 함께 쓴다 */
export function TrendsSection({
  trends: all,
  range = DEFAULT_RANGE,
}: {
  trends: Trends
  range?: RangeKey
}) {
  const [kind, setKind] = useState<TrendKind>('errors')
  const trendItem = TREND_ITEMS.find((i) => i.kind === kind) ?? TREND_ITEMS[0]!
  const trends = all[kind]
  const totalTrend = all.errors && all.rps ? totalErrorTrend(all.errors, all.rps) : null
  return (
    <ReportSection
      title="추이"
      description={`최근 ${RANGES[range].label} · ${stepText(RANGES[range].step)} 간격`}
    >
      <div id="monitoring-trends" className="flex scroll-mt-4 flex-col gap-4">
        <div className={s.card}>
          {totalTrend ? (
            <TrendChart
              title="전체 서버 오류 비율"
              points={totalTrend}
              format={(v) => percentText(v)}
              hero
              width={960}
              height={240}
            />
          ) : (
            <p className="text-base text-muted">전체 서버 오류 비율 추이를 받지 못했어요</p>
          )}
        </div>
        <div role="group" aria-label="추이 지표" className={`${s.seg} self-start`}>
          {TREND_ITEMS.map((item) => (
            <button
              key={item.kind}
              type="button"
              aria-pressed={kind === item.kind}
              onClick={() => setKind(item.kind)}
            >
              {item.label}
            </button>
          ))}
        </div>
        {trends ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trends.map((t) => (
              <div key={t.job} className={s.card}>
                <TrendChart title={t.name} points={t.points} format={trendItem.format} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-base text-muted">{trendItem.label} 추이를 받지 못했어요</p>
        )}
      </div>
    </ReportSection>
  )
}
