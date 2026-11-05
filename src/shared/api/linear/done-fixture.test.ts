import { describe, expect, it } from 'vitest'

import { createFixtureDone } from './done-fixture'
import { doneIssueSchema } from './done-schema'
import { kstDate } from '../../lib/date'

const NOW = new Date('2026-11-05T03:00:00.000Z')

describe('완료·취소 예시 데이터', () => {
  const issues = createFixtureDone({ start: '2026-10-23', end: '2026-11-05' }, NOW)

  it('실제 응답과 같은 모양이다', () => {
    for (const issue of issues) expect(() => doneIssueSchema.parse(issue)).not.toThrow()
  })

  it('완료와 취소, 담당 없음, 마일스톤 없음 티켓이 들어 있다', () => {
    expect(issues.some((i) => i.state.type === 'completed')).toBe(true)
    expect(issues.some((i) => i.state.type === 'canceled')).toBe(true)
    expect(issues.some((i) => i.assignee === null)).toBe(true)
    expect(issues.some((i) => i.milestone === null)).toBe(true)
  })

  it('고른 기간 안에 닫힌 티켓만 늦은 순으로 준다', () => {
    const days = issues.map((i) => kstDate(i.closedAt))
    expect(days.every((d) => d >= '2026-10-23' && d <= '2026-11-05')).toBe(true)
    expect([...days].sort().reverse()).toEqual(days)
  })

  it('기간에 닫힌 티켓이 없으면 빈 목록이다', () => {
    expect(createFixtureDone({ start: '2025-01-01', end: '2025-01-02' }, NOW)).toEqual([])
  })
})
