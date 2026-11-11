import type { DbTable } from '../model/types'

import type { DbTableGroup } from './group'

/** 화면의 테이블 상자와 같은 값이어야 상자가 겹치지 않는다. */
export const ERD_TABLE_WIDTH = 260
export const ERD_ROW_HEIGHT = 24
const HEADER = 36
const GAP = 40
const LABEL = 48
/** 서비스 하나 안에서 테이블을 이 높이까지 쌓고 옆 줄로 넘긴다. */
const STACK_MAX = 1200
/** 서비스 묶음을 이 폭까지 옆으로 놓고 아래 줄로 넘긴다. */
const ROW_MAX = 4400

export type ErdLayout = {
  labels: { label: string; x: number; y: number }[]
  tables: { table: DbTable; x: number; y: number }[]
  /** from 테이블의 fromColumn이 to 테이블의 toColumn을 가리킨다. */
  links: { id: string; from: string; fromColumn: string; to: string; toColumn: string }[]
}

const heightOf = (t: DbTable) => HEADER + t.columns.length * ERD_ROW_HEIGHT

/** 서비스마다 테이블을 세로로 쌓은 묶음을 만들고, 묶음을 왼쪽에서 오른쪽, 위에서 아래로 놓는다. */
export function layoutErd(groups: DbTableGroup[]): ErdLayout {
  const labels: ErdLayout['labels'] = []
  const tables: ErdLayout['tables'] = []
  let x = 0
  let y = 0
  let rowHeight = 0

  for (const g of groups) {
    const placed: { table: DbTable; x: number; y: number }[] = []
    let col = 0
    let top = 0
    let blockHeight = 0
    for (const t of g.tables) {
      if (top > 0 && top + heightOf(t) > STACK_MAX) {
        col += 1
        top = 0
      }
      placed.push({ table: t, x: col * (ERD_TABLE_WIDTH + GAP), y: top })
      top += heightOf(t) + GAP
      blockHeight = Math.max(blockHeight, top)
    }
    const blockWidth = (col + 1) * (ERD_TABLE_WIDTH + GAP)
    if (x > 0 && x + blockWidth > ROW_MAX) {
      x = 0
      y += rowHeight + GAP * 2
      rowHeight = 0
    }
    labels.push({ label: g.label, x, y })
    for (const p of placed) tables.push({ table: p.table, x: x + p.x, y: y + LABEL + p.y })
    x += blockWidth + GAP * 2
    rowHeight = Math.max(rowHeight, LABEL + blockHeight)
  }

  const names = new Set(tables.map((t) => t.table.name))
  const links = tables.flatMap(({ table }) =>
    table.foreignKeys
      .filter((f) => names.has(f.refTable))
      .map((f) => ({
        id: `${table.name}.${f.name}.${f.column}`,
        from: table.name,
        fromColumn: f.column,
        to: f.refTable,
        toColumn: f.refColumn,
      })),
  )
  return { labels, tables, links }
}
