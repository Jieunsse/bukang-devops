'use client'

import { ArrowsRotateRight } from '@gravity-ui/icons'
import { Button, toast } from '@heroui/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Suspense, use, useTransition, type ReactNode } from 'react'

import { useNow } from '@/shared/lib/use-now'
import { report as s } from '@/shared/ui'
import type { DashboardLink } from '@/widgets/grafana-dashboard/model/dashboards'

import { refreshMonitoringAction } from '../api/actions'
import { REPORT_LIMITS } from '../model/explain'
import type { ExplanationResult } from '../model/explain-server'
import { hhmm } from '../model/format'
import type { MonitoringData } from '../model/load'
import { resolveWatch, resourceBars, serviceLine, tabHref } from '../model/report'
import { verdictOf } from '../model/verdict'
import { Sparkline } from './Sparkline'

// AI 리포트. 자원 막대·서비스 줄은 코드가 지표로 바로 그리고, AI 칸(요약, 눈여겨볼 것, 원인 점검, 할 일)만
// 각각 Suspense로 늦게 채운다. 그래서 AI가 늦거나 실패해도 코드가 그리는 부분은 바로 보인다.
// 기준을 넘은 값만 빨간 글자와 「주의」로 쓴다(CLAUDE.md 모니터링 예외).

type Ok = Extract<MonitoringData, { status: 'ok' }>
type Result = Promise<ExplanationResult>

const Wait = ({ text = '리포트를 만드는 중이에요' }: { text?: string }) => (
  <p className="m-0 text-sm text-muted">{text}</p>
)

export function ExplainView({
  explanation,
  data,
  links,
}: {
  /** 서버에서 시작한 리포트 읽기. 기다리지 않고 넘겨서 AI 칸만 늦게 채운다 */
  explanation: Result
  data: Ok
  links: DashboardLink[]
}) {
  const problems = verdictOf(data.services, data.targets).problemServices
  return (
    <section aria-label="AI 리포트" className="flex flex-col gap-4">
      <header className={`${s.fact} flex-row flex-wrap items-center gap-x-4 gap-y-2 p-5`}>
        {/* 판정은 바로 위 판정 칸이 보여 주므로 여기서는 리포트 이름만 둔다 */}
        <strong className="text-base">AI 리포트</strong>
        <Suspense
          fallback={
            <span className="flex-1">
              <Wait />
            </span>
          }
        >
          <Summary explanation={explanation} />
        </Suspense>
      </header>

      <Suspense fallback={null}>
        <Watch explanation={explanation} data={data} />
      </Suspense>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Block title="원인 점검">
          <Suspense fallback={<Wait />}>
            <Causes explanation={explanation} />
          </Suspense>
        </Block>
        <Block title="자원 여유">
          <ResourceBars data={data} />
        </Block>
        <Block title="서비스">
          <p className={`m-0 text-sm ${problems.length ? 'font-semibold text-danger' : ''}`}>
            {serviceLine(data)}
          </p>
        </Block>
        <Block title="다음에 할 일">
          <Suspense fallback={<Wait />}>
            <NextSteps explanation={explanation} links={links} />
          </Suspense>
        </Block>
      </div>
    </section>
  )
}

/** 요약 한 문장, 리포트를 만든 시각(몇 분 전), 새로고침 */
function Summary({ explanation }: { explanation: Result }) {
  const result = use(explanation)
  const router = useRouter()
  const now = useNow()
  const [pending, start] = useTransition()
  const refresh = () =>
    start(async () => {
      const r = await refreshMonitoringAction()
      if (r.status === 'tooSoon') toast(`방금 새로 받았어요(${r.secondsAgo}초 전)`)
      else if (r.status === 'failed')
        toast.danger('AI 리포트를 받지 못했어요. 직전 리포트를 그대로 보여 줘요.')
      else if (r.status === 'refreshed') toast.success('지표와 AI 리포트를 새로 받았어요')
      router.refresh()
    })
  const report = result.status === 'ok' ? result.explanation : null
  // 화면 숫자는 지금 값이고 문장은 리포트를 만든 때 기준이라, 몇 분 전 리포트인지 함께 보여 준다
  const minutesAgo = report
    ? Math.max(0, Math.floor((now - Date.parse(report.createdAt)) / 60_000))
    : 0
  return (
    <>
      <span className="min-w-0 flex-1 text-sm text-muted">
        {report?.summary ??
          (result.status === 'notConfigured'
            ? 'AI 연결 정보가 없어요'
            : 'AI 리포트를 받지 못했어요')}
      </span>
      {report && (
        <span className="text-xs text-muted">
          {hhmm(Date.parse(report.createdAt) / 1000)} 기준 ·{' '}
          {minutesAgo ? `${minutesAgo}분 전` : '방금'}
        </span>
      )}
      {result.status !== 'notConfigured' && (
        <Button
          size="sm"
          variant="tertiary"
          isPending={pending}
          onPress={refresh}
          aria-label="지표와 AI 리포트 새로 받기"
        >
          <ArrowsRotateRight aria-hidden />
          새로고침
        </Button>
      )}
    </>
  )
}

