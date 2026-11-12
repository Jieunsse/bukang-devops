'use client'

import { Card, EmptyState } from '@heroui/react'
import { buttonVariants } from '@heroui/styles'
import Link from 'next/link'
import type { ReactNode } from 'react'

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

import type { AnalyticsData } from '../model/load'

// 크루런 GA4 이용 통계. 크루런 어드민 「이용 통계」와 같은 숫자를 사람 수로만 보여 준다.

const number = (n: number) => n.toLocaleString('ko-KR')

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">이용 통계</h2>
          <p className="text-sm text-muted">
            크루런 GA4 기준 어제까지의 기록이에요. 「지금 접속 중」만 몇 초 안에 반영돼요.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <nav aria-label="기간" className="flex gap-2">
            {STATS_PERIOD_ITEMS.map((item) => (
              <Link
                key={item.value}
                href={`/analytics?period=${item.value}`}
                aria-current={data.kind === item.value ? 'page' : undefined}
                className={buttonVariants({
                  size: 'sm',
                  variant: data.kind === item.value ? 'primary' : 'secondary',
                })}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <p className="text-xs text-muted">
            {spanText(data.period.current)} · 비교 기간 {spanText(data.period.previous)}
          </p>
        </div>
      </div>

      <Section title="지금 접속 중" description="최근 30분 동안 크루런에 접속한 사람 수예요.">
        {data.realtime && (
          <div className="flex flex-col gap-4 sm:flex-row">
            <BigNumber label="최근 30분 접속자" value={data.realtime.activeUsers} />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <h4 className="text-sm font-medium">많이 본 화면</h4>
              {data.realtime.topScreens.length === 0 ? (
                <p className="text-sm text-muted">최근 30분 동안 본 화면이 없어요</p>
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
        <Section title="방문자" description="그날 구매자 화면에 온 사람 수예요.">
          {data.visitors && <Trend stats={data.visitors} />}
        </Section>
        <Section title="구매" description="그날 결제를 마친 사람 수예요.">
          {data.purchases && <Trend stats={data.purchases} />}
        </Section>
      </div>

      <Section title="구매 단계" description="각 단계까지 온 사람 수예요.">
        {data.buyer && <Funnel steps={data.buyer} />}
      </Section>

      <Section title="판매자 단계" description="판매자 신청부터 대회 등록까지 온 사람 수예요.">
        {data.seller && <Funnel steps={data.seller} />}
      </Section>

      <Section
        title="대회 등록 입력 오류"
        description={`입력 오류가 많이 난 항목 묶음 상위 ${FORM_ERROR_TOP}개예요.`}
      >
        {data.formErrors &&
          (data.formErrors.length === 0 ? (
            <p className="text-sm text-muted">이 기간에는 입력 오류가 없어요</p>
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
    </div>
  )
}

/** 영역 틀. 내용이 없으면(GA4 호출 실패) 그 영역만 「불러오지 못했어요」를 보인다 */
function Section({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <Card>
      <Card.Header>
        <Card.Title>{title}</Card.Title>
        <Card.Description>{description}</Card.Description>
      </Card.Header>
      <Card.Content>
        {children || (
          <p role="alert" className="text-sm text-muted">
            GA4에서 숫자를 불러오지 못했어요. 잠시 뒤 새로고침해 주세요.
          </p>
        )}
      </Card.Content>
    </Card>
  )
}

function BigNumber({ label, value, aside }: { label: string; value: number; aside?: ReactNode }) {
  return (
    <div className="flex shrink-0 flex-col gap-1 sm:w-48">
      <span className="text-sm text-muted">{label}</span>
      <span className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold tabular-nums">{number(value)}명</span>
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
          <span className="text-sm text-muted">
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
              className="rounded-t bg-accent"
              style={{ height: `${(p.value / max) * 100}%`, minHeight: p.value > 0 ? 2 : 0 }}
            />
            <span aria-hidden className="h-4 text-center text-[10px] text-muted">
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
    return <p className="text-sm text-muted">이 기간에는 기록이 없어요. 기간을 넓혀 보세요.</p>
  }
  return (
    <table className="w-full text-sm">
      <thead className="text-xs text-muted">
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
                className={`h-4 rounded-r ${step.biggestDrop ? 'bg-accent' : 'bg-accent/40'}`}
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
            <td className="py-1 text-right text-muted tabular-nums">
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
