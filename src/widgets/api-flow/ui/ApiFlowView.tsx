'use client'

import { Card, EmptyState, Input, Label, Table, Tabs, TextField } from '@heroui/react'
import { useMemo, useState } from 'react'

import {
  apiRows,
  FLOW_DATA,
  matches,
  screenGroups,
  type ApiCall,
  type ApiRow,
  type ScreenGroupView,
} from '@/entities/api-flow'
import { PageToolbar } from '@/shared/ui'

/** 표 위에 한 번만 적는 규칙. 화면마다 같은 내용이라 표에서는 뺐다. */
const COMMON_RULES: [string, string][] = [
  [
    '요청 주소',
    '화면 코드는 항상 상대 주소 /api/...로 불러요. 로컬 · Vercel은 Next.js 설정(rewrites)이, AWS는 Nginx가 게이트웨이(8000)로 넘겨요.',
  ],
  [
    '서비스 나누기',
    '게이트웨이가 주소의 서비스 마디로 서비스를 골라요. /api/v1/member/** 와 /api/v1/auth/** 는 회원 서비스, product · order · cash · payout · file · queue · notification은 같은 이름의 서비스로 가요.',
  ],
  [
    '로그인 정보',
    'Access Token을 Authorization: Bearer 헤더로 붙여요. 게이트웨이가 토큰을 확인하고 X-Member-Id 헤더를 넣어 서비스로 보내요. 프론트는 X-Member-Id를 보내지 않아요.',
  ],
  [
    '토큰 재발급',
    '401을 받으면 POST /api/v1/auth/reissue를 한 번만 보내고, 원래 요청을 한 번 다시 보내요. 재발급도 실패하면 로그아웃 상태가 돼요. /api/v1/auth/... 요청의 401은 재발급하지 않아요.',
  ],
  [
    '앱을 켤 때 (모든 화면)',
    '새로고침하면 메모리의 토큰이 사라져요. 그래서 앱이 켜질 때 POST /api/v1/auth/reissue로 로그인을 되살리고, 성공하면 GET /api/v1/member/members/me로 내 정보를 미리 불러요. Refresh Token은 httpOnly 쿠키(Path=/api/v1/auth)라 프론트가 만지지 않아요.',
  ],
  [
    '응답 형식',
    '응답은 RsData { status, message, data, code }로 감싸서 받아요. 2xx가 아니면 message와 code로 오류 문구를 보여 줘요.',
  ],
  [
    '같은 요청 두 번 막기',
    '주문 만들기 · 장바구니 결제 · 대회 등록 · 예치금 환급은 Idempotency-Key 헤더를 붙여요. 두 번 누르거나 실패 뒤 다시 보내도 같은 키가 가요.',
  ],
  [
    '헤더 알림',
    '회원 화면과 로그인 · 가입 화면의 알림 배지가 GET /api/v1/notification/notifications를 30초마다 다시 불러요. 표에서는 알림 화면에만 적었어요.',
  ],
  [
    '대회 코스 이미지',
    '대회 상세 정보를 쓰는 화면은 GET /api/v1/file/files?refType=RaceCourse&refId={코스 ID}로 코스 이미지를 함께 불러요. 표에서는 뺐어요.',
  ],
  [
    '읽는 법',
    '「이동」은 fetch가 아니라 브라우저가 그 주소로 페이지를 옮기는 요청이에요. 화면을 열 때 부르는 요청과 버튼을 눌러야 나가는 요청을 함께 적었어요. 캐시만 고치는 코드는 요청으로 세지 않았어요.',
  ],
]

type View = 'screens' | 'apis'

/** 크루런 프론트 화면 주소마다 백엔드에 보내는 요청. 백엔드 팀원이 URI로 찾아보는 참고 페이지다. */
export function ApiFlowView() {
  const [view, setView] = useState<View>('screens')
  const [query, setQuery] = useState('')
  const groups = useMemo(() => screenGroups(), [])
  const apis = useMemo(() => apiRows(), [])
  const screenCount = groups.reduce((n, g) => n + g.rows.length, 0)

  return (
    <div className="flex flex-col gap-6">
      <PageToolbar
        title="API 흐름"
        summary={`화면 ${screenCount}개 · 요청 ${apis.length}종 · 프론트 ${FLOW_DATA.committedAt} 코드 기준(${FLOW_DATA.commit}${FLOW_DATA.dirty ? ', 커밋 안 한 변경 포함' : ''})`}
      />
      <CommonRules />
      <TextField value={query} onChange={setQuery} className="w-full sm:w-80">
        <Label>찾기</Label>
        <Input placeholder="URI · 화면 · 서비스" />
      </TextField>
      <Tabs className="w-full" selectedKey={view} onSelectionChange={(key) => setView(key as View)}>
        <Tabs.ListContainer className="w-fit">
          <Tabs.List aria-label="보는 방식">
            <Tabs.Tab id="screens" className="whitespace-nowrap">
              화면별
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="apis" className="whitespace-nowrap">
              API별
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
        <Tabs.Panel id="screens" className="pt-6">
          <ScreenTables groups={groups} query={query} />
        </Tabs.Panel>
        <Tabs.Panel id="apis" className="pt-6">
          <ApiTable rows={apis} query={query} />
        </Tabs.Panel>
      </Tabs>
    </div>
  )
}

