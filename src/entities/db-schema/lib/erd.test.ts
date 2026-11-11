import { describe, expect, it } from 'vitest'

import schema from '../data/schema.json'
import type { DbSchema } from '../model/types'

import { ERD_ROW_HEIGHT, ERD_TABLE_WIDTH, layoutErd } from './erd'
import { groupByService } from './group'

const layout = layoutErd(groupByService((schema as DbSchema).tables))

describe('layoutErd', () => {
  it('모든 테이블을 놓고, 서로 겹치는 상자가 없다', () => {
    expect(layout.tables).toHaveLength(schema.tables.length)
    const box = (t: (typeof layout.tables)[number]) => ({
      ...t,
      w: ERD_TABLE_WIDTH,
      h: 36 + t.table.columns.length * ERD_ROW_HEIGHT,
    })
    const boxes = layout.tables.map(box)
    for (const [i, a] of boxes.entries())
      for (const b of boxes.slice(i + 1)) {
        const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
        expect(overlap, `${a.table.name}와 ${b.table.name}`).toBe(false)
      }
  })

  it('외래 키마다 선을 하나씩 만들고, 양 끝 컬럼이 실제로 있다', () => {
    const fkCount = schema.tables.reduce((n, t) => n + t.foreignKeys.length, 0)
    expect(layout.links).toHaveLength(fkCount)
    const byName = new Map(layout.tables.map((t) => [t.table.name, t.table]))
    for (const l of layout.links) {
      expect(byName.get(l.from)?.columns.some((c) => c.name === l.fromColumn)).toBe(true)
      expect(byName.get(l.to)?.columns.some((c) => c.name === l.toColumn)).toBe(true)
    }
  })

  it('화면에 없는 테이블을 가리키는 외래 키는 선을 그리지 않는다', () => {
    const fk = { name: 'fk', column: 'order_id', refTable: 'order_order', refColumn: 'id' }
    const item = {
      name: 'order_order_item',
      comment: '',
      columns: [],
      indexes: [],
      foreignKeys: [fk],
    }
    expect(layoutErd([{ label: '주문', prefix: 'order_', tables: [item] }]).links).toEqual([])
  })
})
