import { describe, expect, it } from 'vitest'

import type { Issue } from '@/shared/api/linear'

import { groupRows, markOf, toneOf, viewRange, type DatedIssue } from './timeline'

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
const dated = (n: number, dueDate: string, extra: Partial<Issue> = {}) =>
  issue(n, dueDate, extra) as DatedIssue

const TODAY = '2026-11-05'
const RANGE = { start: '2026-10-27', end: '2026-11-23' }

describe('보기 범위', () => {
  it('4주는 오늘이 왼쪽에서 3분의 1쯤 오도록 28일을 보여 준다', () => {
    expect(viewRange('4w', TODAY)).toEqual({ start: '2026-10-27', end: '2026-11-23' })
  })

  it('2주는 같은 방식으로 14일을 보여 준다', () => {
    expect(viewRange('2w', TODAY)).toEqual({ start: '2026-11-01', end: '2026-11-14' })
  })

  it('전체는 프로젝트 기간 10/28~11/23이다', () => {
    expect(viewRange('all', TODAY)).toEqual({ start: '2026-10-28', end: '2026-11-23' })
  })
})

describe('막대와 마름모', () => {
  it('진행 중으로 바뀐 한국 날짜부터 기한까지 막대를 그린다', () => {
    // UTC 11/2 15:30은 한국 시간 11/3 00:30이다.
    const mark = markOf(issue(1, '2026-11-10', { startedAt: '2026-11-02T15:30:00.000Z' }), RANGE)
    expect(mark).toEqual({
      kind: 'bar',
      from: '2026-11-03',
      to: '2026-11-10',
      started: '2026-11-03',
      outside: null,
    })
  })

  it('시작 전 티켓은 기한 칸에 마름모로 표시한다', () => {
    expect(markOf(issue(1, '2026-11-10'), RANGE)).toMatchObject({
      kind: 'diamond',
      from: '2026-11-10',
      to: '2026-11-10',
      started: null,
    })
  })

  it('시작일이 기한보다 늦으면 기한 칸에 마름모로 표시한다', () => {
    const mark = markOf(issue(1, '2026-11-03', { startedAt: '2026-11-04T01:00:00.000Z' }), RANGE)
    expect(mark).toMatchObject({ kind: 'diamond', from: '2026-11-03', started: '2026-11-04' })
  })

  it('보기 범위에 걸친 막대는 범위 안쪽만 그리고 실제 시작일은 남긴다', () => {
    const mark = markOf(issue(1, '2026-12-10', { startedAt: '2026-09-01T01:00:00.000Z' }), RANGE)
    expect(mark).toEqual({
      kind: 'bar',
      from: '2026-10-27',
      to: '2026-11-23',
      started: '2026-09-01',
      outside: null,
    })
  })

  it('보기 범위보다 앞이나 뒤에 있으면 어느 쪽인지 알려 준다', () => {
    expect(markOf(issue(1, '2026-10-20'), RANGE)?.outside).toBe('before')
    expect(markOf(issue(2, '2026-12-01'), RANGE)?.outside).toBe('after')
  })

  it('기한이 없으면 그리지 않는다', () => {
    expect(markOf(issue(1, null), RANGE)).toBeNull()
  })
})

describe('색 판정', () => {
  it('기한이 지났으면 시작 여부와 상관없이 기한 지남이다', () => {
    expect(toneOf(dated(1, '2026-11-04'), TODAY)).toBe('overdue')
    expect(toneOf(dated(2, '2026-11-04', { startedAt: '2026-11-01T01:00:00.000Z' }), TODAY)).toBe(
      'overdue',
    )
  })

  it('기한이 오늘이면 오늘 마감이다', () => {
    expect(toneOf(dated(1, '2026-11-05'), TODAY)).toBe('today')
  })

  it('기한이 남았으면 시작했는지에 따라 진행 중과 시작 전으로 나눈다', () => {
    expect(toneOf(dated(1, '2026-11-10', { startedAt: '2026-11-01T01:00:00.000Z' }), TODAY)).toBe(
      'progress',
    )
    expect(toneOf(dated(2, '2026-11-10'), TODAY)).toBe('notStarted')
  })
})

describe('줄 묶음', () => {
  const people = { a: { id: 'u1', name: '지훈' }, b: { id: 'u2', name: '가람' } }
  const m1 = { id: 'm1', name: '세미 발표', progress: 0.5 }

  it('담당자별로 이름순으로 묶고 담당 없음은 맨 아래에 둔다', () => {
    const rows = groupRows(
      [
        dated(1, '2026-11-09'),
        dated(2, '2026-11-08', { assignee: people.a }),
        dated(3, '2026-11-07', { assignee: people.b }),
      ],
      'assignee',
    )
    expect(rows.map((r) => r.name)).toEqual(['가람', '지훈', '담당 없음'])
  })

  it('마일스톤별로 묶고 마일스톤 없음은 맨 아래에 둔다', () => {
    const rows = groupRows(
      [dated(1, '2026-11-09'), dated(2, '2026-11-08', { milestone: m1 })],
      'milestone',
    )
    expect(rows.map((r) => r.name)).toEqual(['세미 발표', '마일스톤 없음'])
  })

  it('묶음 안은 기한이 빠른 순이다', () => {
    const rows = groupRows(
      [dated(1, '2026-11-09'), dated(2, '2026-11-02'), dated(3, '2026-11-05')],
      'assignee',
    )
    expect(rows[0]!.issues.map((i) => i.id)).toEqual(['i2', 'i3', 'i1'])
  })
})
