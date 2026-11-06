import { describe, expect, it } from 'vitest'

import { scheduleInputSchema, scheduleSchema } from './schema'

describe('일정 모양', () => {
  it('종료일이 시작일보다 빠르면 종료일 칸에 이유를 붙여 거절한다', () => {
    const result = scheduleInputSchema.safeParse({
      title: '발표',
      start: '2026-11-23',
      end: '2026-11-06',
      color: 'blue',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues).toEqual([
      expect.objectContaining({ path: ['end'], message: '종료일이 시작일보다 빨라요.' }),
    ])
  })

  it('색이 없는 예전 일정이나 모르는 색은 기본색(파랑)으로 읽는다', () => {
    const base = { id: 'a1', title: '발표', start: '2026-11-23', end: '2026-11-23' }
    expect(scheduleSchema.parse(base).color).toBe('blue')
    expect(scheduleSchema.parse({ ...base, color: 'red' }).color).toBe('blue')
    expect(scheduleSchema.parse({ ...base, color: 'teal' }).color).toBe('teal')
  })
})
