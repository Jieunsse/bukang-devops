import type { ReactNode } from 'react'

/** 표·보드·달력 바로 위 도구 줄. 왼쪽에 제목과 개수, 오른쪽에 버튼, 아래에 고른 조건을 둔다. */
export function PageToolbar({
  title,
  summary,
  actions,
  children,
}: {
  title: string
  summary?: string
  actions?: ReactNode
  children?: ReactNode
}) {
  return (
    <div role="group" aria-label={`${title} 도구`} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        {summary && <span className="text-sm text-muted">{summary}</span>}
        {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  )
}
