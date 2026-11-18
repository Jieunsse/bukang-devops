'use client'

import { ArrowsRotateRight } from '@gravity-ui/icons'
import { Button, toast } from '@heroui/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTransition, type ReactNode } from 'react'

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

// AI 리포트. AI는 요약 한 문장, 볼 지표 고르기, 원인 점검, 할 일만 짧게 쓴다.
// 숫자·그래프·자원 막대·서비스 줄은 코드가 브리핑 데이터로 그려서, AI가 없어도 이 부분은 보인다.
// 기준을 넘은 값만 빨간 글자와 「주의」로 쓴다(CLAUDE.md 모니터링 예외).

type Ok = Extract<MonitoringData, { status: 'ok' }>

export function ExplainView({
  result,
  data,
  links,
}: {
  result: ExplanationResult
  data: Ok
  links: DashboardLink[]
}) {
  const router = useRouter()
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

  const verdict = verdictOf(data.services, data.targets)
  const problems = verdict.problemServices
  const report = result.status === 'ok' ? result.explanation : null
  const watch = (report?.watch ?? [])
    .slice(0, REPORT_LIMITS.watch)
    .map((w) => resolveWatch(data, w))
    .filter((w) => w !== null)

  return (
    <section aria-label="AI 리포트" className="flex flex-col gap-4">
      <header className={`${s.fact} flex-row flex-wrap items-center gap-x-4 gap-y-2 p-5`}>
        <span className={`text-2xl font-bold ${problems.length ? 'text-danger' : ''}`}>
          {problems.length
            ? `주의 · 문제 ${problems.length}곳`
            : data.partial
              ? '일부 지표 모름'
              : '모두 정상'}
        </span>
        <span className="min-w-0 flex-1 text-sm text-muted">
          {report?.summary ??
            (result.status === 'notConfigured'
              ? 'AI 연결 정보가 없어요'
              : result.status === 'failed'
                ? 'AI 리포트를 받지 못했어요'
                : '')}
        </span>
        {report && (
          <span className="text-xs text-muted">
            {hhmm(Date.parse(report.createdAt) / 1000)} 기준
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
      </header>

      {watch.length > 0 && (
        <Block title="눈여겨볼 것">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {watch.map((w, i) => (
              <article key={i} aria-label={w.title} className={`${s.fact} gap-1 p-4`}>
                <span className="text-xs text-muted">{w.title}</span>
                <span
                  className={`text-2xl font-bold tabular-nums ${w.danger ? 'text-danger' : ''}`}
                >
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
        </Block>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Block title="원인 점검" card>
          {report?.causes.length ? (
            <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
              {report.causes.slice(0, REPORT_LIMITS.causes).map((c, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span
                    className={`shrink-0 rounded-md px-1.5 py-0.5 text-xs ${c.verdict === '의심' ? 'font-semibold' : 'text-muted'}`}
                    style={{ background: 'var(--bg)' }}
                  >
                    {c.verdict}
                  </span>
                  <span className="min-w-0 flex-1">{c.label}</span>
                  <span className="shrink-0 text-muted">{c.evidence}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 text-sm text-muted">{report ? '점검할 원인이 없어요' : '-'}</p>
          )}
        </Block>
        <Block title="자원 여유" card>
          <ul
            className="m-0 flex list-none flex-col gap-2 p-0 text-sm"
            aria-label="기준까지 남은 양"
          >
            {resourceBars(data).map((b) => {
              const over = b.ratio >= b.limit
              return (
                <li key={b.label} className="flex items-center gap-2">
                  <span className="w-36 shrink-0 truncate text-muted">{b.label}</span>
                  <span className="relative h-2 flex-1 rounded" style={{ background: 'var(--bg)' }}>
                    <span
                      className="absolute inset-y-0 left-0 rounded"
                      style={{
                        width: `${Math.min(100, b.ratio * 100)}%`,
                        background: 'var(--accent)',
                        opacity: 0.6,
                      }}
                    />
                    {/* 기준 위치 표시. 색은 쓰지 않는다 */}
                    <span
                      className="absolute -inset-y-1 w-0.5"
                      style={{ left: `${Math.min(99, b.limit * 100)}%`, background: 'var(--fg)' }}
                      title={`기준 ${Math.round(b.limit * 100)}%`}
                    />
                  </span>
                  <span
                    className={`w-14 shrink-0 text-right tabular-nums ${over ? 'font-semibold text-danger' : ''}`}
                  >
                    {b.text}
                  </span>
                </li>
              )
            })}
          </ul>
        </Block>
        <Block title="서비스" card>
          <p className={`m-0 text-sm ${problems.length ? 'font-semibold text-danger' : ''}`}>
            {serviceLine(data)}
          </p>
        </Block>
        <Block title="다음에 할 일" card>
          {report?.nextSteps.length ? (
            <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
              {report.nextSteps.slice(0, REPORT_LIMITS.nextSteps).map((n, i) => {
                const href = tabHref(n.tab, links)
                return (
                  <li key={i} className="flex items-center gap-2">
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
          ) : (
            <p className="m-0 text-sm text-muted">{report ? '지금 할 일이 없어요' : '-'}</p>
          )}
        </Block>
      </div>
    </section>
  )
}

function Block({ title, children, card }: { title: string; children: ReactNode; card?: boolean }) {
  return (
    <section aria-label={title} className={card ? `${s.fact} gap-2 p-4` : 'flex flex-col gap-2'}>
      <h3 className="m-0 text-xs font-semibold text-muted">{title}</h3>
      {children}
    </section>
  )
}
