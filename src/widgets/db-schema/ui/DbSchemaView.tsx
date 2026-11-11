'use client'

import { Card, Chip, Input, Table, TextField, ToggleButton, ToggleButtonGroup } from '@heroui/react'
import { useState } from 'react'

import type { DbColumn, DbTable, DbTableGroup } from '@/entities/db-schema'
import { formatMonthDay, kstDate } from '@/shared/lib/date'

import { DbErdView } from './DbErdView'

const KEY_LABEL: Record<string, string> = { PRI: '기본 키', UNI: '유일', MUL: '인덱스' }

/** 인텔리제이 데이터베이스 창처럼 왼쪽 목록과 오른쪽 상세를 각자 스크롤한다. */
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
  const [selected, setSelected] = useState(tables[0]?.name)
  const [query, setQuery] = useState('')
  const [view, setView] = useState<'list' | 'erd'>('list')
  const table = tables.find((t) => t.name === selected)
  const q = query.trim().toLowerCase()
  const shown = groups
    .map((g) => ({ ...g, tables: g.tables.filter((t) => t.name.toLowerCase().includes(q)) }))
    .filter((g) => g.tables.length > 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">DB 구조</h2>
          <p className="text-sm text-muted">
            운영 DB {database} · {formatMonthDay(kstDate(dumpedAt))}에 읽음 · 테이블 {tables.length}
            개
          </p>
        </div>
        <ToggleButtonGroup
          aria-label="보기 방식"
          size="sm"
          selectionMode="single"
          disallowEmptySelection
          selectedKeys={[view]}
          onSelectionChange={(keys) => setView([...keys][0] as 'list' | 'erd')}
        >
          <ToggleButton id="list">목록</ToggleButton>
          <ToggleButton id="erd">ERD</ToggleButton>
        </ToggleButtonGroup>
      </div>
      {view === 'erd' && <DbErdView groups={groups} />}
      {/* 넓은 화면에서는 두 창 높이를 화면에 맞춰, 목록을 내려도 상세가 제자리에 있게 한다. */}
      <div
        hidden={view !== 'list'}
        className="flex flex-col gap-4 xl:h-[calc(100dvh-13rem)] xl:min-h-96 xl:flex-row"
      >
        <nav
          aria-label="테이블"
          className="flex max-h-80 shrink-0 flex-col rounded-2xl border border-border xl:max-h-none xl:w-80"
        >
          <div className="border-b border-border p-2">
            <TextField aria-label="테이블 찾기" value={query} onChange={setQuery}>
              <Input placeholder="테이블 찾기" />
            </TextField>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-2 pb-2">
            {shown.length === 0 && (
              <p className="px-2 py-4 text-sm text-muted">맞는 테이블이 없어요.</p>
            )}
            {shown.map((g) => (
              <section key={g.label} aria-label={g.label} className="flex flex-col">
                <h3 className="sticky top-0 bg-background px-2 py-1 text-xs font-medium text-muted">
                  {g.label} {g.tables.length}
                </h3>
                {g.tables.map((t) => (
                  <TableLink
                    key={t.name}
                    name={t.name}
                    prefix={g.prefix}
                    current={t.name === selected}
                    onSelect={setSelected}
                  />
                ))}
              </section>
            ))}
          </div>
        </nav>
        {table && <TableDetail table={table} />}
      </div>
    </div>
  )
}

/** 묶음 이름과 겹치는 앞부분(cash_ 등)은 흐리게 해, 테이블마다 다른 부분이 먼저 보이게 한다. */
function TableLink({
  name,
  prefix,
  current,
  onSelect,
}: {
  name: string
  prefix: string
  current: boolean
  onSelect: (name: string) => void
}) {
  const head = prefix && name.startsWith(prefix) ? prefix : ''
  return (
    <button
      type="button"
      title={name}
      aria-current={current ? 'true' : undefined}
      onClick={() => onSelect(name)}
      className={
        'truncate rounded-lg px-2 py-1 text-left font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-focus ' +
        (current ? 'bg-default font-medium text-foreground' : 'text-foreground hover:bg-default/60')
      }
    >
      {head && <span className="text-muted">{head}</span>}
      {name.slice(head.length)}
    </button>
  )
}

function TableDetail({ table }: { table: DbTable }) {
  return (
    <Card className="min-h-0 min-w-0 flex-1 overflow-y-auto">
      <Card.Header>
        <Card.Title className="font-mono">{table.name}</Card.Title>
        {table.comment && <Card.Description>{table.comment}</Card.Description>}
      </Card.Header>
      <Card.Content className="flex flex-col gap-6">
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label={`${table.name} 컬럼`} className="min-w-[36rem]">
              <Table.Header>
                <Table.Column isRowHeader>컬럼</Table.Column>
                <Table.Column>타입</Table.Column>
                <Table.Column>키</Table.Column>
                <Table.Column>빈 값</Table.Column>
                <Table.Column>기본값</Table.Column>
                <Table.Column>비고</Table.Column>
              </Table.Header>
              <Table.Body>
                {table.columns.map((c) => (
                  <Table.Row key={c.name} id={c.name}>
                    <Table.Cell className="font-mono">{c.name}</Table.Cell>
                    {/* enum은 값이 길어서 줄을 바꿔야 키·빈 값 칸이 화면 밖으로 밀리지 않는다. */}
                    <Table.Cell className="max-w-64 font-mono break-all whitespace-normal text-muted">
                      {c.type}
                    </Table.Cell>
                    <Table.Cell>
                      {KEY_LABEL[c.key] && (
                        <Chip size="sm" variant="soft">
                          {KEY_LABEL[c.key]}
                        </Chip>
                      )}
                    </Table.Cell>
                    <Table.Cell className="text-muted">{c.nullable ? '허용' : ''}</Table.Cell>
                    <Table.Cell className="font-mono text-muted">{c.default ?? ''}</Table.Cell>
                    <Table.Cell className="text-muted">{note(c)}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
        {table.indexes.length > 0 && (
          <section aria-label="인덱스" className="flex flex-col gap-2">
            <h4 className="text-sm font-semibold">인덱스</h4>
            <ul className="flex flex-col gap-1 text-sm">
              {table.indexes.map((i) => (
                <li key={i.name} className="flex flex-wrap items-center gap-2">
                  <span className="font-mono">{i.name}</span>
                  {i.unique && (
                    <Chip size="sm" variant="soft">
                      유일
                    </Chip>
                  )}
                  <span className="font-mono text-muted">({i.columns.join(', ')})</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </Card.Content>
    </Card>
  )
}

/** auto_increment 같은 MySQL 부가 정보와 컬럼 설명을 한 칸에 모은다. */
function note(c: DbColumn) {
  const extra = c.extra.replace(/DEFAULT_GENERATED/i, '').trim()
  return [extra === 'auto_increment' ? '자동 증가' : extra, c.comment].filter(Boolean).join(' · ')
}
