'use client'

import { EmptyState } from '@heroui/react'
import { useState, type ReactNode } from 'react'

import { report as s, ReportHeader, ReportSection } from '@/shared/ui'

import { hhmm, mbText, msText, percentText, rpsText } from '../model/format'
import type { MonitoringData, TrendKind } from '../model/load'
import type { ServiceRow } from '../model/rows'
import { isHighError, isSlow, sortByIssues, totalErrorTrend, verdictOf } from '../model/verdict'
import { BriefSection } from './BriefSection'
import { TrendChart } from './TrendChart'

// 모니터링 상세 지표. 벤토 그리드로 가장 중요한 판정을 왼쪽 위 큰 칸에 두고, 옆에 숫자 4칸,
// 아래에 같은 크기의 병목 카드 6장을 둔다. AI 리포트는 요약 탭에 있다. 그 아래로 서비스 표 → 추이 → 상태판. 기준(THRESHOLDS)을 넘은 값만 빨간 글자로 쓴다(CLAUDE.md 예외).

const upText = (up: boolean) => (up ? '정상' : '응답 없음')
const timeText = (iso: string) => hhmm(Date.parse(iso) / 1000)
/** 기준을 넘은 값만 빨간 굵은 글자 */
const bad = (on: boolean) => (on ? 'font-semibold text-danger' : undefined)

/** 추이에서 고를 수 있는 지표. 지표마다 단위가 달라 그래프를 따로 그린다 */
const TREND_ITEMS: { kind: TrendKind; label: string; format: (v: number) => string }[] = [
  { kind: 'errors', label: '서버 오류 비율', format: (v) => percentText(v) },
  { kind: 'rps', label: '초당 요청', format: (v) => rpsText(v) },
  { kind: 'p95', label: '응답 시간(95%)', format: (v) => msText(v) },
  { kind: 'heap', label: '힙 메모리', format: (v) => mbText(v) },
]

export function MonitoringView({
  data,
  tabs,
}: {
  data: MonitoringData
  /** 위쪽 탭(그라파나 대시보드로 옮겨 가기). 쓰는 쪽이 넣는다 */
  tabs?: ReactNode
}) {
  if (data.status !== 'ok') {
    return (
      <div className="flex flex-col gap-6">
        <h2 className="text-xl font-semibold">모니터링</h2>
        <EmptyState className="py-24">
          {data.status === 'notConfigured' ? (
            <>
              <p className="font-medium text-foreground">그라파나 연결 정보가 없어요</p>
              <p className="text-base text-muted">
                Vercel 환경변수에 GRAFANA_URL과 GRAFANA_TOKEN을 넣으면 지표가 보여요.
              </p>
            </>
          ) : (
            <>
              <p className="font-medium text-foreground">그라파나에서 지표를 받지 못했어요</p>
              <p className="text-base text-muted">잠시 뒤 새로고침해 주세요.</p>
            </>
          )}
        </EmptyState>
      </div>
    )
  }

  return <Dashboard data={data} tabs={tabs} />
}

