'use client'

import { useState } from 'react'

import type { DbColumn, DbTable, DbTableGroup } from '@/entities/db-schema'
import { formatMonthDay, kstDate } from '@/shared/lib/date'
import {
  Fact,
  report as s,
  ReportHeader,
  ReportLayout,
  ReportSection,
  type ReportTocGroup,
} from '@/shared/ui'

import { DbErdView } from './DbErdView'

const KEY_LABEL: Record<string, string> = { PRI: '기본 키', UNI: '유일', MUL: '인덱스' }

/** 목차 키: 개요, ERD, 테이블(t:테이블 이름) */
type Section = 'overview' | 'erd' | `t:${string}`

/** 운영 DB 테이블 구조. 리포트 아티팩트와 같은 틀(왼쪽 목차 + 본문)로 보여 준다. */
export function DbSchemaView({
  database,
  dumpedAt,
  groups,
}: {
  database: string
  dumpedAt: string
  groups: DbTableGroup[]
}) {
  const tables = groups.flatMap((g) => g.tables)
  const [section, setSection] = useState<Section>('overview')
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const table = section.startsWith('t:') ? tables.find((t) => `t:${t.name}` === section) : undefined
  const readAt = formatMonthDay(kstDate(dumpedAt))

  const toc: ReportTocGroup<Section>[] = [
    ...(q
      ? []
      : [
          {
            group: '요약',
            items: [
              { id: 'overview' as const, label: '개요' },
              { id: 'erd' as const, label: 'ERD' },
            ],
          },
        ]),
    ...groups.map((g) => ({
      group: `${g.label} ${g.tables.length}`,
      items: g.tables
        .filter((t) => t.name.toLowerCase().includes(q))
        .map((t) => ({
          id: `t:${t.name}` as const,
          label: <TableName name={t.name} prefix={g.prefix} />,
          title: t.name,
        })),
    })),
  ]

  return (
    <ReportLayout
      label="DB 구조 목차"
      toc={toc}
      current={section}
      onSelect={setSection}
      empty="맞는 테이블이 없어요."
      tools={
        <input
          type="search"
          aria-label="테이블 찾기"
          placeholder="테이블 찾기"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={s.search}
        />
      }
    >
      {section === 'overview' && (
        <Overview database={database} readAt={readAt} groups={groups} onSelect={setSection} />
      )}
      {section === 'erd' && (
        <>
          <ReportHeader title="ERD" sub="끌어서 옮기고 휠로 확대해요. 선은 외래 키예요." />
          <DbErdView groups={groups} />
        </>
      )}
      {table && <TableDetail table={table} />}
    </ReportLayout>
  )
}

/** 묶음 이름과 겹치는 앞부분(cash_ 등)은 흐리게 해, 테이블마다 다른 부분이 먼저 보이게 한다. */
function TableName({ name, prefix }: { name: string; prefix: string }) {
  const head = prefix && name.startsWith(prefix) ? prefix : ''
  return (
    <span className={s.code}>
      {head && <span className={s.muted}>{head}</span>}
      {name.slice(head.length)}
    </span>
  )
}

