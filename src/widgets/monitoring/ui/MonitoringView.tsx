'use client'

import { EmptyState } from '@heroui/react'
import { useState, type ReactNode } from 'react'

import { Fact, report as s, ReportHeader, ReportSection } from '@/shared/ui'

import type { MonitoringData, TrendKind } from '../model/load'
import type { ServiceRow } from '../model/rows'
import { isHighError, isSlow, sortByIssues, totalErrorTrend, verdictOf } from '../model/verdict'
import { BriefSection } from './BriefSection'
import { TrendChart } from './TrendChart'

// 운영 서버 모니터링. 「지금 문제 있는 곳이 있나」를 맨 위에 판정으로 보여 주고,
// 서비스 표 → 추이 → 상태판 순서로 내려간다. 기준(THRESHOLDS)을 넘은 값만 빨간 글자로 쓴다(CLAUDE.md 예외).

const UNKNOWN = '-'
const timeText = (iso: string) =>
  new Date(iso).toLocaleTimeString('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
  })
const rpsText = (n: number | null) => (n === null ? UNKNOWN : n.toFixed(n < 10 ? 2 : 1))
const percentText = (n: number | null) => (n === null ? UNKNOWN : `${(n * 100).toFixed(1)}%`)
const msText = (sec: number | null) => (sec === null ? UNKNOWN : `${Math.round(sec * 1000)}ms`)
const mbText = (b: number | null) => (b === null ? UNKNOWN : `${Math.round(b / 1024 / 1024)}MB`)
const upText = (up: boolean) => (up ? '정상' : '응답 없음')
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
  explain,
}: {
  data: MonitoringData
  /** 위쪽 탭(그라파나 대시보드로 옮겨 가기). 쓰는 쪽이 넣는다 */
  tabs?: ReactNode
  /** 요약 아래 AI 해석. 쓰는 쪽이 Suspense로 감싸 넣는다 */
  explain?: ReactNode
}) {
  if (data.status !== 'ok') {
    return (
      <div className="flex flex-col gap-6">
        <h2 className="text-lg font-semibold">모니터링</h2>
        <EmptyState className="py-24">
          {data.status === 'notConfigured' ? (
            <>
              <p className="font-medium text-foreground">그라파나 연결 정보가 없어요</p>
              <p className="text-sm text-muted">
                Vercel 환경변수에 GRAFANA_URL과 GRAFANA_TOKEN을 넣으면 지표가 보여요.
              </p>
            </>
          ) : (
            <>
              <p className="font-medium text-foreground">그라파나에서 지표를 받지 못했어요</p>
              <p className="text-sm text-muted">잠시 뒤 새로고침해 주세요.</p>
            </>
          )}
        </EmptyState>
      </div>
    )
  }

  return <Dashboard data={data} tabs={tabs} explain={explain} />
}

function Dashboard({
  data,
  tabs,
  explain,
}: {
  data: Extract<MonitoringData, { status: 'ok' }>
  tabs?: ReactNode
  explain?: ReactNode
}) {
  const [kind, setKind] = useState<TrendKind>('errors')
  const trendItem = TREND_ITEMS.find((i) => i.kind === kind) ?? TREND_ITEMS[0]!
  const trends = data.trends[kind]
  const totalTrend =
    data.trends.errors && data.trends.rps
      ? totalErrorTrend(data.trends.errors, data.trends.rps)
      : null
  const verdict = verdictOf(data.services, data.targets)
  const problems = verdict.problemServices

  // 영역이 몇 개 안 돼서 왼쪽 목차 없이 한 줄로 쌓는다
  return (
    <div className={`${s.report} ${s.solo}`}>
      <div className={s.page}>
        {tabs}
        <ReportHeader title="모니터링" sub={`${timeText(data.fetchedAt)} 기준 · 1분마다 갱신`} />

        <dl id="monitoring-summary" className={`${s.facts} scroll-mt-4`}>
          <Fact
            label="판정"
            value={
              problems.length ? (
                <span className="text-danger">
                  주의 · 문제 {problems.length}곳
                  <small className="block text-sm font-medium">{problems.join(', ')}</small>
                </span>
              ) : data.partial ? (
                '일부 지표 모름'
              ) : (
                '모두 정상'
              )
            }
          />
          <Fact
            label="전체 서버 오류 비율"
            value={
              <span className={bad(isHighError(verdict.totalErrorRatio))}>
                {percentText(verdict.totalErrorRatio)}
              </span>
            }
          />
          <Fact
            label={verdict.slowest ? `가장 느린 곳 · ${verdict.slowest.name}` : '가장 느린 곳'}
            value={
              <span className={bad(isSlow(verdict.slowest?.p95Seconds ?? null))}>
                {msText(verdict.slowest?.p95Seconds ?? null)}
              </span>
            }
          />
          <Fact
            label="응답 없는 대상"
            value={<span className={bad(verdict.downCount > 0)}>{verdict.downCount}곳</span>}
          />
        </dl>

        {explain}

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
                <p className="text-sm text-muted">전체 서버 오류 비율 추이를 받지 못했어요</p>
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
              <p className="text-sm text-muted">{trendItem.label} 추이를 받지 못했어요</p>
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
