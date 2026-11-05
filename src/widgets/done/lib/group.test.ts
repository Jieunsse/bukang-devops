import { describe, expect, it } from 'vitest'

import { NONE } from '@/features/filter'
import type { DoneIssue } from '@/shared/api/linear'

import { groupDone } from './group'

const issue = (
  n: number,
  closedAt: string,
  assignee: DoneIssue['assignee'],
  canceled = false,
): DoneIssue => ({
  id: `i${n}`,
  identifier: `BUK-${n}`,
  title: `티켓 ${n}`,
  url: `https://linear.app/bukang/issue/BUK-${n}`,
  dueDate: null,
  startedAt: null,
  closedAt,
  state: canceled ? { name: '취소', type: 'canceled' } : { name: '완료', type: 'completed' },
  assignee,
  labels: [],
  milestone: null,
})

const jihoon = { id: 'u1', name: '지훈', avatarUrl: 'https://example.com/a.png' }
const sohee = { id: 'u2', name: '소희' }
const minsu = { id: 'u3', name: '민수' }

describe('완료·취소 티켓을 사람별로 묶기', () => {
  it('기간에 티켓이 없으면 묶음도 없다', () => {
    expect(groupDone([])).toEqual([])
  })

  it('담당자마다 묶고 완료 수와 취소 수를 센다', () => {
    const groups = groupDone([
      issue(1, '2026-11-01T00:00:00Z', jihoon),
      issue(2, '2026-11-02T00:00:00Z', jihoon, true),
      issue(3, '2026-11-03T00:00:00Z', sohee),
    ])
    expect(groups.map((g) => [g.name, g.completed, g.canceled])).toEqual([
      ['지훈', 1, 1],
      ['소희', 1, 0],
    ])
    expect(groups[0]).toMatchObject({ id: 'u1', avatarUrl: 'https://example.com/a.png' })
  })

  it('완료 수가 많은 사람부터 두고, 같으면 이름 순이다', () => {
    const groups = groupDone([
      issue(1, '2026-11-01T00:00:00Z', sohee),
      // 취소는 많아도 순서를 정하지 않는다.
      issue(2, '2026-11-01T00:00:00Z', jihoon, true),
      issue(3, '2026-11-01T00:00:00Z', jihoon, true),
      issue(4, '2026-11-01T00:00:00Z', minsu),
      issue(5, '2026-11-01T00:00:00Z', minsu),
    ])
    expect(groups.map((g) => g.name)).toEqual(['민수', '소희', '지훈'])
  })

  it('담당 없음은 완료 수와 상관없이 맨 아래다', () => {
    const groups = groupDone([
      issue(1, '2026-11-01T00:00:00Z', null),
      issue(2, '2026-11-01T00:00:00Z', null),
      issue(3, '2026-11-01T00:00:00Z', sohee, true),
    ])
    expect(groups.map((g) => [g.id, g.name])).toEqual([
      ['u2', '소희'],
      [NONE, '담당 없음'],
    ])
  })

  it('묶음 안은 닫은 날이 최근인 것부터다', () => {
    const [group] = groupDone([
      issue(1, '2026-11-01T00:00:00Z', jihoon),
      issue(2, '2026-11-03T00:00:00Z', jihoon, true),
      issue(3, '2026-11-02T00:00:00Z', jihoon),
    ])
    expect(group.issues.map((i) => i.identifier)).toEqual(['BUK-2', 'BUK-3', 'BUK-1'])
  })
})
