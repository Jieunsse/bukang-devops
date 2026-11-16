'use client'

import { EmptyState } from '@heroui/react'
import Link from 'next/link'
import { useState, type ReactNode } from 'react'

import {
  formatStatsDay,
  formatStatsDayWithWeekday,
  FORM_ERROR_TOP,
  STATS_PERIOD_ITEMS,
  toFunnelView,
  trendDeltaText,
  type DateSpan,
  type FunnelStepStat,
  type TrendStats,
} from '@/entities/usage-stats'

import { report as s, ReportHeader, ReportLayout, type ReportTocGroup } from '@/shared/ui'

import type { AnalyticsData } from '../model/load'

// 크루런 GA4 이용 통계. 크루런 어드민 「이용 통계」와 같은 숫자를 사람 수로만 보여 준다.

const number = (n: number) => n.toLocaleString('ko-KR')

/** 대시보드라 한 화면에 모두 두고, 목차는 그 영역으로 스크롤만 한다 */
const AREAS = [
  { id: 'realtime', label: '지금 접속 중' },
  { id: 'visitors', label: '방문자' },
  { id: 'purchases', label: '구매' },
  { id: 'buyer', label: '구매 단계' },
  { id: 'seller', label: '판매자 단계' },
  { id: 'form-errors', label: '대회 등록 입력 오류' },
] as const
type Area = (typeof AREAS)[number]['id']
const TOC: ReportTocGroup<Area>[] = [{ group: '영역', items: [...AREAS] }]

export function AnalyticsView({ data }: { data: AnalyticsData }) {
  if (data.status === 'notConfigured') {
    return (
      <div className="flex flex-col gap-6">
        <h2 className="text-lg font-semibold">이용 통계</h2>
        <EmptyState className="py-24">
          <p className="font-medium text-foreground">GA4 연결 정보가 없어요</p>
          <p className="text-sm text-muted">
            Vercel 환경변수에 GA4_PROPERTY_ID와 GA4_SERVICE_ACCOUNT_KEY를 넣으면 숫자가 보여요.
          </p>
        </EmptyState>
      </div>
    )
  }

  return <Dashboard data={data} />
}