function Overview({
  database,
  readAt,
  groups,
  onSelect,
}: {
  database: string
  readAt: string
  groups: DbTableGroup[]
  onSelect: (id: Section) => void
}) {
  const tables = groups.flatMap((g) => g.tables)
  return (
    <>
      <ReportHeader title="DB 구조" sub={`운영 DB ${database} · ${readAt}에 읽음`} />
      <dl className={s.facts}>
        <Fact label="테이블" value={`${tables.length}개`} />
        <Fact label="묶음" value={`${groups.length}개`} />
        <Fact label="컬럼" value={`${tables.reduce((n, t) => n + t.columns.length, 0)}개`} />
        <Fact label="외래 키" value={`${tables.reduce((n, t) => n + t.foreignKeys.length, 0)}개`} />
      </dl>
      <ReportSection
        title="묶음별 테이블"
        description="테이블 이름을 누르면 컬럼과 인덱스가 보여요."
      >
        <div className={s.tbl}>
          <table aria-label="묶음별 테이블">
            <thead>
              <tr>
                <th className="w-32">묶음</th>
                <th>테이블</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.label}>
                  <td>
                    <b>{g.label}</b> <span className={s.muted}>{g.tables.length}</span>
                  </td>
                  <td>
                    <ul className={s.tags}>
                      {g.tables.map((t) => (
                        <li key={t.name}>
                          <button
                            type="button"
                            className={s.tag}
                            onClick={() => onSelect(`t:${t.name}`)}
                          >
                            {t.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ReportSection>
    </>
  )
}

function TableDetail({ table }: { table: DbTable }) {
  return (
    <>
      <ReportHeader
        title={<span className="font-mono">{table.name}</span>}
        sub={table.comment || undefined}
      />
      <dl className={s.facts}>
        <Fact label="컬럼" value={`${table.columns.length}개`} />
        <Fact label="인덱스" value={`${table.indexes.length}개`} />
        <Fact label="외래 키" value={`${table.foreignKeys.length}개`} />
      </dl>
      <ReportSection title="컬럼">
        <div className={s.tbl}>
          <table aria-label={`${table.name} 컬럼`}>
            <thead>
              <tr>
                <th>컬럼</th>
                <th>타입</th>
                <th>키</th>
                <th>빈 값</th>
                <th>기본값</th>
                <th>비고</th>
              </tr>
            </thead>
            <tbody>
              {table.columns.map((c) => (
                <tr key={c.name}>
                  <td className={s.code}>{c.name}</td>
                  {/* enum은 값이 길어서 줄을 바꿔야 키·빈 값 칸이 화면 밖으로 밀리지 않는다. */}
                  <td className={`max-w-64 min-w-32 ${s.code} ${s.muted}`}>{c.type}</td>
                  <td>{KEY_LABEL[c.key] && <span className={s.tag}>{KEY_LABEL[c.key]}</span>}</td>
                  <td className={s.muted}>{c.nullable ? '허용' : ''}</td>
                  <td className={`${s.code} ${s.muted}`}>{c.default ?? ''}</td>
                  <td className={s.muted}>{note(c)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ReportSection>
      {table.indexes.length > 0 && (
        <ReportSection title="인덱스">
          <div className={s.tbl}>
            <table aria-label={`${table.name} 인덱스`}>
              <thead>
                <tr>
                  <th>이름</th>
                  <th>컬럼</th>
                  <th>유일</th>
                </tr>
              </thead>
              <tbody>
                {table.indexes.map((i) => (
                  <tr key={i.name}>
                    <td className={s.code}>{i.name}</td>
                    <td className={`${s.code} ${s.muted}`}>{i.columns.join(', ')}</td>
                    <td>{i.unique && <span className={s.tag}>유일</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ReportSection>
      )}
      {table.foreignKeys.length > 0 && (
        <ReportSection title="외래 키">
          <div className={s.tbl}>
            <table aria-label={`${table.name} 외래 키`}>
              <thead>
                <tr>
                  <th>컬럼</th>
                  <th>가리키는 곳</th>
                </tr>
              </thead>
              <tbody>
                {table.foreignKeys.map((f) => (
                  <tr key={f.name}>
                    <td className={s.code}>{f.column}</td>
                    <td className={s.code}>
                      {f.refTable}.{f.refColumn}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ReportSection>
      )}
    </>
  )
}

/** auto_increment 같은 MySQL 부가 정보와 컬럼 설명을 한 칸에 모은다. */
function note(c: DbColumn) {
  const extra = c.extra.replace(/DEFAULT_GENERATED/i, '').trim()
  return [extra === 'auto_increment' ? '자동 증가' : extra, c.comment].filter(Boolean).join(' · ')
}
