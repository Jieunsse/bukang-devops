'use client'

import { Button, Card } from '@heroui/react'
import { useState } from 'react'

import { openReportAction } from '@/shared/api/reports/actions'
import { PageToolbar } from '@/shared/ui'

import { REPORTS, type Report } from '../model/reports'
import { CopyButton } from './CopyButton'
import { PasswordModal } from './PasswordModal'

const FAIL_MESSAGE = {
  password: '비밀번호가 맞지 않아요.',
  missing: '서버에 리포트 열쇠가 없어요.',
  failed: '리포트를 열지 못했어요.',
} as const

// src는 리포트 HTML의 blob 주소다. srcDoc으로 띄우면 리포트 안 # 링크가 이 앱 주소를 기준으로 움직여
// iframe 안에 앱이 다시 열리므로, 리포트가 자기 주소를 갖게 한다.
type Opened = { report: Report; src: string; url: string }

export function LinksView() {
  // 맞은 팀 비밀번호는 이 페이지를 떠날 때까지만 기억해 다른 리포트도 바로 연다. 브라우저 저장소에는 남기지 않는다.
  const [password, setPassword] = useState<string | null>(null)
  const [asking, setAsking] = useState<Report | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [opened, setOpened] = useState<Opened | null>(null)

  const open = async (report: Report, pw: string) => {
    setPending(true)
    const result = await openReportAction(report.slug, pw).catch(
      () => ({ ok: false, reason: 'failed' }) as const,
    )
    setPending(false)
    if (result.ok) {
      setPassword(pw)
      setAsking(null)
      setError(null)
      setOpened({
        report,
        src: URL.createObjectURL(new Blob([result.html], { type: 'text/html' })),
        url: result.url,
      })
      return
    }
    if (result.reason === 'password') setPassword(null)
    setError(FAIL_MESSAGE[result.reason])
    setAsking(report)
  }

  const choose = (report: Report) => {
    if (password) void open(report, password)
    else setAsking(report)
  }

  if (opened) {
    const { report, src, url } = opened
    return (
      <div className="flex flex-col gap-4">
        <PageToolbar
          title={report.title}
          summary={`${report.syncedAt} 복사본`}
          actions={
            <>
              <Button
                size="sm"
                variant="tertiary"
                onPress={() => {
                  URL.revokeObjectURL(src)
                  setOpened(null)
                }}
              >
                링크 모음
              </Button>
              {/* 원본 주소에는 공유 키가 있어 비밀번호가 맞은 뒤에만 보여 준다. */}
              <CopyButton text={url} />
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-accent underline-offset-4 hover:underline"
              >
                원본 열기
              </a>
            </>
          }
        />
        <iframe
          title={report.title}
          src={`${src}${report.hash}`}
          className="h-[calc(100dvh-10rem)] w-full rounded-xl border border-border bg-white"
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <PageToolbar
        title="링크 모음"
        summary={`${REPORTS.length}개 · 팀 비밀번호를 넣어야 보여요`}
      />
      {/* 벤토 그리드: 넓은 화면에서 첫 리포트를 크게, 나머지를 오른쪽에 쌓는다. 휴대폰에서는 한 줄씩. */}
      <ul className="grid max-w-2xl grid-cols-1 gap-3 md:auto-rows-[5rem] md:grid-cols-3">
        {REPORTS.map((report, i) => (
          <li key={report.slug} className={i === 0 ? 'md:col-span-2 md:row-span-2' : ''}>
            <button
              type="button"
              onClick={() => choose(report)}
              disabled={pending}
              className="block size-full rounded-3xl text-left focus-visible:outline-2 focus-visible:outline-accent"
            >
              <Card className="size-full justify-between transition-colors hover:bg-default">
                <Card.Header>
                  <Card.Title
                    className={i === 0 ? 'text-xl font-semibold' : 'text-base font-semibold'}
                  >
                    {report.title}
                  </Card.Title>
                </Card.Header>
                <Card.Footer className="text-xs text-muted">{report.syncedAt} 복사본</Card.Footer>
              </Card>
            </button>
          </li>
        ))}
      </ul>
      {asking && (
        <PasswordModal
          title={asking.title}
          error={error}
          pending={pending}
          onSubmit={(pw) => void open(asking, pw)}
          onClose={() => {
            setAsking(null)
            setError(null)
          }}
        />
      )}
    </div>
  )
}
