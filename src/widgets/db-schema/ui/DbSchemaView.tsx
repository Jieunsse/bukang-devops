'use client'

import { Card, Chip, Table } from '@heroui/react'
import { buttonVariants } from '@heroui/styles'
import { useState } from 'react'

import type { DbColumn, DbTable, DbTableGroup } from '@/entities/db-schema'
import { formatMonthDay, kstDate } from '@/shared/lib/date'

const KEY_LABEL: Record<string, string> = { PRI: '기본 키', UNI: '유일', MUL: '인덱스' }

/** 인텔리제이 데이터베이스 창처럼 서비스 → 테이블 → 컬럼 순서로 펼쳐 본다. */
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
  const table = tables.find((t) => t.name === selected)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">DB 구조</h2>
        <p className="text-sm text-muted">
          운영 DB {database} · {formatMonthDay(kstDate(dumpedAt))}에 읽음 · 테이블 {tables.length}개
        </p>
      </div>
      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <nav aria-label="테이블" className="flex shrink-0 flex-col gap-4 md:w-64">
          {groups.map((g) => (
            <section key={g.label} aria-label={g.label} className="flex flex-col gap-1">
              <h3 className="px-3 text-sm font-semibold">
                {g.label} <span className="font-normal text-muted">{g.tables.length}</span>
              </h3>
              {g.tables.map((t) => (
                <button
                  key={t.name}
                  type="button"
                  aria-current={t.name === selected ? 'true' : undefined}
                  onClick={() => setSelected(t.name)}
                  className={
                    buttonVariants({
                      variant: t.name === selected ? 'secondary' : 'ghost',
                      size: 'sm',
                      fullWidth: true,
                    }) + ' justify-start font-mono'
                  }
                >
                  {t.name}
                </button>
              ))}
            </section>
          ))}
        </nav>
        {table && <TableDetail table={table} />}
      </div>
    </div>
  )
}

function TableDetail({ table }: { table: DbTable }) {
  return (
    <Card className="min-w-0 flex-1 md:sticky md:top-4">
      <Card.Header>
        <Card.Title className="font-mono">{table.name}</Card.Title>
        {table.comment && <Card.Description>{table.comment}</Card.Description>}
      </Card.Header>
      <Card.Content className="flex flex-col gap-6">
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label={`${table.name} 컬럼`} className="min-w-[40rem]">
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
