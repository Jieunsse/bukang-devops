import { describe, expect, it } from 'vitest'

import schema from '../data/schema.json'
import type { DbTable } from '../model/types'

import { groupByService, serviceOf } from './group'

const table = (name: string): DbTable => ({
  name,
  comment: '',
  columns: [],
  indexes: [],
  foreignKeys: [],
})

describe('serviceOf', () => {
  it('앞부분으로 서비스를 정한다', () => {
    expect(serviceOf('member_member')).toBe('회원')
    expect(serviceOf('order_order_item')).toBe('주문')
  })

  it('앞부분이 없는 상품 테이블도 상품으로 묶는다', () => {
    expect(serviceOf('race')).toBe('상품')
    expect(serviceOf('participation_hold')).toBe('상품')
  })

  it('Flyway·Batch 기록은 시스템 기록으로, 모르는 이름은 기타로 둔다', () => {
    expect(serviceOf('flyway_schema_history_cash')).toBe('시스템 기록')
    expect(serviceOf('BATCH_JOB_INSTANCE')).toBe('시스템 기록')
    expect(serviceOf('something')).toBe('기타')
  })
})

describe('groupByService', () => {
  it('메뉴 순서대로 묶고 빈 묶음은 뺀다', () => {
    const groups = groupByService([table('cash_wallet'), table('member_member'), table('x')])
    expect(groups.map((g) => g.label)).toEqual(['회원', '예치금', '기타'])
  })

  it('서비스 묶음은 공통 앞부분을, 기타는 빈 문자열을 갖는다', () => {
    const groups = groupByService([table('cash_wallet'), table('x')])
    expect(groups.map((g) => g.prefix)).toEqual(['cash_', ''])
  })

  it('저장된 스키마의 테이블이 빠짐없이 한 번씩 들어간다', () => {
    const groups = groupByService(schema.tables as DbTable[])
    expect(groups.flatMap((g) => g.tables).length).toBe(schema.tables.length)
    expect(groups.some((g) => g.label === '기타')).toBe(false)
  })
})