function Dashboard({
  data,
  tabs,
}: {
  data: Extract<MonitoringData, { status: 'ok' }>
  tabs?: ReactNode
}) {
  const [kind, setKind] = useState<TrendKind>('errors')
  const trendItem = TREND_ITEMS.find((i) => i.kind === kind) ?? TREND_ITEMS[0]!
  const trends = data.trends[kind]
  const totalTrend =
    data.trends.errors && data.trends.rps
      ? totalErrorTrend(data.trends.errors, data.trends.rps)
      : null
  // 영역이 몇 개 안 돼서 왼쪽 목차 없이 한 줄로 쌓는다
  return (
    <div className={`${s.report} ${s.solo} ${s.mon}`}>
      <div className={`${s.page} ${s.wide} gap-8`}>
        {tabs}
        <ReportHeader title="상세 지표" sub={`${timeText(data.fetchedAt)} 기준 · 1분마다 갱신`} />

        <SummaryTiles data={data} />

        <div id="monitoring-brief" className="scroll-mt-4">
          <BriefSection cards={data.brief} />
        </div>

        <ReportSection
          title="서비스별 지표"
          description={
            data.partial
              ? '최근 5분 · 일부 지표 받지 못함(-)'
              : '최근 5분 · 문제 있는 서비스가 위로'
          }
        >
          <div id="monitoring-services" className={`${s.tbl} scroll-mt-4`}>
            <table aria-label="서비스별 지표">
              <thead>
                <tr>
                  <th>서비스</th>
                  <th>상태</th>
                  <th className={s.num}>초당 요청</th>
                  <th className={s.num}>서버 오류 비율</th>
                  <th className={s.num}>응답 시간(95%)</th>
                  <th className={s.num}>힙 메모리</th>
                </tr>
              </thead>
              <tbody>
                {sortByIssues(data.services).map((r: ServiceRow) => (
                  <tr key={r.job}>
                    <td>{r.name}</td>
                    <td className={bad(!r.up)}>{upText(r.up)}</td>
                    <td className={s.num}>{rpsText(r.rps)}</td>
                    <td className={`${s.num} ${bad(isHighError(r.errorRatio)) ?? ''}`}>
                      {percentText(r.errorRatio)}
                    </td>
                    <td className={`${s.num} ${bad(isSlow(r.p95Seconds)) ?? ''}`}>
                      {msText(r.p95Seconds)}
                    </td>
                    <td className={s.num}>{mbText(r.heapBytes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ReportSection>

        <ReportSection title="추이" description="최근 1시간 · 1분 간격">
          <div id="monitoring-trends" className="flex scroll-mt-4 flex-col gap-4">
            <div className={`${s.fact} p-4`}>
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {trends.map((t) => (
                  <div key={t.job} className={`${s.fact} p-4`}>
                    <TrendChart title={t.name} points={t.points} format={trendItem.format} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-base text-muted">{trendItem.label} 추이를 받지 못했어요</p>
            )}
          </div>
        </ReportSection>

        <ReportSection title="상태판" description="응답 없는 대상이 위로">
          <div id="monitoring-targets" className={`${s.tbl} scroll-mt-4`}>
            <table aria-label="상태판">
              <thead>
                <tr>
                  <th>대상</th>
                  <th>주소</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {data.targets.map((t) => (
                  <tr key={`${t.job}|${t.instance}`}>
                    <td>{t.name}</td>
                    <td className="text-muted">{t.instance}</td>
                    <td className={bad(!t.up)}>{upText(t.up)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ReportSection>
      </div>
    </div>
  )
}

/** 숫자 한 칸. 기준을 넘으면 값만 빨간 글자와 「주의」 */
function Tile({
  label,
  danger,
  children,
}: {
  label: string
  danger: boolean
  children: ReactNode
}) {
  return (
    <section aria-label={label} className={`${s.card} justify-between gap-2`}>
      <span className={`${s.tLabel} truncate`}>{label}</span>
      <span className={`${s.tNum} ${danger ? 'text-danger' : ''}`}>
        {children}
        {danger && <span className={`${s.tLabel} ml-2 text-danger`}>주의</span>}
      </span>
    </section>
  )
}

/** 판정 큰 칸과 숫자 4칸. 요약 탭과 상세 지표 탭이 함께 쓴다. summary는 판정 아래 한 줄 요약(요약 탭의 AI 문장) */
export function SummaryTiles({
  data,
  summary,
}: {
  data: Extract<MonitoringData, { status: 'ok' }>
  summary?: ReactNode
}) {
  const verdict = verdictOf(data.services, data.targets)
  const problems = verdict.problemServices
  const alerts = data.brief.map((c) => c.alert).filter((a): a is string => a !== null)
  // 요청 수를 하나도 못 받았으면 0이 아니라 「-」로 보인다
  const rpsKnown = data.services.filter((r) => r.rps !== null)
  const totalRps = rpsKnown.length ? rpsKnown.reduce((sum, r) => sum + (r.rps ?? 0), 0) : null
  return (
    <div
      id="monitoring-summary"
      className="grid scroll-mt-4 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <section aria-label="판정" className={`${s.card} gap-2 sm:col-span-2 lg:row-span-2`}>
        <span className={s.tLabel}>판정</span>
        <p className={`${s.tVerdict} ${problems.length ? 'text-danger' : ''}`}>
          {problems.length
            ? `주의 · 문제 ${problems.length}곳`
            : data.partial
              ? '일부 지표 모름'
              : '모두 정상'}
        </p>
        {problems.length > 0 && (
          <p className={`${s.tBody} m-0 text-danger`}>{problems.join(', ')}</p>
        )}
        {summary}
        {alerts.length > 0 && (
          <ul
            className={`${s.tSmall} m-0 flex list-none flex-col gap-1 p-0`}
            aria-label="최근 1시간 주의"
          >
            {alerts.map((a, i) => (
              <li key={i}>
                <strong className="text-danger">주의</strong> {a}
              </li>
            ))}
          </ul>
        )}
      </section>
      <Tile label="전체 서버 오류 비율" danger={isHighError(verdict.totalErrorRatio)}>
        {percentText(verdict.totalErrorRatio)}
      </Tile>
      <Tile
        label={verdict.slowest ? `가장 느린 곳 · ${verdict.slowest.name}` : '가장 느린 곳'}
        danger={isSlow(verdict.slowest?.p95Seconds ?? null)}
      >
        {msText(verdict.slowest?.p95Seconds ?? null)}
      </Tile>
      <Tile label="응답 없는 대상" danger={verdict.downCount > 0}>
        {verdict.downCount}곳
      </Tile>
      <Tile label="전체 초당 요청" danger={false}>
        {rpsText(totalRps)}
      </Tile>
    </div>
  )
}
