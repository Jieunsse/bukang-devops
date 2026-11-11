'use client'

import {
  Card,
  Chip,
  EmptyState,
  Input,
  Table,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@heroui/react'
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
import { CollapseButton, PageToolbar } from '@/shared/ui'

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
const ALL = 'all'

/** 크루런 프론트 화면 주소마다 백엔드에 보내는 요청. 백엔드 팀원이 URI로 찾아보는 참고 페이지다. */
export function ApiFlowView() {
  const [view, setView] = useState<View>('screens')
  const [query, setQuery] = useState('')
  const groups = useMemo(() => screenGroups(), [])
  const apis = useMemo(() => apiRows(), [])
  const screenCount = groups.reduce((n, g) => n + g.rows.length, 0)

  return (
    <div className="flex flex-col gap-4">
      <PageToolbar
        title="API 흐름"
        summary={`화면 ${screenCount}개 · 요청 ${apis.length}종 · 프론트 ${FLOW_DATA.committedAt} 코드 기준(${FLOW_DATA.commit}${FLOW_DATA.dirty ? ', 커밋 안 한 변경 포함' : ''})`}
      />
      <CommonRules />
      <Tabs className="w-full" selectedKey={view} onSelectionChange={(key) => setView(key as View)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
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
          <TextField aria-label="찾기" value={query} onChange={setQuery} className="w-full sm:w-80">
            <Input placeholder="찾기: URI · 화면 · 서비스" />
          </TextField>
        </div>
        <Tabs.Panel id="screens" className="pt-4">
          <ScreenView groups={groups} query={query} />
        </Tabs.Panel>
        <Tabs.Panel id="apis" className="pt-4">
          <ApiView rows={apis} query={query} />
        </Tabs.Panel>
      </Tabs>
    </div>
  )
}

/** 규칙은 한 번 읽으면 되는 내용이라 처음에는 접어 둔다. */
function CommonRules() {
  const [isOpen, setOpen] = useState(false)
  return (
    <section aria-label="모든 화면에 같은 규칙" className="flex flex-col gap-2">
      <h3>
        <CollapseButton isOpen={isOpen} onToggle={() => setOpen(!isOpen)}>
          모든 화면에 같은 규칙
          <span className="text-sm font-normal text-muted">
            토큰 · 재발급 · 응답 형식 등 {COMMON_RULES.length}가지
          </span>
        </CollapseButton>
      </h3>
      {isOpen && (
        <Card>
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
      )}
    </section>
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

/** 묶음 하나씩 골라 본다. 찾기 칸에 글자가 있으면 모든 묶음에서 찾는다. */
function ScreenView({ groups, query }: { groups: ScreenGroupView[]; query: string }) {
  const [picked, setPicked] = useState(groups[0]?.id ?? '')
  const searching = query.trim() !== ''
  const rows = groups.flatMap((g) =>
    (searching || g.id === picked ? g.rows : [])
      .filter((r) => matches(query, r.route, r.name, ...r.calls.flatMap((c) => [c.key, c.service])))
      .map((r) => ({ ...r, group: g.title })),
  )
  const group = groups.find((g) => g.id === picked)

  return (
    <div className="flex flex-col gap-3">
      <ToggleButtonGroup
        aria-label="화면 묶음"
        size="sm"
        selectionMode="single"
        disallowEmptySelection
        isDisabled={searching}
        selectedKeys={[picked]}
        onSelectionChange={(keys) => setPicked(String([...keys][0]))}
        className="flex-wrap justify-start"
      >
        {groups.map((g) => (
          <ToggleButton key={g.id} id={g.id} className="gap-1.5">
            {g.title}
            <span className="text-muted tabular-nums">{g.rows.length}</span>
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      <p className="text-sm text-muted">
        {searching ? `모든 묶음에서 찾은 화면 ${rows.length}개` : group?.description}
      </p>
      {rows.length === 0 ? (
        <NoResult />
      ) : (
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="화면별 보내는 요청" className="min-w-[44rem] table-fixed">
              <Table.Header>
                <Table.Column isRowHeader className="w-56">
                  화면
                </Table.Column>
                <Table.Column>보내는 요청</Table.Column>
                <Table.Column className="w-24">서비스</Table.Column>
              </Table.Header>
              <Table.Body>
                {rows.map((r) => (
                  <Table.Row key={r.route} id={r.route}>
                    <Table.Cell className="py-2 align-top">
                      <span className="flex flex-col">
                        <span className="font-medium">{r.name}</span>
                        <span className="font-mono text-xs break-all text-muted">{r.route}</span>
                        {searching && <span className="text-xs text-muted">{r.group}</span>}
                      </span>
                    </Table.Cell>
                    <Table.Cell className="py-2 align-top">
                      {r.calls.length === 0 ? (
                        <span className="text-sm text-muted">
                          보내는 요청 없음{r.emptyNote && ` (${r.emptyNote})`}
                        </span>
                      ) : (
                        <ul className="flex flex-col gap-0.5">
                          {r.calls.map((c) => (
                            <li key={c.key}>
                              <CallText call={c} />
                            </li>
                          ))}
                        </ul>
                      )}
                    </Table.Cell>
                    <Table.Cell className="py-2 align-top text-sm text-muted">
                      {[...new Set(r.calls.map((c) => c.service))].join(' · ')}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      )}
    </div>
  )
}

/** 서비스를 골라 그 서비스 요청만 본다. 보내는 화면은 옆으로 이어 붙여 줄이 길어지지 않게 한다. */
function ApiView({ rows: all, query }: { rows: ApiRow[]; query: string }) {
  const [service, setService] = useState(ALL)
  const services = [...new Set(all.map((r) => r.service))]
  const rows = all.filter(
    (r) =>
      (service === ALL || r.service === service) &&
      matches(query, r.key, r.service, ...r.screens.flatMap((s) => [s.route, s.name])),
  )

  return (
    <div className="flex flex-col gap-3">
      <ToggleButtonGroup
        aria-label="서비스"
        size="sm"
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={[service]}
        onSelectionChange={(keys) => setService(String([...keys][0]))}
        className="flex-wrap justify-start"
      >
        <ToggleButton id={ALL} className="gap-1.5">
          전체<span className="text-muted tabular-nums">{all.length}</span>
        </ToggleButton>
        {services.map((s) => (
          <ToggleButton key={s} id={s} className="gap-1.5">
            {s}
            <span className="text-muted tabular-nums">
              {all.filter((r) => r.service === s).length}
            </span>
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      {rows.length === 0 ? (
        <NoResult />
      ) : (
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="API별 보내는 화면" className="min-w-[44rem] table-fixed">
              <Table.Header>
                <Table.Column isRowHeader className="w-[45%]">
                  요청
                </Table.Column>
                <Table.Column className="w-24">서비스</Table.Column>
                <Table.Column>보내는 화면</Table.Column>
              </Table.Header>
              <Table.Body>
                {rows.map((r) => (
                  <Table.Row key={r.key} id={r.key}>
                    <Table.Cell className="py-2 align-top">
                      <CallText call={r} />
                    </Table.Cell>
                    <Table.Cell className="py-2 align-top text-sm whitespace-nowrap text-muted">
                      {r.service}
                    </Table.Cell>
                    <Table.Cell className="py-2 align-top">
                      <ul className="flex flex-wrap gap-1">
                        {r.screens.map((s) => (
                          <li key={s.route}>
                            <Chip size="sm" title={s.route}>
                              {s.name}
                              <span className="sr-only"> ({s.route})</span>
                            </Chip>
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
      )}
    </div>
  )
}
