import { describe, expect, it } from 'vitest'

import type { Issue } from '@/shared/api/linear'

import { groupRows, markOf, timelineRange } from './timeline'

const issue = (n: number, dueDate: string | null, extra: Partial<Issue> = {}): Issue => ({
  id: `i${n}`,
  identifier: `BUK-${n}`,
  title: `티켓 ${n}`,
  url: `https://linear.app/bukang/issue/BUK-${n}`,
  dueDate,
  startedAt: null,
  state: { name: '할 일', type: 'unstarted' },
  assignee: null,
  labels: [],
  milestone: null,
  ...extra,
})

const TODAY = '2026-11-05'

describe('막대와 점', () => {
  it('진행 중으로 바뀐 한국 날짜부터 기한까지 막대를 그린다', () => {
    // UTC 11/2 15:30은 한국 시간 11/3 00:30이다.
    const mark = markOf(
      issue(1, '2026-11-10', { startedAt: '2026-11-02T15:30:00.000Z' }),
      '2026-10-01',
    )
    expect(mark).toEqual({
      kind: 'bar',
      from: '2026-11-03',
      to: '2026-11-10',
      started: '2026-11-03',
    })
  })

  it('시작 전 티켓은 기한 날짜에 점으로 표시한다', () => {
    expect(markOf(issue(1, '2026-11-10'), '2026-10-01')).toEqual({
      kind: 'dot',
      from: '2026-11-10',
      to: '2026-11-10',
      started: null,
    })
  })

  it('시작일이 기한보다 늦으면 기한 날짜에 점으로 표시한다', () => {
    const mark = markOf(
      issue(1, '2026-11-03', { startedAt: '2026-11-04T01:00:00.000Z' }),
      '2026-10-01',
    )
    expect(mark).toMatchObject({
      kind: 'dot',
      from: '2026-11-03',
      to: '2026-11-03',
      started: '2026-11-04',
    })
  })

  it('표시 범위보다 먼저 시작한 막대는 범위 첫날부터 그리고 실제 시작일은 남긴다', () => {
    const mark = markOf(
      issue(1, '2026-11-10', { startedAt: '2026-09-01T01:00:00.000Z' }),
      '2026-10-29',
    )
    expect(mark).toEqual({
      kind: 'bar',
      from: '2026-10-29',
      to: '2026-11-10',
      started: '2026-09-01',
    })
  })
})

describe('표시 범위', () => {
  it('기본은 일주일 전부터 최종 발표일까지다', () => {
    expect(timelineRange([], TODAY)).toEqual({ start: '2026-10-29', end: '2026-11-23' })
  })

  it('더 오래 지난 기한과 최종 발표 뒤의 기한까지 늘린다', () => {
    const issues = [issue(1, '2026-10-01'), issue(2, '2026-12-10')]
    expect(timelineRange(issues, TODAY)).toEqual({ start: '2026-10-01', end: '2026-12-10' })
  })

  it('오래전에 시작한 날짜로는 늘리지 않는다', () => {
    const issues = [issue(1, '2026-11-10', { startedAt: '2026-08-01T01:00:00.000Z' })]
    expect(timelineRange(issues, TODAY).start).toBe('2026-10-29')
  })
})

describe('줄 묶음', () => {
  const people = {
    a: { id: 'u1', name: '지훈' },
    b: { id: 'u2', name: '가람' },
  }
  const m1 = { id: 'm1', name: '세미 발표', progress: 0.5 }

  it('담당자별로 이름순으로 묶고 담당 없음은 맨 아래에 둔다', () => {
    const rows = groupRows(
      [
        issue(1, '2026-11-09'),
        issue(2, '2026-11-08', { assignee: people.a }),
        issue(3, '2026-11-07', { assignee: people.b }),
      ],
      'assignee',
    )
    expect(rows.map((r) => r.name)).toEqual(['가람', '지훈', '담당 없음'])
  })

  it('마일스톤별로 묶고 마일스톤 없음은 맨 아래에 둔다', () => {
    const rows = groupRows(
      [issue(1, '2026-11-09'), issue(2, '2026-11-08', { milestone: m1 })],
      'milestone',
    )
    expect(rows.map((r) => r.name)).toEqual(['세미 발표', '마일스톤 없음'])
  })

  it('묶음 안은 기한이 빠른 순이다', () => {
    const rows = groupRows(
      [issue(1, '2026-11-09'), issue(2, '2026-11-02'), issue(3, '2026-11-05')],
      'assignee',
    )
    expect(rows[0]!.issues.map((i) => i.id)).toEqual(['i2', 'i3', 'i1'])
  })
})
