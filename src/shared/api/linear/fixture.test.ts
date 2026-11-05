import { describe, expect, it } from 'vitest'

import { createFixtureSnapshot } from './fixture'
import { snapshotSchema } from './schema'

describe('예시 데이터', () => {
  const snapshot = createFixtureSnapshot(new Date('2026-11-05T03:00:00.000Z'))

  it('실제 응답과 같은 모양이다', () => {
    expect(() => snapshotSchema.parse(snapshot)).not.toThrow()
  })

  it('담당자 없음, 마일스톤 없음, 기한 없음 티켓이 들어 있다', () => {
    expect(snapshot.issues.some((i) => i.assignee === null)).toBe(true)
    expect(snapshot.issues.some((i) => i.milestone === null)).toBe(true)
    expect(snapshot.issues.some((i) => i.dueDate === null)).toBe(true)
  })

  it('기한이 오늘 기준이라 날마다 지남·오늘 티켓이 생긴다', () => {
    const dues = snapshot.issues.map((i) => i.dueDate)
    expect(dues).toContain('2026-11-05')
    expect(dues.some((d) => d !== null && d < '2026-11-05')).toBe(true)
  })

  it('사이클에 든 티켓과 들지 않은 티켓이 있고, 사이클마다 완료 수가 있다', () => {
    const ids = new Set(snapshot.cycles.map((c) => c.id))
    expect(snapshot.issues.some((i) => i.cycle && ids.has(i.cycle.id))).toBe(true)
    expect(snapshot.issues.some((i) => !i.cycle)).toBe(true)
    expect(snapshot.cycles.every((c) => typeof c.completedIssueCount === 'number')).toBe(true)
  })
})
