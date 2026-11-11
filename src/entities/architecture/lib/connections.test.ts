import { describe, expect, it } from 'vitest'

import { EVENTS, SERVICES } from '../data'

import { connectionsOf } from './connections'

const ids = new Set(SERVICES.map((s) => s.id))

describe('아키텍처 데이터', () => {
  it('호출·이벤트에 적은 서비스가 모두 서비스 목록에 있다', () => {
    const named = [
      ...SERVICES.flatMap((s) => s.calls),
      ...EVENTS.flatMap((e) => [...e.from, ...e.to]),
    ]
    expect(named.filter((id) => !ids.has(id))).toEqual([])
  })

  it('토픽 이름은 한 번씩만 적는다', () => {
    const topics = EVENTS.map((e) => e.topic)
    expect(new Set(topics).size).toBe(topics.length)
  })
})

describe('connectionsOf', () => {
  it('부르는 쪽과 주고받는 이벤트를 모은다', () => {
    const c = connectionsOf('payout')
    expect(c.calledBy).toEqual(['order'])
    expect(c.sends).toEqual([])
    expect(c.receives.map((e) => e.topic)).toContain('queuing.claim.deposited')
  })
})
