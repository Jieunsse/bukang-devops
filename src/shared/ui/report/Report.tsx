'use client'

import type { ReactNode } from 'react'

import s from './report.module.css'

/** 리포트의 등급 칩 색. good 초록, ok 회색, weak 주황, none 빨강 */
export type ReportGrade = 'good' | 'ok' | 'weak' | 'none'

export type ReportTocItem<K extends string> = {
  id: K
  label: ReactNode
  note?: string
  title?: string
}
export type ReportTocGroup<K extends string> = { group: string; items: ReportTocItem<K>[] }

/**
 * 크루런 리포트 아티팩트와 같은 틀. 왼쪽 목차에서 한 화면을 고르면 오른쪽 본문이 바뀐다.
 * 폰 폭에서는 목차가 위쪽 가로 탭이 된다. tools는 목차 위에 붙는 도구(찾기 칸 등)다.
 */
export function ReportLayout<K extends string>({
  label,
  toc,
  current,
  onSelect,
  tools,
  empty,
  children,
}: {
  label: string
  toc: ReportTocGroup<K>[]
  current: K
  onSelect: (id: K) => void
  tools?: ReactNode
  /** 목차가 비었을 때(찾기 결과 없음) 보여 줄 문구 */
  empty?: string
  children: ReactNode
}) {
  const hasItems = toc.some((g) => g.items.length > 0)
  return (
    <div className={s.report}>
      <nav aria-label={label} className={s.toc}>
        {tools && <div className={s.tocTools}>{tools}</div>}
        {!hasItems && empty && <p className={s.empty}>{empty}</p>}
        {toc
          .filter((g) => g.items.length > 0)
          .map((g) => (
            <div key={g.group} className="contents">
              <div className={s.group}>{g.group}</div>
              {g.items.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  title={i.title}
                  className={s.tocItem}
                  aria-current={i.id === current}
                  onClick={() => onSelect(i.id)}
                >
                  <span className="min-w-0 truncate">{i.label}</span>
                  {i.note && <small>{i.note}</small>}
                </button>
              ))}
            </div>
          ))}
      </nav>
      <div className={s.page}>{children}</div>
    </div>
  )
}

export function ReportHeader({
  title,
  sub,
  actions,
}: {
  title: ReactNode
  sub?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className={s.title}>{title}</h2>
        {sub && <p className={s.sub}>{sub}</p>}
      </div>
      {actions}
    </header>
  )
}

export function GradeChip({ grade, children }: { grade: ReportGrade; children: ReactNode }) {
  return <span className={`${s.grade} ${s[grade]}`}>{children}</span>
}

/** 숫자 상자 하나. dl 안에 넣는다 */
export function Fact({
  label,
  value,
  big = true,
}: {
  label: ReactNode
  value: ReactNode
  big?: boolean
}) {
  return (
    <div className={s.fact}>
      <dt>{label}</dt>
      <dd className={big ? s.big : undefined}>{value}</dd>
    </div>
  )
}

/** 제목이 붙은 본문 덩어리 */
export function ReportSection({
  title,
  description,
  children,
}: {
  title: string
  description?: ReactNode
  children: ReactNode
}) {
  return (
    <section aria-label={title}>
      <h3 className={s.h2}>{title}</h3>
      {description && <p className={`${s.sub} -mt-2 mb-3`}>{description}</p>}
      {children}
    </section>
  )
}

export { s as report }
