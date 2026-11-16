'use client'

import { Card, Table, Tabs } from '@heroui/react'

import {
  BOTTLENECK,
  CLUES,
  CONDITIONS,
  LOAD,
  MEASURED_AT,
  SMOKE,
  type LoadResult,
} from '@/entities/performance'
import { PageToolbar } from '@/shared/ui'

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

/** 운영 서버 부하 테스트 결과. 서비스별로 기준을 넘었는지, 어디서 막혔는지 보는 기록 페이지다. */
export function PerformanceView() {
  return (
    <div className="flex flex-col gap-6">
      <PageToolbar title="성능 측정" summary={`${MEASURED_AT} 운영 서버 · 회원 · 크루 · 게시판`} />

      <Card>
        <Card.Header>
          <Card.Title className="text-base font-semibold">측정 조건</Card.Title>
        </Card.Header>
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

      <section className="flex flex-col gap-3">
        <h3 className="text-base font-semibold">목표 부하 5분 (load)</h3>
        <p className="text-sm text-muted">{BOTTLENECK}</p>
        <LoadSummary />
        <Tabs className="w-full">
          <Tabs.ListContainer className="w-fit">
            <Tabs.List aria-label="서비스">
              {LOAD.map((r) => (
                <Tabs.Tab key={r.id} id={r.id} className="whitespace-nowrap">
                  {r.name}
                  <Tabs.Indicator />
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs.ListContainer>
          {LOAD.map((r) => (
            <Tabs.Panel key={r.id} id={r.id} className="pt-4">
              <ServiceDetail result={r} />
            </Tabs.Panel>
          ))}
        </Tabs>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-base font-semibold">스크립트 확인 (smoke, 초당 1번 30초)</h3>
        <p className="text-sm text-muted">요청 수가 적어서 성능을 판단하는 값으로 쓰지 않아요.</p>
        <SmokeTable />
      </section>

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
    </div>
  )
}

function LoadSummary() {
  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content aria-label="서비스별 결과" className="min-w-[44rem]">
          <Table.Header>
            <Table.Column isRowHeader>서비스</Table.Column>
            <Table.Column>초당 반복 (목표 → 실제)</Table.Column>
            <Table.Column>요청</Table.Column>
            <Table.Column>실패율</Table.Column>
            <Table.Column>조회 p95</Table.Column>
            <Table.Column>쓰기 p95</Table.Column>
            <Table.Column>판정</Table.Column>
          </Table.Header>
          <Table.Body>
            {LOAD.map((r) => (
              <Table.Row key={r.id} id={r.id}>
                <Table.Cell className="font-medium">{r.name}</Table.Cell>
                <Table.Cell className="tabular-nums">
                  {r.targetRps} → {r.actualRps}
                </Table.Cell>
                <Table.Cell className="tabular-nums">{r.requests.toLocaleString()}</Table.Cell>
                <Table.Cell className="tabular-nums">
                  <Value text={`${r.failRate}%`} over={r.failRate >= FAIL_LIMIT} />
                </Table.Cell>
                <Table.Cell className="tabular-nums">
                  <Value text={formatMs(r.readP95)} over={r.readP95 > READ_LIMIT} />
                </Table.Cell>
                <Table.Cell className="tabular-nums">
                  <Value text={formatMs(r.writeP95)} over={r.writeP95 > WRITE_LIMIT} />
                </Table.Cell>
                <Table.Cell>{r.verdict}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  )
}

function ServiceDetail({ result }: { result: LoadResult }) {
  const hasP99 = result.endpoints.some((e) => e.p99 !== undefined)
  return (
    <div className="flex flex-col gap-4">
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
                    <Table.Cell className="font-mono text-xs break-all">{e.path}</Table.Cell>
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
      <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
        {result.notes.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
    </div>
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
