import { describe, expect, it } from 'vitest'

import { defaultDoneRange, doneRangeSchema, MAX_RANGE_DAYS, parseDoneRange } from './done-schema'

const TODAY = '2026-11-05'

describe('완료·취소 기간', () => {
  it('기본 기간은 오늘까지 최근 2주(14일)다', () => {
    expect(defaultDoneRange(TODAY)).toEqual({ start: '2026-10-23', end: '2026-11-05' })
  })

  it('주소에 기간이 없으면 기본 기간을 쓴다', () => {
    expect(parseDoneRange(new URLSearchParams('assignee=u1'), TODAY)).toEqual({
      range: { start: '2026-10-23', end: '2026-11-05' },
    })
  })

  it('주소의 기간을 읽는다', () => {
    expect(parseDoneRange(new URLSearchParams('from=2026-10-01&to=2026-10-31'), TODAY)).toEqual({
      range: { start: '2026-10-01', end: '2026-10-31' },
    })
  })

  it.each([
    ['시작이 끝보다 늦은 기간', 'from=2026-11-05&to=2026-11-01'],
    ['너무 긴 기간', 'from=2026-01-01&to=2026-11-05'],
    ['날짜가 아닌 값', 'from=abc&to=2026-11-05'],
    ['한쪽만 있는 기간', 'from=2026-11-01'],
  ])('주소의 %s은 기본 기간으로 바꾸고 이유를 알려 준다', (_, search) => {
    const parsed = parseDoneRange(new URLSearchParams(search), TODAY)
    expect(parsed.range).toEqual(defaultDoneRange(TODAY))
    expect(parsed.error).toEqual(expect.any(String))
  })

  it(`${MAX_RANGE_DAYS}일까지는 고를 수 있고 하루라도 넘으면 안 된다`, () => {
    expect(doneRangeSchema.safeParse({ start: '2026-08-08', end: '2026-11-05' }).success).toBe(true)
    expect(doneRangeSchema.safeParse({ start: '2026-08-07', end: '2026-11-05' }).success).toBe(
      false,
    )
  })

  it('하루짜리 기간도 고를 수 있다', () => {
    expect(doneRangeSchema.safeParse({ start: TODAY, end: TODAY }).success).toBe(true)
  })

  it('없는 날짜는 거절한다', () => {
    expect(doneRangeSchema.safeParse({ start: '2026-02-30', end: '2026-03-01' }).success).toBe(
      false,
    )
  })
})
