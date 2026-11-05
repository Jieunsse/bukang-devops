import { describe, expect, it } from 'vitest'

import type { Issue } from '@/shared/api/linear'

import { bucketOf, groupByBucket } from './bucket'

const issue = (id: string, dueDate: string | null): Issue => ({
  id,
  identifier: `BUK-${id}`,
  title: id,
  url: `https://linear.app/x/issue/BUK-${id}`,
  dueDate,
  startedAt: null,
  state: { name: '할 일', type: 'unstarted' },
  assignee: null,
  labels: [],
  milestone: null,
})

describe('기한 묶음', () => {
  const period = { today: '2026-11-05', end: '2026-11-08' }

  it('어제까지 기한이면 지남이다', () => {
    expect(bucketOf('2026-11-04', period)).toBe('overdue')
  })

  it('오늘이 기한이면 오늘이다', () => {
    expect(bucketOf('2026-11-05', period)).toBe('today')
  })

  it('내일부터 기간 끝까지는 이번 주다', () => {
    expect(bucketOf('2026-11-06', period)).toBe('thisWeek')
    expect(bucketOf('2026-11-08', period)).toBe('thisWeek')
  })

  it('기간 끝 다음 날부터는 그 뒤다', () => {
    expect(bucketOf('2026-11-09', period)).toBe('later')
  })

  it('기한이 없으면 기한 없음이다', () => {
    expect(bucketOf(null, period)).toBe('noDue')
  })

  it('오늘이 기간 마지막 날이면 이번 주 묶음은 비고 내일은 그 뒤다', () => {
    const sunday = { today: '2026-11-08', end: '2026-11-08' }
    expect(bucketOf('2026-11-08', sunday)).toBe('today')
    expect(bucketOf('2026-11-09', sunday)).toBe('later')
  })

  it('티켓을 묶음별로 나누고 각 묶음은 기한 순이다', () => {
    const groups = groupByBucket(
      [
        issue('a', '2026-11-07'),
        issue('b', null),
        issue('c', '2026-11-01'),
        issue('d', '2026-11-06'),
        issue('e', '2026-11-20'),
        issue('f', '2026-11-05'),
      ],
      period,
    )
    expect(
      Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, v.map((i) => i.id)])),
    ).toEqual({
      overdue: ['c'],
      today: ['f'],
      thisWeek: ['d', 'a'],
      later: ['e'],
      noDue: ['b'],
    })
  })
})
