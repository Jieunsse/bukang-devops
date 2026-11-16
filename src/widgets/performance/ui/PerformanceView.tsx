'use client'

import { Card, Table } from '@heroui/react'
import { cardVariants } from '@heroui/styles'
import { useState } from 'react'

import {
  CLUES,
  CONCLUSIONS,
  CONDITIONS,
  LOAD,
  MEASURED_AT,
  SMOKE,
  type LoadResult,
  type ServiceId,
} from '@/entities/performance'
import { CollapseButton, PageToolbar } from '@/shared/ui'

const READ_LIMIT = 300
const WRITE_LIMIT = 1000
const FAIL_LIMIT = 1

export function formatMs(ms: number) {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
}

/** 기준을 넘은 값은 굵게만 표시한다. 상태 색은 기한에만 쓴다. */
function Value({ text, over }: { text: string; over: boolean }) {
  return <span className={over ? 'font-semibold' : 'text-muted'}>{text}</span>
}

/** 운영 서버 부하 테스트 결과. 결론을 먼저 보고, 서비스 카드를 눌러 그 서비스의 상세를 본다. */
export function PerformanceView() {
  const [selected, setSelected] = useState<ServiceId>('board')
  const result = LOAD.find((r) => r.id === selected)

  return (
    <div className="flex flex-col gap-6">
      <PageToolbar title="성능 측정" summary={`${MEASURED_AT} 운영 서버 · 목표 부하 5분`} />

      <Card>
        <Card.Header>
          <Card.Title className="text-base font-semibold">결론</Card.Title>
        </Card.Header>
        <Card.Content>
          <ul className="flex list-disc flex-col gap-1.5 pl-5">
            {CONCLUSIONS.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </Card.Content>
      </Card>

      <ServiceCards selected={selected} onSelect={setSelected} />

      {result && (
        <section aria-label={`${result.name} 상세`} className="flex flex-col gap-4">
          <h3 className="text-base font-semibold">{result.name} 상세</h3>
          <ServiceDetail result={result} />
        </section>
      )}

      <Card>
        <Card.Header>
          <Card.Title className="text-base font-semibold">개선 논의 때 확인할 것</Card.Title>
        </Card.Header>
        <Card.Content>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
            {CLUES.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </Card.Content>
      </Card>

      <Folded title="측정 조건" hint={`대상·기준 등 ${CONDITIONS.length}가지`}>
        <Card>
          <Card.Content>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-[8rem_1fr]">
              {CONDITIONS.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-muted">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </Card.Content>
        </Card>
      </Folded>

      <Folded title="스크립트 확인 (smoke)" hint="초당 1번 30초, 성능 판단에는 쓰지 않아요">
        <SmokeTable />
      </Folded>
    </div>
  )
}

function Folded({
  title,
  hint,
  children,
}: {
  title: string
  hint: string
  children: React.ReactNode
}) {
  const [isOpen, setOpen] = useState(false)
  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <h3>
        <CollapseButton isOpen={isOpen} onToggle={() => setOpen(!isOpen)}>
          {title}
          <span className="text-sm font-normal text-muted">{hint}</span>
        </CollapseButton>
      </h3>
      {isOpen && children}
    </section>
  )
}

/** 서비스마다 조회 p95를 크게 보여 준다. 누르면 아래 상세가 그 서비스로 바뀐다. */
function ServiceCards({
  selected,
  onSelect,
}: {
  selected: ServiceId
  onSelect: (id: ServiceId) => void
}) {
  const card = cardVariants()
  return (
    <div role="group" aria-label="서비스별 결과" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {LOAD.map((r) => {
        const isSelected = r.id === selected
        return (
          <button
            key={r.id}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelect(r.id)}
            className={card.base({
              className: `gap-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset ${isSelected ? 'ring-2 ring-accent ring-inset' : 'hover:bg-default'}`,
            })}
          >
            <span className="font-semibold">{r.name}</span>
            <span className="text-sm text-muted">조회 p95</span>
            <span
              className={`text-3xl tabular-nums ${r.readP95 > READ_LIMIT ? 'font-semibold' : ''}`}
            >
              {formatMs(r.readP95)}
            </span>
            <span className="text-sm text-muted tabular-nums">
              실패 {r.failRate}% · 초당 {r.targetRps} → {r.actualRps}번
            </span>
            <span className="mt-1 text-sm">{r.verdict}</span>
          </button>
        )
      })}
    </div>
  )
}

function ServiceDetail({ result }: { result: LoadResult }) {
  const hasP99 = result.endpoints.some((e) => e.p99 !== undefined)
  return (
    <>
      <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
        {result.notes.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
      {result.timeline && (
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label={`${result.name} 시간 순서`} className="min-w-[36rem]">
              <Table.Header>
                <Table.Column isRowHeader className="w-32">
                  시각
                </Table.Column>
                <Table.Column>일어난 일</Table.Column>
              </Table.Header>
              <Table.Body>
                {result.timeline.map(([t, what]) => (
                  <Table.Row key={t} id={t}>
                    <Table.Cell className="text-muted tabular-nums">{t}</Table.Cell>
                    <Table.Cell>{what}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      )}
      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label={`${result.name} 주소별 응답 시간`} className="min-w-[44rem]">
            <Table.Header>
              <Table.Column isRowHeader>주소</Table.Column>
              <Table.Column>요청</Table.Column>
              <Table.Column>실패율</Table.Column>
              <Table.Column>중앙값</Table.Column>
              <Table.Column>p95</Table.Column>
              {hasP99 ? <Table.Column>p99</Table.Column> : null}
              <Table.Column>최대</Table.Column>
            </Table.Header>
            <Table.Body>
              {result.endpoints.map((e) => {
                const limit = e.path.startsWith('GET') ? READ_LIMIT : WRITE_LIMIT
                return (
                  <Table.Row key={e.path} id={e.path}>
                    <Table.Cell className="text-sm break-all">{e.path}</Table.Cell>
                    <Table.Cell className="tabular-nums">{e.requests.toLocaleString()}</Table.Cell>
                    <Table.Cell className="tabular-nums">
                      <Value text={`${e.failRate}%`} over={e.failRate >= FAIL_LIMIT} />
                    </Table.Cell>
                    <Table.Cell className="tabular-nums">{formatMs(e.p50)}</Table.Cell>
                    <Table.Cell className="tabular-nums">
                      <Value text={formatMs(e.p95)} over={e.p95 > limit} />
                    </Table.Cell>
                    {hasP99 ? (
                      <Table.Cell className="tabular-nums">
                        {e.p99 === undefined ? '-' : formatMs(e.p99)}
                      </Table.Cell>
                    ) : null}
                    <Table.Cell className="tabular-nums">{formatMs(e.max)}</Table.Cell>
                  </Table.Row>
                )
              })}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>
    </>
  )
}

function SmokeTable() {
  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content aria-label="스크립트 확인 결과" className="min-w-[40rem]">
          <Table.Header>
            <Table.Column isRowHeader>서비스</Table.Column>
            <Table.Column>요청</Table.Column>
            <Table.Column>실패</Table.Column>
            <Table.Column>조회 p95</Table.Column>
            <Table.Column>쓰기 p95</Table.Column>
            <Table.Column>중앙값</Table.Column>
            <Table.Column>판정</Table.Column>
          </Table.Header>
          <Table.Body>
            {SMOKE.map((s) => (
              <Table.Row key={s.name} id={s.name}>
                <Table.Cell className="font-medium">{s.name}</Table.Cell>
                <Table.Cell className="tabular-nums">{s.requests}</Table.Cell>
                <Table.Cell className="tabular-nums">{s.failed}</Table.Cell>
                <Table.Cell className="tabular-nums">
                  {s.readP95 === undefined ? (
                    '-'
                  ) : (
                    <Value text={formatMs(s.readP95)} over={s.readP95 > READ_LIMIT} />
                  )}
                </Table.Cell>
                <Table.Cell className="tabular-nums">
                  {s.writeP95 === undefined ? '-' : formatMs(s.writeP95)}
                </Table.Cell>
                <Table.Cell className="tabular-nums">
                  {s.p50 === undefined ? '-' : formatMs(s.p50)}
                </Table.Cell>
                <Table.Cell>{s.verdict}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  )
}
