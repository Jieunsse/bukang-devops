'use client'

import { ArrowsRotateRight } from '@gravity-ui/icons'
import { Button, toast } from '@heroui/react'
import { useRouter } from 'next/navigation'
import { useTransition, type ReactNode } from 'react'

import { report as s } from '@/shared/ui'

import { refreshMonitoringAction } from '../api/actions'
import type { Explanation, ExplanationResult } from '../model/explain-server'

// AI 리포트. 요약과 눈여겨볼 것은 위에, 나머지 네 칸은 넓은 화면에서 2열로 처음부터 모두 보여 준다.
// 지표는 1분마다 바뀌고 리포트는 새로고침 때만 바뀌므로, 만든 시각을 함께 보여 준다.

const hhmm = (iso: string) =>
  new Date(iso).toLocaleTimeString('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
  })

export function ExplainView({ result }: { result: ExplanationResult }) {
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

  return (
    <section aria-label="AI 리포트" className={`${s.lead} gap-4`}>
      <div className="flex items-center gap-2">
        <strong className="text-foreground">AI 리포트</strong>
        {result.status === 'ok' && (
          <span className="text-sm text-muted">{hhmm(result.explanation.createdAt)} 기준</span>
        )}
        {result.status !== 'notConfigured' && (
          <Button
            size="sm"
            variant="tertiary"
            className="ml-auto"
            isPending={pending}
            onPress={refresh}
            aria-label="지표와 AI 리포트 새로 받기"
          >
            <ArrowsRotateRight aria-hidden />
            새로고침
          </Button>
        )}
      </div>
      {result.status === 'notConfigured' ? (
        <p className="text-sm text-muted">AI 연결 정보가 없어요</p>
      ) : result.status === 'failed' ? (
        <p className="text-sm text-muted">AI 리포트를 받지 못했어요</p>
      ) : (
        <Report report={result.explanation} />
      )}
    </section>
  )
}

function Report({ report }: { report: Explanation }) {
  return (
    <div className="flex flex-col gap-4 text-sm">
      <p className="m-0 text-base">{report.summary}</p>
      {report.watch.length > 0 && (
        <Block title="눈여겨볼 것">
          <ol className="m-0 flex flex-col gap-2 pl-5">
            {report.watch.map((w, i) => (
              <li key={i}>
                <span className="font-medium">
                  {w.what} · {w.when} · {w.howMuch}
                </span>
                <span className="block text-muted">{w.impact}</span>
              </li>
            ))}
          </ol>
        </Block>
      )}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Block title="원인 추정">
          {report.causes.length ? (
            <ul className="m-0 flex flex-col gap-2 pl-5">
              {report.causes.map((c, i) => (
                <li key={i}>
                  {c.guess}
                  <span className="block text-muted">근거: {c.evidence}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 text-muted">추정할 원인이 없어요</p>
          )}
        </Block>
        <Block title="서비스별 상태">
          <Lines items={report.services} />
        </Block>
        <Block title="자원 여유">
          <Lines items={report.resources} />
        </Block>
        <Block title="다음에 할 일">
          {report.nextSteps.length ? (
            <ol className="m-0 flex flex-col gap-1 pl-5">
              {report.nextSteps.map((n, i) => (
                <li key={i}>
                  <span className="font-medium">{n.tab} 탭</span> · {n.action}
                </li>
              ))}
            </ol>
          ) : (
            <p className="m-0 text-muted">지금 할 일이 없어요</p>
          )}
        </Block>
      </div>
    </div>
  )
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-1.5">
      <h4 className="m-0 text-xs font-semibold text-muted">{title}</h4>
      {children}
    </section>
  )
}

function Lines({ items }: { items: string[] }) {
  return (
    <ul className="m-0 flex flex-col gap-1 pl-5">
      {items.map((t, i) => (
        <li key={i}>{t}</li>
      ))}
    </ul>
  )
}
