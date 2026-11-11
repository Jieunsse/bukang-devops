import { useLayoutEffect, useRef, useState } from 'react'

import {
  consumerOf,
  EVENTS,
  highlight,
  KAFKA_BROKER,
  senderPath,
  SERVICES,
  type KafkaFocus,
  type ServiceId,
} from '@/entities/architecture'

const LABEL = Object.fromEntries(SERVICES.map((s) => [s.id, s.label])) as Record<ServiceId, string>
const B = KAFKA_BROKER

const SPECS: [string, string, boolean?][] = [
  ['자원', B.resources],
  ['내부 주소', B.internal, true],
  ['외부 주소', B.external, true],
  ['복제본', `${B.replicas}개`],
  ['토픽 자동 생성', B.autoCreate ? '켜짐' : '꺼짐'],
]

type Wire = { d: string; hot: boolean; row: boolean; empty?: boolean }

/** 브로커 하나 안의 토픽을 한 줄씩: 보내는 서비스 → 토픽(파티션) → 받는 서비스. 서비스·토픽·아웃박스를 누르면 그 흐름만 강조한다. */
export function KafkaLayout({
  selected,
  onSelect,
}: {
  selected: ServiceId | null
  onSelect: (id: ServiceId) => void
}) {
  const [local, setLocal] = useState<KafkaFocus>(null)
  const focus: KafkaFocus = local ?? (selected ? { kind: 'service', id: selected } : null)
  // 토픽·아웃박스 고르기는 이 탭 안에서만 쓰고, 다른 탭과 함께 쓰는 서비스 고르기는 그대로 둔다
  const pickLocal = (f: Exclude<KafkaFocus, null>) => {
    setLocal((cur) => (JSON.stringify(cur) === JSON.stringify(f) ? null : f))
  }
  const pickService = (id: ServiceId) => {
    setLocal(null)
    // 토픽·아웃박스를 보던 중 이미 고른 서비스를 누르면 풀지 않고 그 서비스 강조로 돌아간다
    if (!(local && selected === id)) onSelect(id)
  }
  const reset = () => {
    setLocal(null)
    if (selected) onSelect(selected)
  }

  const flowRef = useRef<HTMLDivElement>(null)
  const [wires, setWires] = useState<Wire[]>([])
  const marks = EVENTS.map((e) => highlight(focus, e))
  const marksKey = JSON.stringify(marks)

  useLayoutEffect(() => {
    const flow = flowRef.current
    if (!flow) return
    const draw = () => {
      const base = flow.getBoundingClientRect()
      const mid = (r: DOMRect, side: 'l' | 'r'): [number, number] => [
        (side === 'l' ? r.left : r.right) - base.left,
        r.top + r.height / 2 - base.top,
      ]
      const curve = ([x1, y1]: [number, number], [x2, y2]: [number, number]) => {
        const mx = (x1 + x2) / 2
        return `M${x1} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2 - 4} ${y2}`
      }
      const next: Wire[] = []
      flow.querySelectorAll<HTMLElement>('[data-row]').forEach((row) => {
        const m = marks[Number(row.dataset.row)]!
        const topic = row.querySelector('[data-topic]')!.getBoundingClientRect()
        row.querySelectorAll<HTMLElement>('[data-from]').forEach((el) => {
          next.push({
            d: curve(mid(el.getBoundingClientRect(), 'r'), mid(topic, 'l')),
            hot: m.from.includes(el.dataset.from as ServiceId),
            row: m.row,
          })
        })
        row.querySelectorAll<HTMLElement>('[data-to]').forEach((el) => {
          next.push({
            d: curve(mid(topic, 'r'), mid(el.getBoundingClientRect(), 'l')),
            hot: m.to.includes(el.dataset.to as ServiceId),
            row: m.row,
            empty: el.dataset.to === '',
          })
        })
      })
      setWires(next)
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(flow)
    return () => ro.disconnect()
    // marks는 marksKey가 바뀔 때만 다시 그린다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marksKey])

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-[64rem] flex-col gap-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">
            {B.name} 브로커 {B.count}대
          </h3>
          <span className="font-mono text-xs text-muted">{B.version}</span>
          <div className="ml-auto text-xs text-muted">
            {focus ? (
              <button
                type="button"
                onClick={reset}
                className="rounded-lg border border-border bg-surface px-2.5 py-1 text-foreground outline-none hover:bg-default focus-visible:ring-2 focus-visible:ring-focus"
              >
                전체 보기
              </button>
            ) : (
              '서비스·토픽·아웃박스를 누르면 그 흐름만 보여요'
            )}
          </div>
        </div>

        <dl className="grid grid-cols-5 gap-2">
          {SPECS.map(([k, v, mono]) => (
            <div key={k} className="min-w-0 rounded-lg border border-border bg-surface px-3 py-2">
              <dt className="text-xs text-muted">{k}</dt>
              <dd className={`truncate text-sm font-medium ${mono ? 'font-mono' : ''}`}>{v}</dd>
            </div>
          ))}
        </dl>

        {focus?.kind === 'outbox' && <OutboxSteps />}

        <div ref={flowRef} className="relative">
          <svg
            aria-hidden
            className="pointer-events-none absolute inset-0 size-full overflow-visible"
          >
            {wires.map((w, i) => (
              <path
                key={i}
                d={w.d}
                fill="none"
                strokeWidth={w.hot ? 2 : 1.25}
                strokeDasharray={w.hot ? '6 5' : w.empty ? '3 3' : undefined}
                className={
                  w.hot
                    ? 'stroke-accent motion-safe:animate-[kafka-run_0.6s_linear_infinite]'
                    : `stroke-muted ${w.row ? 'opacity-50' : 'opacity-10'}`
                }
              />
            ))}
          </svg>
          <style>{'@keyframes kafka-run{to{stroke-dashoffset:-11}}'}</style>

          <div className={`${GRID} pb-1 text-xs text-muted`} aria-hidden>
            <span className="pr-12 text-right">보내는 서비스</span>
            <span>토픽 · 파티션</span>
            <span />
            <span className={RECV_GRID + ' px-3'}>
              <span>받는 서비스</span>
              <span>컨슈머 그룹</span>
              <span>처리에 실패하면</span>
            </span>
          </div>

          <ol aria-label="Kafka 토픽" className="flex flex-col">
            {EVENTS.map((e, i) => {
              const m = marks[i]!
              const topicOn = focus?.kind === 'topic' && focus.topic === e.topic
              return (
                <li
                  key={e.topic}
                  data-row={i}
                  className={`${GRID} py-2 transition-opacity ${m.row ? '' : 'opacity-25'}`}
                >
                  <div className="flex flex-col items-end gap-1.5 pr-12">
                    {e.from.map((id) => {
                      const outbox = senderPath(e, id) === 'outbox'
                      const on = selected === id && !local
                      return (
                        <div
                          key={id}
                          data-from={id}
                          className={`flex h-8 w-40 items-center justify-between rounded-lg border px-2.5 text-sm ${
                            on ? 'border-accent bg-accent-soft' : 'border-border bg-surface'
                          }`}
                        >
                          <button
                            type="button"
                            aria-pressed={on}
                            onClick={() => pickService(id)}
                            className="rounded outline-none hover:underline focus-visible:ring-2 focus-visible:ring-focus"
                          >
                            {LABEL[id]}
                          </button>
                          {outbox ? (
                            <button
                              type="button"
                              aria-pressed={focus?.kind === 'outbox'}
                              onClick={() => pickLocal({ kind: 'outbox' })}
                              className={`w-16 rounded-md border border-accent px-1.5 text-center text-xs outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                                focus?.kind === 'outbox'
                                  ? 'bg-accent text-accent-foreground'
                                  : 'bg-accent-soft text-accent hover:bg-accent hover:text-accent-foreground'
                              }`}
                            >
                              아웃박스
                            </button>
                          ) : (
                            <span className="w-16 rounded-md border border-border px-1.5 text-center text-xs text-muted">
                              바로 보냄
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  <button
                    type="button"
                    data-topic
                    aria-pressed={topicOn}
                    onClick={() => pickLocal({ kind: 'topic', topic: e.topic })}
                    className={`rounded-lg border bg-background px-3 py-2 text-left outline-none hover:bg-default focus-visible:ring-2 focus-visible:ring-focus ${
                      topicOn ? 'border-accent' : 'border-border'
                    }`}
                  >
                    <span className="block font-mono text-xs">{e.topic}</span>
                    <span className="block text-xs text-muted">{e.meaning}</span>
                    <span className="mt-1.5 flex items-center gap-2 font-mono text-[11px] text-muted">
                      {Array.from({ length: B.partitions }, (_, p) => (
                        <span key={p} className="rounded border border-border px-1.5">
                          파티션 {p}
                        </span>
                      ))}
                    </span>
                  </button>

                  <span />

                  <div className="flex flex-col gap-1.5">
                    {e.to.length === 0 && (
                      <span data-to="" className="w-fit text-xs text-muted">
                        받는 곳 아직 없음
                      </span>
                    )}
                    {e.to.map((id) => {
                      const c = consumerOf(e, id)
                      const on = selected === id && !local
                      return (
                        <button
                          key={id}
                          type="button"
                          data-to={id}
                          aria-pressed={on}
                          onClick={() => pickService(id)}
                          className={`${RECV_GRID} rounded-lg border px-3 py-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                            on
                              ? 'border-accent bg-accent-soft'
                              : 'border-border bg-surface hover:bg-default'
                          }`}
                        >
                          <span className="text-sm font-medium">{LABEL[id]}</span>
                          <span className="truncate font-mono text-xs text-muted" title={c.group}>
                            {c.group}
                          </span>
                          <span className="w-fit rounded-md border border-border px-2 text-xs text-muted">
                            {c.retries ? `${c.retries}번 더 시도 → 실패 토픽` : '재시도 없음'}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </li>
              )
            })}
          </ol>
        </div>

        <ul className="flex flex-col gap-1 rounded-lg bg-default px-3 py-2 text-xs">
          <li>
            파티션이 모두 {B.partitions}개 → 한 컨슈머 그룹 안에서는 쓰레드 하나만 읽어요. 순서는
            지켜지지만 몰리면 그대로 밀려요.
          </li>
          <li>
            브로커 {B.count}대·복제본 {B.replicas}개 → 브로커가 멈추면 전달이 멈추고, 디스크를
            잃으면 메시지도 사라져요.
          </li>
          <li>실패 토픽(DLT): 재시도를 다 해도 실패한 메시지가 모이는 토픽이에요.</li>
        </ul>
      </div>
    </div>
  )
}

const GRID = 'grid grid-cols-[13rem_22rem_5rem_minmax(0,1fr)] items-center'
const RECV_GRID = 'grid grid-cols-[5rem_minmax(0,1fr)_9rem] items-center gap-3'

const STEPS = [
  ['같이 저장', '바뀐 데이터와 보낼 이벤트를 한 트랜잭션으로 DB에 저장'],
  ['아웃박스 테이블', '아직 안 보낸 이벤트가 행으로 남음'],
  ['1초마다 꺼내 보냄', '스케줄러가 안 보낸 행을 읽어 토픽으로 보냄'],
  ['7일 뒤 정리', '보낸 지 7일 지난 행은 새벽 4시에 지움'],
]

function OutboxSteps() {
  return (
    <section className="rounded-lg border border-accent bg-accent-soft px-4 py-3">
      <h4 className="mb-2 text-sm font-semibold">아웃박스로 보내는 순서 (회원 서비스 기준)</h4>
      <ol className="grid grid-cols-4 gap-2">
        {STEPS.map(([t, d], i) => (
          <li key={t} className="rounded-lg border border-border bg-surface px-3 py-2 text-xs">
            <p className="font-medium">
              {i + 1}. {t}
            </p>
            <p className="text-muted">{d}</p>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-xs text-muted">
        DB 저장과 이벤트가 함께 성공하거나 함께 실패해요 → 저장은 됐는데 이벤트가 빠지는 일이
        없어요. 「바로 보냄」은 아웃박스 없이 바로 토픽으로 보내요.
      </p>
    </section>
  )
}