function Watch({ explanation, data }: { explanation: Result; data: Ok }) {
  const result = use(explanation)
  if (result.status !== 'ok') return null
  const cards = result.explanation.watch
    .slice(0, REPORT_LIMITS.watch)
    .map((w) => resolveWatch(data, w))
    .filter((w) => w !== null)
  if (!cards.length) return null
  return (
    <section aria-label="눈여겨볼 것" className="flex flex-col gap-2">
      <h3 className="m-0 text-xs font-semibold text-muted">눈여겨볼 것</h3>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {cards.map((w, i) => (
          <article key={i} aria-label={w.title} className={`${s.fact} gap-1 p-4`}>
            <span className="text-xs text-muted">{w.title}</span>
            <span className={`text-2xl font-bold tabular-nums ${w.danger ? 'text-danger' : ''}`}>
              {w.value}
              {w.at && <span className="ml-1.5 text-xs font-normal text-muted">{w.at}</span>}
              {w.danger && <span className="ml-1.5 text-xs font-semibold">주의</span>}
            </span>
            {w.points && <Sparkline points={w.points} label={w.title} />}
            <span className="text-xs text-muted">{w.sub}</span>
            <span className="text-sm">{w.note}</span>
          </article>
        ))}
      </div>
    </section>
  )
}

function Causes({ explanation }: { explanation: Result }) {
  const result = use(explanation)
  const causes =
    result.status === 'ok' ? result.explanation.causes.slice(0, REPORT_LIMITS.causes) : []
  if (!causes.length) return <Wait text={result.status === 'ok' ? '점검할 원인이 없어요' : '-'} />
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
      {causes.map((c, i) => (
        <li key={i} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span
            className={`shrink-0 rounded-md px-1.5 py-0.5 text-xs ${c.verdict === '의심' ? 'font-semibold' : 'text-muted'}`}
            style={{ background: 'var(--bg)' }}
          >
            {c.verdict}
          </span>
          <span className="min-w-0 flex-1">{c.label}</span>
          <span className="min-w-0 text-right text-muted">{c.evidence}</span>
        </li>
      ))}
    </ul>
  )
}

function NextSteps({ explanation, links }: { explanation: Result; links: DashboardLink[] }) {
  const result = use(explanation)
  const steps =
    result.status === 'ok' ? result.explanation.nextSteps.slice(0, REPORT_LIMITS.nextSteps) : []
  if (!steps.length) return <Wait text={result.status === 'ok' ? '지금 할 일이 없어요' : '-'} />
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
      {steps.map((n, i) => {
        const href = tabHref(n.tab, links)
        return (
          <li key={i} className="flex flex-wrap items-center gap-x-2">
            {href ? (
              <Link href={href} className="shrink-0 font-medium text-accent">
                {n.tab} 탭
              </Link>
            ) : (
              <span className="shrink-0 font-medium">{n.tab} 탭</span>
            )}
            <span className="min-w-0">{n.action}</span>
          </li>
        )
      })}
    </ul>
  )
}

function ResourceBars({ data }: { data: Ok }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm" aria-label="기준까지 남은 양">
      {resourceBars(data).map((b) => {
        const over = b.ratio >= b.limit
        const limitText = `${Math.round(b.limit * 100)}%`
        return (
          <li key={b.label} className="flex items-center gap-2">
            <span className="w-28 shrink-0 truncate text-muted" title={b.label}>
              {b.label}
            </span>
            <span
              role="img"
              aria-label={`${b.label} ${b.text}, 기준 ${limitText}`}
              className="relative h-2 min-w-0 flex-1 rounded"
              style={{ background: 'var(--bg)' }}
            >
              <span
                className="absolute inset-y-0 left-0 rounded"
                style={{
                  width: `${Math.min(100, b.ratio * 100)}%`,
                  background: 'var(--accent)',
                  opacity: 0.6,
                }}
              />
              {/* 기준 위치. 색은 쓰지 않는다 */}
              <span
                className="absolute -inset-y-1 w-0.5"
                style={{ left: `${Math.min(99, b.limit * 100)}%`, background: 'var(--fg)' }}
              />
            </span>
            <span
              className={`shrink-0 text-right tabular-nums ${over ? 'font-semibold text-danger' : ''}`}
            >
              {b.text}
              {over && <span className="ml-1 text-xs">주의</span>}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className={`${s.fact} gap-2 p-4`}>
      <h3 className="m-0 text-xs font-semibold text-muted">{title}</h3>
      {children}
    </section>
  )
}
