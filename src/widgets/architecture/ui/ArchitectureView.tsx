'use client'

import { Card, Tabs } from '@heroui/react'
import { useState } from 'react'

import {
  BASED_ON,
  connectionsOf,
  SERVICES,
  type KafkaEvent,
  type ServiceId,
} from '@/entities/architecture'
import { formatMonthDay } from '@/shared/lib/date'

import { EventFlow } from './EventFlow'
import { KafkaLayout } from './KafkaLayout'
import { RequestFlow } from './RequestFlow'
import { ServiceCalls } from './ServiceCalls'

const LABEL = Object.fromEntries(SERVICES.map((s) => [s.id, s.label])) as Record<ServiceId, string>
const names = (list: ServiceId[]) => list.map((id) => LABEL[id]).join(', ')

const VIEWS = [
  { id: 'request', title: '요청 흐름', Diagram: RequestFlow },
  { id: 'calls', title: '서비스 호출', Diagram: ServiceCalls },
  { id: 'events', title: '이벤트 흐름', Diagram: EventFlow },
  { id: 'kafka', title: 'Kafka 구성', Diagram: KafkaLayout },
] as const

/** 목적이 다른 그림 네 장을 탭으로 나눈다. 고른 서비스는 탭을 바꿔도 유지되고, 아래 카드에 자세히 나온다. */
export function ArchitectureView() {
  const [selected, setSelected] = useState<ServiceId | null>(null)
  const toggle = (id: ServiceId) => setSelected((cur) => (cur === id ? null : id))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">아키텍처</h2>
        <p className="text-sm text-muted">
          백엔드 {BASED_ON.branch} 브랜치 {BASED_ON.commit} · {formatMonthDay(BASED_ON.date)} 기준
        </p>
      </div>

      <Tabs className="w-full">
        <Tabs.ListContainer className="w-fit max-w-full">
          <Tabs.List aria-label="그림">
            {VIEWS.map((v) => (
              <Tabs.Tab key={v.id} id={v.id} className="whitespace-nowrap">
                {v.title}
                <Tabs.Indicator />
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
        {VIEWS.map(({ id, Diagram }) => (
          <Tabs.Panel key={id} id={id} className="pt-4">
            <Card>
              <Card.Content>
                <Diagram selected={selected} onSelect={toggle} />
              </Card.Content>
            </Card>
          </Tabs.Panel>
        ))}
      </Tabs>

      {selected && <ServiceDetail id={selected} />}
    </div>
  )
}

function ServiceDetail({ id }: { id: ServiceId }) {
  const s = SERVICES.find((x) => x.id === id)!
  const c = connectionsOf(id)
  const rows: [string, React.ReactNode][] = [
    ['게이트웨이 주소', <Mono key="p" items={s.paths} />],
    ['포트', s.port],
    ['저장소', s.stores.join(', ')],
    ['HTTP로 부르는 서비스', names(s.calls) || '없음'],
    ['이 서비스를 부르는 서비스', names(c.calledBy) || '없음'],
    ['바깥 시스템', s.external.join(', ') || '없음'],
    ['보내는 이벤트', <Topics key="s" events={c.sends} />],
    ['받는 이벤트', <Topics key="r" events={c.receives} />],
  ]
  return (
    <Card>
      <Card.Header>
        <Card.Title>{s.label} 서비스</Card.Title>
        {s.note && <Card.Description>{s.note}</Card.Description>}
      </Card.Header>
      <Card.Content>
        <dl className="grid gap-x-6 gap-y-3 text-sm md:grid-cols-[12rem_1fr]">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </Card.Content>
    </Card>
  )
}

function Mono({ items }: { items: string[] }) {
  return <span className="font-mono">{items.join(', ')}</span>
}

function Topics({ events }: { events: KafkaEvent[] }) {
  if (events.length === 0) return '없음'
  return (
    <ul className="flex flex-col gap-1">
      {events.map((e) => (
        <li key={e.topic}>
          <span className="font-mono">{e.topic}</span>{' '}
          <span className="text-muted">· {e.meaning}</span>
        </li>
      ))}
    </ul>
  )
}
