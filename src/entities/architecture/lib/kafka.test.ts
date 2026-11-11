import { describe, expect, it } from 'vitest'

import { EVENTS } from '../data'

import { consumerOf, highlight, senderPath } from './kafka'

const event = (topic: string) => EVENTS.find((e) => e.topic === topic)!

describe('Kafka 데이터', () => {
  it('받는 서비스마다 컨슈머 그룹과 재시도 횟수가 있다', () => {
    const missing = EVENTS.flatMap((e) =>
      e.to.filter((id) => !consumerOf(e, id).group).map((id) => `${e.topic}:${id}`),
    )
    expect(missing).toEqual([])
  })

  it('바로 보내는 서비스는 그 이벤트를 보내는 서비스 안에 있다', () => {
    const wrong = EVENTS.flatMap((e) =>
      (e.direct ?? []).filter((id) => !e.from.includes(id)).map((id) => `${e.topic}:${id}`),
    )
    expect(wrong).toEqual([])
  })

  it('게시판의 사진 연결 요청은 아웃박스 없이 바로 보내고, 상품은 아웃박스로 보낸다', () => {
    const e = event('race.filelink.requested')
    expect(senderPath(e, 'board')).toBe('direct')
    expect(senderPath(e, 'product')).toBe('outbox')
  })

  it('예치금은 토픽마다 컨슈머 그룹 이름이 다르다', () => {
    expect(consumerOf(event('queuing.member.joined'), 'cash').group).toBe(
      'CashEventListener__handleMemberJoined__1',
    )
    expect(consumerOf(event('queuing.seller.changed'), 'cash').group).toBe(
      'CashEventListener__handleSellerChanged__1',
    )
  })

  it('재시도 횟수는 처음 시도를 뺀 횟수다', () => {
    const e = event('order.race.cancel')
    expect(consumerOf(e, 'order').retries).toBe(3)
    expect(consumerOf(e, 'payout').retries).toBe(3)
    expect(consumerOf(event('queuing.member.withdrawn'), 'board').retries).toBe(0)
  })
})

describe('highlight', () => {
  const joined = event('queuing.member.joined')

  it('아무것도 고르지 않으면 모든 줄을 보이고 선은 강조하지 않는다', () => {
    expect(highlight(null, joined)).toEqual({ row: true, from: [], to: [] })
  })

  it('보내는 서비스를 고르면 그 서비스의 선과 받는 쪽 선을 모두 강조한다', () => {
    expect(highlight({ kind: 'service', id: 'member' }, joined)).toEqual({
      row: true,
      from: ['member'],
      to: ['cash', 'product', 'board'],
    })
  })

  it('받는 서비스를 고르면 보내는 쪽 선과 그 서비스로 가는 선만 강조한다', () => {
    expect(highlight({ kind: 'service', id: 'product' }, joined)).toEqual({
      row: true,
      from: ['member'],
      to: ['product'],
    })
  })

  it('상관없는 서비스를 고르면 그 줄을 흐리게 한다', () => {
    expect(highlight({ kind: 'service', id: 'file' }, joined).row).toBe(false)
  })

  it('토픽을 고르면 그 줄의 선을 모두 강조하고 다른 줄은 흐리게 한다', () => {
    expect(highlight({ kind: 'topic', topic: joined.topic }, joined)).toEqual({
      row: true,
      from: ['member'],
      to: ['cash', 'product', 'board'],
    })
    expect(highlight({ kind: 'topic', topic: 'order.race.cancel' }, joined).row).toBe(false)
  })

  it('아웃박스를 고르면 아웃박스로 보내는 선만 강조한다', () => {
    const fileLink = event('race.filelink.requested')
    expect(highlight({ kind: 'outbox' }, fileLink)).toEqual({
      row: true,
      from: ['product'],
      to: ['file'],
    })
    const notice = event('push.notification.requested')
    expect(highlight({ kind: 'outbox' }, notice).row).toBe(false)
  })
})
