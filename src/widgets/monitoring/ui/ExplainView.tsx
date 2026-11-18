'use client'

import { ArrowsRotateRight } from '@gravity-ui/icons'
import { Button, toast } from '@heroui/react'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

import { report as s } from '@/shared/ui'

import { refreshMonitoringAction } from '../api/actions'
import type { ExplanationResult } from '../model/explain-server'

// AI 해석 세 줄. 지표는 1분마다 바뀌고 해석은 새로고침 때만 바뀌므로, 만든 시각을 함께 보여 준다.

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
        toast.danger('AI 해석을 받지 못했어요. 직전 해석을 그대로 보여 줘요.')
      else if (r.status === 'refreshed') toast.success('지표와 AI 해석을 새로 받았어요')
      router.refresh()
    })

  return (
    <section aria-label="AI 해석" className={s.lead}>
      <div className="flex items-center gap-2">
        <strong className="text-foreground">AI 해석</strong>
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
            aria-label="지표와 AI 해석 새로 받기"
          >
            <ArrowsRotateRight aria-hidden />
            새로고침
          </Button>
        )}
      </div>
      {result.status === 'notConfigured' ? (
        <p className="text-sm text-muted">AI 연결 정보가 없어요</p>
      ) : result.status === 'failed' ? (
        <p className="text-sm text-muted">AI 해석을 받지 못했어요</p>
      ) : (
        <dl className="m-0 grid gap-1 text-sm">
          <ExplainLine label="상태" text={result.explanation.status} />
          <ExplainLine label="의심 원인" text={result.explanation.cause} />
          <ExplainLine label="먼저 볼 곳" text={result.explanation.firstCheck} />
        </dl>
      )}
    </section>
  )
}

function ExplainLine({ label, text }: { label: string; text: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-20 shrink-0 text-muted">{label}</dt>
      <dd className="m-0">{text}</dd>
    </div>
  )
}
