import { EVENTS, SERVICES, type KafkaEvent, type ServiceId } from '../data'

/** 서비스 하나를 중심으로 HTTP 호출과 이벤트를 주고받는 상대를 모은다. */
export function connectionsOf(id: ServiceId): {
  calledBy: ServiceId[]
  sends: KafkaEvent[]
  receives: KafkaEvent[]
} {
  return {
    calledBy: SERVICES.filter((s) => s.calls.includes(id)).map((s) => s.id),
    sends: EVENTS.filter((e) => e.from.includes(id)),
    receives: EVENTS.filter((e) => e.to.includes(id)),
  }
}
