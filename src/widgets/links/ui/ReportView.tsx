'use client'

import { Button, FieldError, Input, TextField } from '@heroui/react'
import Link from 'next/link'
import { useState } from 'react'

import { openReportAction } from '@/shared/api/reports/actions'
import { PageToolbar } from '@/shared/ui'

import type { Report } from '../model/reports'
import { CopyButton } from './CopyButton'

const FAIL_MESSAGE = {
  password: '비밀번호가 맞지 않아요.',
  missing: '서버에 리포트 열쇠가 없어요.',
  failed: '리포트를 열지 못했어요.',
} as const

export function ReportView({ report }: { report: Report }) {
  const { slug, title, hash, syncedAt } = report
  // 팀 비밀번호는 이 화면을 떠날 때까지만 기억한다. 브라우저 저장소에는 남기지 않는다.
  const [password, setPassword] = useState('')
  const [opened, setOpened] = useState<{ html: string; url: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const open = async () => {
    setPending(true)
    const result = await openReportAction(slug, password).catch(
      () => ({ ok: false, reason: 'failed' }) as const,
    )
    setPending(false)
    if (result.ok) setOpened({ html: result.html, url: result.url })
    else setError(FAIL_MESSAGE[result.reason])
  }

  return (
    <div className="flex flex-col gap-4">
      <PageToolbar
        title={title}
        summary={`${syncedAt} 복사본`}
        actions={
          <>
            <Link href="/links" className="text-sm text-muted underline-offset-4 hover:underline">
              링크 모음
            </Link>
            {/* 원본 주소에는 공유 키가 있어 비밀번호가 맞은 뒤에만 보여 준다. */}
            {opened && (
              <>
                <CopyButton text={opened.url} />
                <a
                  href={opened.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-accent underline-offset-4 hover:underline"
                >
                  원본 열기
                </a>
              </>
            )}
          </>
        }
      />
      {opened === null ? (
        <form
          className="flex max-w-sm items-start gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            void open()
          }}
        >
          <TextField
            type="password"
            value={password}
            onChange={(v) => {
              setPassword(v)
              setError(null)
            }}
            isInvalid={!!error}
            aria-label="팀 비밀번호"
            className="flex-1"
          >
            <Input autoComplete="current-password" placeholder="팀 비밀번호" />
            <FieldError>{error}</FieldError>
          </TextField>
          <Button type="submit" isDisabled={!password || pending}>
            보기
          </Button>
        </form>
      ) : (
        <iframe
          title={title}
          srcDoc={opened.html}
          // 리포트는 # 주소로 화면을 고른다. srcDoc에는 주소를 줄 수 없어 불러온 뒤 첫 화면으로 옮긴다.
          onLoad={(e) => {
            const w = e.currentTarget.contentWindow
            if (w && !w.location.hash) w.location.hash = hash
          }}
          className="h-[calc(100dvh-10rem)] w-full rounded-xl border border-border bg-white"
        />
      )}
    </div>
  )
}
