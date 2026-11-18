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

// AI 리포트(요약 탭). 시선 순서: 머리(제목·기준 시각·새로고침) → 판정 띠 → 눈여겨볼 것 → 원인 점검 | 자원 여유
// → 서비스 | 다음에 할 일. 자원 막대·서비스 줄은 코드가 바로 그리고, AI 칸만 Suspense로 늦게 채운다.
// 글자는 여섯 단계(report.module.css의 t* 토큰)만 쓰고, 빨강은 기준을 넘은 값과 「의심」에만 쓴다.

type Ok = Extract<MonitoringData, { status: 'ok' }>
type Result = Promise<ExplanationResult>

const Wait = ({ text = '리포트를 만드는 중이에요' }: { text?: string }) => (
  <p className={`${s.tSmall} m-0`}>{text}</p>
)

/** 머리 오른쪽: 리포트 기준 시각(몇 분 전)과 새로고침 */
export function ReportControls({ explanation }: { explanation: Result }) {
  const result = use(explanation)
  const router = useRouter()
  const now = useNow()
  const [pending, start] = useTransition()
  if (result.status === 'notConfigured') return null
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
    <div className="flex items-center gap-3">
      {report && (
        <span className={s.tSmall}>
          {hhmm(Date.parse(report.createdAt) / 1000)} 기준 ·{' '}
          {minutesAgo ? `${minutesAgo}분 전` : '방금'}
        </span>
      )}
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
    </div>
  )
}

/** 판정 아래 한 줄 요약(AI) */
export function AiSummaryLine({ explanation }: { explanation: Result }) {
  const result = use(explanation)
  if (result.status === 'ok')
    return <p className={`${s.tBody} m-0`}>{result.explanation.summary}</p>
  return (
    <p className={`${s.tSmall} m-0`}>
      {result.status === 'notConfigured' ? 'AI 연결 정보가 없어요' : 'AI 리포트를 받지 못했어요'}
    </p>
  )
}

/** 판정 띠 아래 본문: 눈여겨볼 것 → 원인 점검 | 자원 여유 → 서비스 | 다음에 할 일 */
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
    <div aria-label="AI 리포트" role="region" className="flex flex-col gap-8">
      <Suspense fallback={null}>
        <Watch explanation={explanation} data={data} />
      </Suspense>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="원인 점검">
          <Suspense fallback={<Wait />}>
            <Causes explanation={explanation} />
          </Suspense>
        </Card>
        <Card title="자원 여유">
          <ResourceBars data={data} />
        </Card>
        <Card title="서비스">
          <p className={`${s.tBody} m-0 ${problems.length ? 'font-semibold text-danger' : ''}`}>
            {serviceLine(data)}
          </p>
        </Card>
        <Card title="다음에 할 일">
          <Suspense fallback={<Wait />}>
            <NextSteps explanation={explanation} links={links} />
          </Suspense>
        </Card>
      </div>
    </div>
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
    <section aria-label="눈여겨볼 것" className="flex flex-col gap-4">
      <h3 className={s.tSection}>눈여겨볼 것</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {cards.map((w, i) => (
          <article key={i} aria-label={w.title} className={`${s.card} gap-2`}>
            <span className={s.tLabel}>{w.title}</span>
            <span className="flex items-baseline gap-2">
              <span className={`${s.tNum} ${w.danger ? 'text-danger' : ''}`}>{w.value}</span>
              {w.at && <span className={s.tSmall}>{w.at}</span>}
              {w.danger && <span className={`${s.tLabel} text-danger`}>주의</span>}
            </span>
            {w.points && <Sparkline points={w.points} label={w.title} />}
            <span className={s.tSmall}>{w.sub}</span>
            <p className={`${s.tBody} m-0`}>{w.note}</p>
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
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {causes.map((c, i) => (
        // 결론 · 항목 · 근거 숫자. 「의심」만 빨강, 점 아이콘은 쓰지 않는다
        <li
          key={i}
          className={`${s.tBody} grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]`}
        >
          <strong className={c.verdict === '의심' ? 'text-danger' : ''}>{c.verdict}</strong>
          <span>{c.label}</span>
          <span
            className={`${s.tSmall} col-start-2 sm:col-start-auto sm:self-center sm:text-right`}
          >
            {c.evidence}
          </span>
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
    <ol className={`${s.tBody} m-0 flex list-decimal flex-col gap-2 pl-6`}>
      {steps.map((n, i) => {
        const href = tabHref(n.tab, links)
        return (
          <li key={i}>
            {href ? (
              <Link href={href} className="font-semibold text-accent underline underline-offset-4">
                {n.tab} 탭
              </Link>
            ) : (
              <span className="font-semibold">{n.tab} 탭</span>
            )}{' '}
            {n.action}
          </li>
        )
      })}
    </ol>
  )
}

function ResourceBars({ data }: { data: Ok }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0" aria-label="기준까지 남은 양">
      {resourceBars(data).map((b) => {
        const over = b.ratio >= b.limit
        const near = !over && b.ratio >= b.limit * 0.9
        const limitText = `${Math.round(b.limit * 100)}%`
        return (
          <li key={b.label} className="grid grid-cols-[8rem_minmax(0,1fr)_auto] items-center gap-3">
            <span className={`${s.tLabel} truncate`} title={b.label}>
              {b.label}
            </span>
            {/* 빈 막대 틀은 0%여도 보인다. 막대는 회색, 기준을 넘으면 빨강. 세로선이 기준 위치다 */}
            <span
              role="img"
              aria-label={`${b.label} ${b.text}, 기준 ${limitText}`}
              className="relative h-3 rounded border"
              style={{ borderColor: 'var(--line)', background: 'var(--bg)' }}
            >
              <span
                className={`absolute inset-y-0 left-0 rounded ${over ? 'bg-danger' : ''}`}
                style={{
                  width: `${Math.min(100, b.ratio * 100)}%`,
                  background: over ? undefined : 'var(--muted)',
                }}
              />
              <span
                className="absolute -inset-y-1 w-0.5"
                style={{ left: `${Math.min(99, b.limit * 100)}%`, background: 'var(--fg)' }}
              />
            </span>
            <span
              className={`${s.tBody} text-right tabular-nums ${over ? 'font-semibold text-danger' : ''}`}
            >
              {b.text}
              {over && <span className={`${s.tLabel} ml-1 text-danger`}>주의</span>}
              {near && <span className={`${s.tSmall} ml-1`}>기준 가까움</span>}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className={`${s.card} justify-start`}>
      <h3 className={s.tSection}>{title}</h3>
      {children}
    </section>
  )
}
