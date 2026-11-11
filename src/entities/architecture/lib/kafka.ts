import { CASH_GROUPS, CONSUMERS, type Consumer, type KafkaEvent, type ServiceId } from '../data'

export type KafkaFocus =
  { kind: 'service'; id: ServiceId } | { kind: 'topic'; topic: string } | { kind: 'outbox' } | null

export function senderPath(e: KafkaEvent, id: ServiceId): 'outbox' | 'direct' {
  return e.direct?.includes(id) ? 'direct' : 'outbox'
}

export function consumerOf(e: KafkaEvent, id: ServiceId): Consumer {
  const c = CONSUMERS[id] ?? { group: '', retries: 0 }
  return id === 'cash' ? { ...c, group: CASH_GROUPS[e.topic] ?? '' } : c
}

/** 고른 것에 따라 이 토픽 줄을 보일지(row), 어느 보내는·받는 선을 강조할지 정한다. */
export function highlight(
  focus: KafkaFocus,
  e: KafkaEvent,
): { row: boolean; from: ServiceId[]; to: ServiceId[] } {
  if (!focus) return { row: true, from: [], to: [] }
  if (focus.kind === 'topic') {
    return focus.topic === e.topic
      ? { row: true, from: e.from, to: e.to }
      : { row: false, from: [], to: [] }
  }
  if (focus.kind === 'outbox') {
    const from = e.from.filter((id) => senderPath(e, id) === 'outbox')
    return from.length ? { row: true, from, to: e.to } : { row: false, from: [], to: [] }
  }
  // 고른 서비스 자신의 선과, 그 서비스 반대편의 선을 모두 강조한다
  const sends = e.from.includes(focus.id)
  const receives = e.to.includes(focus.id)
  if (!sends && !receives) return { row: false, from: [], to: [] }
  return {
    row: true,
    from: receives ? e.from : [focus.id],
    to: sends ? e.to : [focus.id],
  }
}
