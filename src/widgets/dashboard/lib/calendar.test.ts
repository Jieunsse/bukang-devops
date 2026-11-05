import { describe, expect, it } from 'vitest'

import type { Issue } from '@/shared/api/linear'
import { kstDate } from '@/shared/lib/date'

import { dayTone, dueCountsByDate } from './calendar'

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

  it('지난 날은 빨강, 오늘은 주황, 그 밖은 회색이다', () => {
    expect(dayTone('2026-11-04', '2026-11-05')).toBe('danger')
    expect(dayTone('2026-11-05', '2026-11-05')).toBe('warning')
    expect(dayTone('2026-11-06', '2026-11-05')).toBe('default')
  })

  it('한국 시간 자정이 지나면 어제 기한은 지난 날이 된다', () => {
    const before = kstDate('2026-11-05T14:59:59.000Z')
    const after = kstDate('2026-11-05T15:00:00.000Z')
    expect(dayTone('2026-11-05', before)).toBe('warning')
    expect(dayTone('2026-11-05', after)).toBe('danger')
  })
})