function CommonRules() {
  return (
    <Card>
      <Card.Header>
        <Card.Title>모든 화면에 같은 규칙</Card.Title>
      </Card.Header>
      <Card.Content>
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[10rem_1fr]">
          {COMMON_RULES.map(([term, text]) => (
            <div key={term} className="contents">
              <dt className="font-medium">{term}</dt>
              <dd className="text-muted">{text}</dd>
            </div>
          ))}
        </dl>
      </Card.Content>
    </Card>
  )
}

function CallList({ calls, emptyNote }: { calls: ApiCall[]; emptyNote?: string }) {
  if (calls.length === 0) {
    return <span className="text-muted">보내는 요청 없음{emptyNote && ` (${emptyNote})`}</span>
  }
  return (
    <ul className="flex flex-col gap-1">
      {calls.map((c) => (
        <li key={c.key}>
          <CallText call={c} />
        </li>
      ))}
    </ul>
  )
}

/** 메서드는 굵은 글자로만 구분한다. 색은 기한 표시에만 쓰는 규칙이라 칠하지 않는다. */
function CallText({ call }: { call: ApiCall }) {
  return (
    <span className="font-mono text-xs break-all">
      <span className="inline-block w-14 font-semibold">{call.method}</span>
      {call.path}
      {call.note && <span className="ml-2 font-sans text-muted">({call.note})</span>}
    </span>
  )
}

function NoResult() {
  return (
    <EmptyState className="py-12">
      <p className="font-medium">찾는 요청이 없어요</p>
      <p className="text-sm text-muted">URI 일부만 넣어 보세요. 예: wallets, crews</p>
    </EmptyState>
  )
}

function ScreenTables({ groups, query }: { groups: ScreenGroupView[]; query: string }) {
  const shown = groups
    .map((g) => ({
      ...g,
      rows: g.rows.filter((r) =>
        matches(query, r.route, r.name, ...r.calls.flatMap((c) => [c.key, c.service])),
      ),
    }))
    .filter((g) => g.rows.length > 0)
  if (shown.length === 0) return <NoResult />
  return (
    <div className="flex flex-col gap-8">
      {shown.map((g) => (
        <section key={g.id} aria-label={g.title} className="flex flex-col gap-3">
          <div>
            <h3 className="font-semibold">{g.title}</h3>
            <p className="text-sm text-muted">{g.description}</p>
          </div>
          <Table>
            <Table.ScrollContainer>
              <Table.Content
                aria-label={`${g.title} 화면별 요청`}
                className="min-w-[48rem] table-fixed"
              >
                <Table.Header>
                  <Table.Column isRowHeader className="w-52">
                    화면 주소
                  </Table.Column>
                  <Table.Column className="w-40">화면</Table.Column>
                  <Table.Column>보내는 요청</Table.Column>
                  <Table.Column className="w-24">서비스</Table.Column>
                </Table.Header>
                <Table.Body>
                  {g.rows.map((r) => (
                    <Table.Row key={r.route} id={r.route}>
                      <Table.Cell className="align-top font-mono text-xs break-all">
                        {r.route}
                      </Table.Cell>
                      <Table.Cell className="align-top">{r.name}</Table.Cell>
                      <Table.Cell className="align-top">
                        <CallList calls={r.calls} emptyNote={r.emptyNote} />
                      </Table.Cell>
                      <Table.Cell className="align-top text-muted">
                        {[...new Set(r.calls.map((c) => c.service))].join(' · ')}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        </section>
      ))}
    </div>
  )
}

function ApiTable({ rows: all, query }: { rows: ApiRow[]; query: string }) {
  const rows = all.filter((r) =>
    matches(query, r.key, r.service, ...r.screens.flatMap((s) => [s.route, s.name])),
  )
  if (rows.length === 0) return <NoResult />
  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content aria-label="API별 보내는 화면" className="min-w-[48rem] table-fixed">
          <Table.Header>
            <Table.Column isRowHeader>요청</Table.Column>
            <Table.Column className="w-24">서비스</Table.Column>
            <Table.Column className="w-80">보내는 화면</Table.Column>
          </Table.Header>
          <Table.Body>
            {rows.map((r) => (
              <Table.Row key={r.key} id={r.key}>
                <Table.Cell className="align-top">
                  <CallText call={r} />
                </Table.Cell>
                <Table.Cell className="align-top text-muted">{r.service}</Table.Cell>
                <Table.Cell className="align-top">
                  <ul className="flex flex-col gap-1 text-sm">
                    {r.screens.map((s) => (
                      <li key={s.route}>
                        {s.name} <span className="font-mono text-xs text-muted">{s.route}</span>
                      </li>
                    ))}
                  </ul>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  )
}