function Dashboard({ data }: { data: Extract<AnalyticsData, { status: 'ok' }> }) {
  const [area, setArea] = useState<Area>('realtime')
  const go = (id: Area) => {
    setArea(id)
    document
      .getElementById(`analytics-${id}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <ReportLayout label="이용 통계 목차" toc={TOC} current={area} onSelect={go}>
      <ReportHeader
        title="이용 통계"
        sub={`크루런 GA4 기준 어제까지의 기록이에요. 「지금 접속 중」만 몇 초 안에 반영돼요.`}
        actions={
          <div className="flex flex-col items-end gap-2">
            <nav aria-label="기간" className={s.seg}>
              {STATS_PERIOD_ITEMS.map((item) => (
                <Link
                  key={item.value}
                  href={`/analytics?period=${item.value}`}
                  aria-current={data.kind === item.value ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <p className={`text-xs ${s.muted}`}>
              {spanText(data.period.current)} · 비교 기간 {spanText(data.period.previous)}
            </p>
          </div>
        }
      />

      <Section
        id="realtime"
        title="지금 접속 중"
        description="최근 30분 동안 크루런에 접속한 사람 수예요."
      >
        {data.realtime && (
          <div className="flex flex-col gap-4 sm:flex-row">
            <BigNumber label="최근 30분 접속자" value={data.realtime.activeUsers} />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <h4 className="text-sm font-medium">많이 본 화면</h4>
              {data.realtime.topScreens.length === 0 ? (
                <p className={`text-sm ${s.muted}`}>최근 30분 동안 본 화면이 없어요</p>
              ) : (
                <ol className="flex flex-col gap-1 text-sm">
                  {data.realtime.topScreens.map((screen) => (
                    <li key={screen.name} className="flex justify-between gap-3">
                      <span className="truncate">{screen.name}</span>
                      <span className="tabular-nums">{number(screen.activeUsers)}명</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        )}
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section id="visitors" title="방문자" description="그날 구매자 화면에 온 사람 수예요.">
          {data.visitors && <Trend stats={data.visitors} />}
        </Section>
        <Section id="purchases" title="구매" description="그날 결제를 마친 사람 수예요.">
          {data.purchases && <Trend stats={data.purchases} />}
        </Section>
      </div>

      <Section id="buyer" title="구매 단계" description="각 단계까지 온 사람 수예요.">
        {data.buyer && <Funnel steps={data.buyer} />}
      </Section>

      <Section
        id="seller"
        title="판매자 단계"
        description="판매자 신청부터 대회 등록까지 온 사람 수예요."
      >
        {data.seller && <Funnel steps={data.seller} />}
      </Section>

      <Section
        id="form-errors"
        title="대회 등록 입력 오류"
        description={`입력 오류가 많이 난 항목 묶음 상위 ${FORM_ERROR_TOP}개예요.`}
      >
        {data.formErrors &&
          (data.formErrors.length === 0 ? (
            <p className={`text-sm ${s.muted}`}>이 기간에는 입력 오류가 없어요</p>
          ) : (
            <ol className="flex flex-col gap-1 text-sm">
              {data.formErrors.map((group, i) => (
                <li key={group.name} className="flex justify-between gap-3">
                  <span>
                    {i + 1}. {group.name}
                  </span>
                  <span className="tabular-nums">{number(group.users)}명</span>
                </li>
              ))}
            </ol>
          ))}
      </Section>
    </ReportLayout>
  )
}

/** 영역 틀. 내용이 없으면(GA4 호출 실패) 그 영역만 「불러오지 못했어요」를 보인다 */
function Section({
  id,
  title,
  description,
  children,
}: {
  id: Area
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section id={`analytics-${id}`} aria-label={title} className="scroll-mt-4">
      <h3 className={s.h2}>{title}</h3>
      <p className={`${s.sub} -mt-2 mb-3`}>{description}</p>
      <div className={s.lead}>
        {children || (
          <p role="alert" className={`text-sm ${s.muted}`}>
            GA4에서 숫자를 불러오지 못했어요. 잠시 뒤 새로고침해 주세요.
          </p>
        )}
      </div>
    </section>
  )
}

function BigNumber({ label, value, aside }: { label: string; value: number; aside?: ReactNode }) {
  return (
    <div className="flex shrink-0 flex-col gap-1 sm:w-48">
      <span className={`text-sm ${s.muted}`}>{label}</span>
      <span className="flex items-baseline gap-2">
        <span className={s.big}>{number(value)}명</span>
        {aside}
      </span>
    </div>
  )
}

/** 일별 막대. 7일이면 날마다, 30일이면 7일마다 날짜를 적는다 */
function Trend({ stats }: { stats: TrendStats }) {
  const max = Math.max(1, ...stats.points.map((p) => p.value))
  const every = stats.points.length > 14 ? 7 : 1
  return (
    <div className="flex flex-col gap-4">
      <BigNumber
        label="기간 합계"
        value={stats.total}
        aside={
          <span className={`text-sm ${s.muted}`}>
            지난 기간보다 {trendDeltaText(stats.total, stats.previousTotal)}
          </span>
        }
      />
      <ul aria-label="날짜별 사람 수" className="flex h-32 items-end gap-1">
        {stats.points.map((p, i) => (
          <li
            key={p.date}
            title={`${formatStatsDayWithWeekday(p.date)} ${number(p.value)}명`}
            className="flex h-full min-w-0 flex-1 flex-col justify-end gap-1"
          >
            <span className="sr-only">
              {formatStatsDayWithWeekday(p.date)} {number(p.value)}명
            </span>
            <div
              aria-hidden
              className={`rounded-t ${s.bar}`}
              style={{ height: `${(p.value / max) * 100}%`, minHeight: p.value > 0 ? 2 : 0 }}
            />
            <span aria-hidden className={`h-4 text-center text-[10px] ${s.muted}`}>
              {i % every === 0 ? formatStatsDay(p.date) : ''}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** 단계별 사람 수. 막대는 첫 단계를 100%로 한 비례이고, 앞 단계 대비 비율이 가장 낮은 단계를 굵게 보인다 */
function Funnel({ steps }: { steps: FunnelStepStat[] }) {
  const view = toFunnelView(steps)
  if (view.every((step) => step.users === 0)) {
    return <p className={`text-sm ${s.muted}`}>이 기간에는 기록이 없어요. 기간을 넓혀 보세요.</p>
  }
  return (
    <table className="w-full text-sm">
      <thead className={`text-xs ${s.muted}`}>
        <tr>
          <th scope="col" className="w-32 py-1 text-left font-normal">
            단계
          </th>
          <td aria-hidden />
          <th scope="col" className="w-20 py-1 text-right font-normal">
            사람 수
          </th>
          <th scope="col" className="w-32 py-1 pl-3 text-left font-normal">
            앞 단계 대비
          </th>
          <th scope="col" className="w-28 py-1 text-right font-normal">
            지난 기간
          </th>
        </tr>
      </thead>
      <tbody>
        {view.map((step, i) => (
          <tr key={step.event} className={step.biggestDrop ? 'font-semibold' : undefined}>
            <th scope="row" className="py-1 text-left font-[inherit]">
              {step.label}
            </th>
            <td aria-hidden className="py-1 pr-3">
              <div
                className={`h-4 rounded-r ${s.bar} ${step.biggestDrop ? '' : 'opacity-40'}`}
                style={{ width: `${step.barRatio * 100}%` }}
              />
            </td>
            <td className="py-1 text-right tabular-nums">{number(step.users)}명</td>
            <td className="py-1 pl-3">
              {i === 0
                ? '시작 단계'
                : step.rate === undefined
                  ? '계산할 수 없어요'
                  : `${Math.round(step.rate * 100)}%${step.biggestDrop ? ' (가장 많이 빠짐)' : ''}`}
            </td>
            <td className={`py-1 text-right tabular-nums ${s.muted}`}>
              {number(step.previousUsers)}명
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function spanText({ start, end }: DateSpan) {
  return `${formatStatsDayWithWeekday(start)} ~ ${formatStatsDayWithWeekday(end)}`
}
