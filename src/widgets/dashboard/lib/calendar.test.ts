import { describe, expect, it } from 'vitest'

import type { Issue } from '@/shared/api/linear'

import { dueCountsByDate } from './calendar'

const issue = (dueDate: string | null): Issue => ({
  id: String(Math.random()),
  identifier: 'BUK-1',
  title: 't',
  url: 'https://linear.app/x/issue/BUK-1',
  dueDate,
  startedAt: null,
  state: { name: '할 일', type: 'unstarted' },
  assignee: null,
  labels: [],
  milestone: null,
})

describe('달력 날짜별 기한 티켓 수', () => {
  it('날짜마다 그날 기한인 티켓 수를 세고 기한 없음은 세지 않는다', () => {
    const counts = dueCountsByDate([
      issue('2026-11-05'),
      issue('2026-11-05'),
      issue('2026-11-12'),
      issue(null),
    ])
    expect(Object.fromEntries(counts)).toEqual({ '2026-11-05': 2, '2026-11-12': 1 })
  })
})
