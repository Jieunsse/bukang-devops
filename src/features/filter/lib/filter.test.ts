import { describe, expect, it } from 'vitest'

import type { Issue } from '@/shared/api/linear'

import { applyFilters, NONE, parseFilters, toSearch } from './filter'

const base: Issue = {
  id: '1',
  identifier: 'BUK-1',
  title: '제목',
  url: 'https://linear.app/x/issue/BUK-1',
  dueDate: null,
  startedAt: null,
  state: { name: '할 일', type: 'unstarted' },
  assignee: null,
  labels: [],
  milestone: null,
}
const issues: Issue[] = [
  { ...base, id: '1', assignee: { id: 'u1', name: '지훈' }, labels: [{ id: 'l1', name: 'FE' }] },
  {
    ...base,
    id: '2',
    assignee: { id: 'u2', name: '소희' },
    labels: [{ id: 'l2', name: 'BE' }],
    milestone: { id: 'm1', name: '세미', progress: 0.5 },
  },
  { ...base, id: '3', milestone: { id: 'm1', name: '세미', progress: 0.5 } },
]
const ids = (list: Issue[]) => list.map((i) => i.id)

describe('필터', () => {
  it('주소의 값을 읽고 빈 값은 버린다', () => {
    expect(parseFilters(new URLSearchParams('assignee=u1&label=&milestone=m1'))).toEqual({
      assignee: 'u1',
      milestone: 'm1',
    })
  })

  it('고른 값을 주소로 만들고 다시 읽으면 같다', () => {
    const filters = { assignee: 'u1', label: 'l1', milestone: NONE }
    expect(parseFilters(new URLSearchParams(toSearch(filters)))).toEqual(filters)
  })

  it('필터를 바꿔도 주소에 있던 다른 값(완료·취소 기간)은 남긴다', () => {
    const current = new URLSearchParams('from=2026-10-01&to=2026-10-31&assignee=u1')
    expect(toSearch({ label: 'l1' }, current)).toBe('from=2026-10-01&to=2026-10-31&label=l1')
  })

  it('아무것도 고르지 않으면 주소는 비고 티켓은 그대로다', () => {
    expect(toSearch({})).toBe('')
    expect(ids(applyFilters(issues, {}))).toEqual(['1', '2', '3'])
  })

  it('담당자로 거른다', () => {
    expect(ids(applyFilters(issues, { assignee: 'u2' }))).toEqual(['2'])
  })

  it('담당 없음으로 거른다', () => {
    expect(ids(applyFilters(issues, { assignee: NONE }))).toEqual(['3'])
  })

  it('라벨로 거른다', () => {
    expect(ids(applyFilters(issues, { label: 'l1' }))).toEqual(['1'])
  })

  it('마일스톤과 마일스톤 없음으로 거른다', () => {
    expect(ids(applyFilters(issues, { milestone: 'm1' }))).toEqual(['2', '3'])
    expect(ids(applyFilters(issues, { milestone: NONE }))).toEqual(['1'])
  })

  it('여러 조건은 모두 맞는 티켓만 남긴다', () => {
    expect(ids(applyFilters(issues, { milestone: 'm1', assignee: NONE }))).toEqual(['3'])
  })
})
