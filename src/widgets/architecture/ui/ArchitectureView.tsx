'use client'

import { Card, Chip, Table } from '@heroui/react'
import { buttonVariants } from '@heroui/styles'
import { useState } from 'react'

import {
  BASED_ON,
  connectionsOf,
  EVENTS,
  SERVICES,
  type KafkaEvent,
  type ServiceId,
} from '@/entities/architecture'
import { formatMonthDay } from '@/shared/lib/date'

const LABEL = Object.fromEntries(SERVICES.map((s) => [s.id, s.label])) as Record<ServiceId, string>
const names = (list: ServiceId[]) => list.map((id) => LABEL[id]).join(', ')
const EXTERNAL = [...new Set(SERVICES.flatMap((s) => s.external))]

const STORES = [
  { name: 'MySQL 8.4', note: 'DB 하나를 같이 쓰고, 테이블 이름 앞부분으로 서비스를 나눠요' },
  { name: 'Kafka (Redpanda)', note: '서비스끼리 이벤트를 주고받아요' },
  { name: 'Redis', note: '대기열 순번, 로그인 토큰, 잠깐 쓰는 값' },
  { name: 'Elasticsearch (nori)', note: '대회 검색' },
  { name: 'S3 (s3mock)', note: '올린 이미지 파일' },
]

/** 요청이 들어오는 길부터 저장소까지 한 화면에서 따라가 본다. 서비스를 누르면 연결만 모아 보여 준다. */
export function ArchitectureView() {
  const [selected, setSelected] = useState<ServiceId>(SERVICES[0]!.id)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">아키텍처</h2>
        <p className="text-sm text-muted">
          백엔드 {BASED_ON.branch} 브랜치 {BASED_ON.commit} · {formatMonthDay(BASED_ON.date)} 기준
        </p>
      </div>

      <Card>
        <Card.Header>
          <Card.Title>전체 구조</Card.Title>
          <Card.Description>위에서 아래로 요청이 흘러가요.</Card.Description>
        </Card.Header>
        <Card.Content className="flex flex-col gap-2">
          <Layer title="들어오는 길">
            <Box name="브라우저" />
            <Box name="Nginx" note="HTTPS 인증서(certbot)" />
            <Box name="웹 화면" note="Next.js" />
            <Box name="게이트웨이 :8000" note="토큰을 확인하고 주소에 맞는 서비스로 넘겨요" />
          </Layer>
          <Arrow />
          <Layer title="서비스">
            {SERVICES.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={s.id === selected}
                onClick={() => setSelected(s.id)}
                className={buttonVariants({
                  variant: s.id === selected ? 'secondary' : 'outline',
                  size: 'sm',
                })}
              >
                {s.label}
              </button>
            ))}
          </Layer>
          <Arrow />
          <Layer title="저장소·메시지">
            {STORES.map((s) => (
              <Box key={s.name} name={s.name} note={s.note} />
            ))}
          </Layer>
          <Arrow />
          <Layer title="바깥 시스템">
            {EXTERNAL.map((e) => (
              <Box key={e} name={e} />
            ))}
          </Layer>
        </Card.Content>
      </Card>

      <ServiceDetail id={selected} />
      <EventTable />
    </div>
  )
}

function Layer({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      aria-label={title}
      className="flex flex-col gap-2 rounded-xl bg-background-secondary p-3 md:flex-row md:items-center"
    >
      <h3 className="shrink-0 text-sm font-semibold md:w-28">{title}</h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  )
}

function Box({ name, note }: { name: string; note?: string }) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
      <p className="font-medium">{name}</p>
      {note && <p className="text-xs text-muted">{note}</p>}
    </div>
  )
}

function Arrow() {
  return (
    <p aria-hidden className="text-center text-muted">
      ↓
    </p>
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

function EventTable() {
  return (
    <Card>
      <Card.Header>
        <Card.Title>이벤트 흐름 (Kafka)</Card.Title>
      </Card.Header>
      <Card.Content>
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="이벤트 흐름" className="min-w-[44rem]">
              <Table.Header>
                <Table.Column isRowHeader>토픽</Table.Column>
                <Table.Column>뜻</Table.Column>
                <Table.Column>보내는 곳</Table.Column>
                <Table.Column>받는 곳</Table.Column>
              </Table.Header>
              <Table.Body>
                {EVENTS.map((e) => (
                  <Table.Row key={e.topic} id={e.topic}>
                    <Table.Cell className="font-mono">{e.topic}</Table.Cell>
                    <Table.Cell>{e.meaning}</Table.Cell>
                    <Table.Cell>{names(e.from) || <None />}</Table.Cell>
                    <Table.Cell>{names(e.to) || <None />}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      </Card.Content>
    </Card>
  )
}

function None() {
  return (
    <Chip size="sm" variant="soft">
      아직 없음
    </Chip>
  )
}
