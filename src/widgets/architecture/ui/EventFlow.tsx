'use client'

import { useState } from 'react'

import { EVENTS, SERVICES, type KafkaEvent, type ServiceId } from '@/entities/architecture'

import {
  across,
  Arrowheads,
  Canvas,
  Edge,
  NodeBox,
  type Box,
  type EdgeTone,
  type Tone,
} from './diagram'

const W = 1040
const ROW = 48
const H = EVENTS.length * ROW + 16
const ARROW = 'evt'
const LABEL = Object.fromEntries(SERVICES.map((s) => [s.id, s.label])) as Record<ServiceId, string>

const EVT_X = 330
const EVT_W = 380
const EVT: Box[] = EVENTS.map((_, i) => ({ x: EVT_X, y: 8 + i * ROW, w: EVT_W, h: ROW - 8 }))

/** 보내는 쪽은 처음 보내는 이벤트 순서로, 받는 쪽은 받는 이벤트 줄의 평균 위치 순서로 놓아 선이 덜 엇갈리게 한다. */
function column(pick: (e: KafkaEvent) => ServiceId[], x: number): Map<ServiceId, Box> {
  const rows = new Map<ServiceId, number[]>()
  EVENTS.forEach((e, i) => pick(e).forEach((id) => rows.set(id, [...(rows.get(id) ?? []), i])))
  const ids = [...rows.keys()].sort((a, b) => avg(rows.get(a)!) - avg(rows.get(b)!))
  const h = 52
  return new Map(
    ids.map((id, i) => [id, { x, y: ((i + 0.5) * H) / ids.length - h / 2, w: 120, h }]),
  )
}
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length

const SENDERS = column((e) => e.from, 16)
const RECEIVERS = column((e) => e.to, W - 136)

const right = (b: Box) => [b.x + b.w, b.y + b.h / 2] as const
const left = (b: Box) => [b.x, b.y + b.h / 2] as const

/** 왼쪽 보내는 서비스 → 가운데 이벤트 → 오른쪽 받는 서비스 */
export function EventFlow({
  selected,
  onSelect,
}: {
  selected: ServiceId | null
  onSelect: (id: ServiceId) => void
}) {
  const [topic, setTopic] = useState<string | null>(null)
  // 이벤트를 고르면 그 이벤트만, 아니면 고른 서비스가 주고받는 이벤트를 강조한다.
  const hit = (e: KafkaEvent) =>
    topic ? e.topic === topic : !!selected && (e.from.includes(selected) || e.to.includes(selected))
  const anyFocus = topic !== null || selected !== null
  const focused = EVENTS.filter(hit)
  const edgeTone = (e: KafkaEvent): EdgeTone => (!anyFocus ? 'normal' : hit(e) ? 'active' : 'faded')
  const svcTone = (id: ServiceId): Tone =>
    !topic && id === selected
      ? 'selected'
      : !anyFocus || focused.some((e) => e.from.includes(id) || e.to.includes(id))
        ? 'normal'
        : 'faded'
  const pickService = (id: ServiceId) => {
    setTopic(null)
    onSelect(id)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-[1fr_auto_1fr] text-xs font-medium text-muted">
        <span>보내는 서비스</span>
        <span>이벤트 (누르면 그 흐름만 보여요)</span>
        <span className="text-right">받는 서비스</span>
      </div>
      <Canvas label="이벤트 흐름" width={W} height={H} minWidth="min-w-[56rem]">
        <Arrowheads prefix={ARROW} />
        {EVENTS.flatMap((e, i) => [
          ...e.from.map((id) => (
            <Edge
              key={`${id}>${e.topic}`}
              d={across(...right(SENDERS.get(id)!), ...left(EVT[i]!))}
              tone={edgeTone(e)}
            />
          )),
          ...e.to.map((id) => (
            <Edge
              key={`${e.topic}>${id}`}
              d={across(...right(EVT[i]!), ...left(RECEIVERS.get(id)!))}
              tone={edgeTone(e)}
              arrow={ARROW}
            />
          )),
        ])}
        {EVENTS.map((e, i) => {
          const b = EVT[i]!
          const tone: Tone =
            topic === e.topic ? 'selected' : !anyFocus || hit(e) ? 'normal' : 'faded'
          return (
            <g key={e.topic}>
              <NodeBox
                box={b}
                title={e.meaning}
                sub={e.topic}
                monoSub
                tone={tone}
                onClick={() => setTopic(topic === e.topic ? null : e.topic)}
              />
              {e.to.length === 0 && (
                <g className={tone === 'faded' ? 'opacity-30' : undefined}>
                  <Edge d={`M${b.x + b.w} ${b.y + b.h / 2} h36`} tone="normal" dashed />
                  <text
                    x={b.x + b.w + 42}
                    y={b.y + b.h / 2}
                    dominantBaseline="central"
                    className="fill-muted text-[11px]"
                  >
                    받는 곳 아직 없음
                  </text>
                </g>
              )}
            </g>
          )
        })}
        {[...SENDERS].map(([id, b]) => (
          <NodeBox
            key={`s-${id}`}
            box={b}
            title={LABEL[id]}
            tone={svcTone(id)}
            onClick={() => pickService(id)}
          />
        ))}
        {[...RECEIVERS].map(([id, b]) => (
          <NodeBox
            key={`r-${id}`}
            box={b}
            title={LABEL[id]}
            tone={svcTone(id)}
            onClick={() => pickService(id)}
          />
        ))}
      </Canvas>
    </div>
  )
}
