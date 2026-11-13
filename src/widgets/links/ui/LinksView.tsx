import { Card } from '@heroui/react'
import Link from 'next/link'

import { PageToolbar } from '@/shared/ui'

import { REPORTS } from '../model/reports'

export function LinksView() {
  return (
    <div className="flex flex-col gap-4">
      <PageToolbar
        title="링크 모음"
        summary={`${REPORTS.length}개 · 팀 비밀번호를 넣어야 보여요`}
      />
      <ul className="flex flex-col gap-3">
        {REPORTS.map(({ slug, title, syncedAt }) => (
          <li key={slug}>
            <Card>
              <Card.Content className="flex flex-row items-center gap-3 text-left">
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="font-semibold">{title}</span>
                  <span className="text-xs text-muted">{syncedAt} 복사본</span>
                </div>
                <Link
                  href={`/links/${slug}`}
                  className="text-sm font-medium text-accent underline-offset-4 hover:underline"
                >
                  여기서 보기
                </Link>
              </Card.Content>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  )
}
