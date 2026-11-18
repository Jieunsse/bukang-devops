'use client'

import { EmptyState } from '@heroui/react'
import { useState } from 'react'

import {
  Fact,
  report as s,
  ReportHeader,
  ReportLayout,
  ReportSection,
  type ReportTocGroup,
} from '@/shared/ui'

import type { MonitoringData, TrendKind } from '../model/load'
import { isService, sumTrends, type ServiceRow, type Target } from '../model/rows'
import { TrendChart } from './TrendChart'

// 운영 서버 모니터링. 서비스·인프라가 살아 있는지와 서비스별 최근 5분 지표를 보여 준다.
// 상태 색은 기한 표시에만 쓰는 규칙이라, 멈춘 대상은 글자와 맨 위 정렬로 알린다.

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

/** 한 화면에 모두 두고, 목차는 그 영역으로 스크롤만 한다 */
const AREAS = [
  { id: 'summary', label: '요약' },
  { id: 'trends', label: '추이' },
  { id: 'targets', label: '상태판' },
  { id: 'services', label: '서비스별 지표' },
] as const
type Area = (typeof AREAS)[number]['id']
const TOC: ReportTocGroup<Area>[] = [{ group: '영역', items: [...AREAS] }]

/** 추이에서 고를 수 있는 지표. 지표마다 단위가 달라 그래프를 따로 그린다 */
const TREND_ITEMS: { kind: TrendKind; label: string; format: (v: number) => string }[] = [
  { kind: 'rps', label: '초당 요청', format: (v) => rpsText(v) },
  { kind: 'p95', label: '응답 시간(95%)', format: (v) => msText(v) },
  { kind: 'heap', label: '힙 메모리', format: (v) => mbText(v) },
]

export function MonitoringView({ data }: { data: MonitoringData }) {
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

  return <Dashboard data={data} />
}

function Dashboard({ data }: { data: Extract<MonitoringData, { status: 'ok' }> }) {
  const [area, setArea] = useState<Area>('summary')
  const [kind, setKind] = useState<TrendKind>('rps')
  const trendItem = TREND_ITEMS.find((i) => i.kind === kind) ?? TREND_ITEMS[0]!
  const trends = data.trends[kind]
  const totalTrend = data.trends.rps ? sumTrends(data.trends.rps) : null
  const go = (id: Area) => {
    setArea(id)
    document
      .getElementById(`monitoring-${id}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const services = data.targets.filter((t) => isService(t.job))
  const infra = data.targets.filter((t) => !isService(t.job))
  const count = (list: Target[]) => `${list.filter((t) => t.up).length} / ${list.length}`
  const totalRps = data.services.reduce((sum, r) => sum + (r.rps ?? 0), 0)

  return (
    <ReportLayout label="모니터링 목차" toc={TOC} current={area} onSelect={go}>
      <ReportHeader
        title="모니터링"
        sub={`운영 서버 프로메테우스 기준이에요. ${timeText(data.fetchedAt)}에 받았고, 1분마다 새로 받아요.`}
      />

      <dl id="monitoring-summary" className={`${s.facts} scroll-mt-4`}>
        <Fact label="서비스 정상" value={count(services)} />
        <Fact label="인프라 정상" value={count(infra)} />
        <Fact label="전체 초당 요청" value={rpsText(totalRps)} />
      </dl>

      <ReportSection
        title="추이"
        description="최근 1시간을 1분 간격으로 보여 줘요. 서비스마다 그래프 높이 기준이 달라요."
      >
        <div id="monitoring-trends" className="flex scroll-mt-4 flex-col gap-4">
          <div className={`${s.fact} p-4`}>
            {totalTrend ? (
              <TrendChart
                title="전체 초당 요청"
                points={totalTrend}
                format={(v) => rpsText(v)}
                hero
                width={960}
                height={240}
              />
            ) : (
              <p className="text-sm text-muted">전체 초당 요청 추이를 받지 못했어요</p>
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

      <ReportSection title="상태판" description="응답 없는 대상이 맨 위에 와요.">
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
                  <td>{t.up ? upText(true) : <b>{upText(false)}</b>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ReportSection>

      <ReportSection
        title="서비스별 지표"
        description={
          data.partial
            ? '최근 5분 기준이에요. 일부 지표를 받지 못해 「-」로 보여요.'
            : '최근 5분 기준이에요.'
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
              {data.services.map((r: ServiceRow) => (
                <tr key={r.job}>
                  <td>{r.name}</td>
                  <td>{r.up ? upText(true) : <b>{upText(false)}</b>}</td>
                  <td className={s.num}>{rpsText(r.rps)}</td>
                  <td className={s.num}>{percentText(r.errorRatio)}</td>
                  <td className={s.num}>{msText(r.p95Seconds)}</td>
                  <td className={s.num}>{mbText(r.heapBytes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ReportSection>
    </ReportLayout>
  )
}
