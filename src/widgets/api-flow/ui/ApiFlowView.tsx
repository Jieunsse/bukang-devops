'use client'

import { useMemo, useState } from 'react'

import {
  apiRows,
  FLOW_DATA,
  matches,
  screenGroups,
  type ApiCall,
  type ApiRow,
  type ScreenRow,
} from '@/entities/api-flow'
import {
  Fact,
  report as s,
  ReportHeader,
  ReportLayout,
  ReportSection,
  type ReportTocGroup,
} from '@/shared/ui'

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

/** 목차 키: 개요, 화면 묶음(g:묶음 id), 서비스(s:서비스 이름, s:all은 전체) */
type Section = 'overview' | `g:${string}` | `s:${string}`

/** 크루런 프론트 화면 주소마다 백엔드에 보내는 요청. 리포트 아티팩트와 같은 틀(왼쪽 목차 + 본문)로 보여 준다. */
export function ApiFlowView() {
  const [section, setSection] = useState<Section>('overview')
  const [query, setQuery] = useState('')
  const groups = useMemo(() => screenGroups(), [])
  const apis = useMemo(() => apiRows(), [])
  const services = useMemo(() => [...new Set(apis.map((r) => r.service))], [apis])
  const screenCount = groups.reduce((n, g) => n + g.rows.length, 0)
  const searching = query.trim() !== ''

  const toc: ReportTocGroup<Section>[] = [
    { group: '요약', items: [{ id: 'overview', label: '개요' }] },
    {
      group: '화면 묶음',
      items: groups.map((g) => ({
        id: `g:${g.id}` as const,
        label: g.title,
        note: `${g.rows.length}`,
      })),
    },
    {
      group: '서비스별 API',
      items: [
        { id: 's:all' as const, label: '전체', note: `${apis.length}` },
        ...services.map((sv) => ({
          id: `s:${sv}` as const,
          label: sv,
          note: `${apis.filter((r) => r.service === sv).length}`,
        })),
      ],
    },
  ]

  const group = section.startsWith('g:') ? groups.find((g) => `g:${g.id}` === section) : undefined
  const service = section.startsWith('s:') ? section.slice(2) : undefined

  return (
    <ReportLayout
      label="API 명세 목차"
      toc={toc}
      current={section}
      onSelect={(id) => {
        setQuery('')
        setSection(id)
      }}
      tools={
        <input
          type="search"
          aria-label="찾기"
          placeholder="찾기: URI · 화면 · 서비스"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={s.search}
        />
      }
    >
      {searching ? (
        <SearchResult query={query} groups={groups} apis={apis} />
      ) : (
        <>
          {section === 'overview' && (
            <Overview
              screenCount={screenCount}
              apiCount={apis.length}
              serviceCount={services.length}
            />
          )}
          {group && (
            <>
              <ReportHeader title={group.title} sub={group.description} />
              <ScreenTable rows={group.rows} />
            </>
          )}
          {service && (
            <>
              <ReportHeader
                title={service === 'all' ? '전체 API' : `${service} API`}
                sub="요청 하나마다 그 요청을 보내는 화면을 모았어요. 화면 이름에 마우스를 올리면 주소가 보여요."
              />
              <ApiTable
                rows={service === 'all' ? apis : apis.filter((r) => r.service === service)}
              />
            </>
          )}
        </>
      )}
    </ReportLayout>
  )
}

function Overview({
  screenCount,
  apiCount,
  serviceCount,
}: {
  screenCount: number
  apiCount: number
  serviceCount: number
}) {
  return (
    <>
      <ReportHeader
        title="API 명세"
        sub={`프론트 ${FLOW_DATA.committedAt} 코드 기준 (${FLOW_DATA.commit}${FLOW_DATA.dirty ? ', 커밋 안 한 변경 포함' : ''})`}
      />
      <div className={s.lead}>
        <p>크루런 프론트 화면마다 백엔드에 보내는 요청과 받는 서비스를 모았어요.</p>
        <p>
          왼쪽에서 화면 묶음이나 서비스를 고르고, 위 찾기 칸으로 URI·화면·서비스를 한 번에 찾아요.
        </p>
      </div>
      <dl className={s.facts}>
        <Fact label="화면" value={`${screenCount}개`} />
        <Fact label="요청 종류" value={`${apiCount}종`} />
        <Fact label="서비스" value={`${serviceCount}개`} />
      </dl>
      <ReportSection
        title="모든 화면에 같은 규칙"
        description="화면마다 같은 내용이라 표에서는 뺐어요."
      >
        <dl className={s.checks}>
          {COMMON_RULES.map(([term, text]) => (
            <div key={term} className={s.check}>
              <dt>{term}</dt>
              <dd>{text}</dd>
            </div>
          ))}
        </dl>
      </ReportSection>
    </>
  )
}

/** 메서드는 굵은 글자로 구분한다 */
function CallText({ call }: { call: ApiCall }) {
  return (
    <span className={s.code}>
      <b className="inline-block w-14">{call.method}</b>
      {call.path}
      {call.note && <span className={`ml-2 ${s.muted}`}>({call.note})</span>}
    </span>
  )
}

function NoResult() {
  return (
    <div className={s.lead}>
      <p>찾는 요청이 없어요. URI 일부만 넣어 보세요. 예: wallets, crews</p>
    </div>
  )
}

function ScreenTable({
  rows,
  showGroup,
}: {
  rows: (ScreenRow & { group?: string })[]
  showGroup?: boolean
}) {
  if (rows.length === 0) return <NoResult />
  return (
    <div className={s.tbl}>
      <table aria-label="화면별 보내는 요청">
        <thead>
          <tr>
            <th className="w-56">화면</th>
            <th>보내는 요청</th>
            <th className="w-28">서비스</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.route}>
              <td>
                <b>{r.name}</b>
                <span className={`block break-all ${s.code} ${s.muted}`}>{r.route}</span>
                {showGroup && r.group && (
                  <span className={`block text-xs ${s.muted}`}>{r.group}</span>
                )}
              </td>
              <td>
                {r.calls.length === 0 ? (
                  <span className={s.muted}>
                    보내는 요청 없음{r.emptyNote && ` (${r.emptyNote})`}
                  </span>
                ) : (
                  <ul className="flex flex-col gap-0.5">
                    {r.calls.map((c) => (
                      <li key={c.key} className="break-all">
                        <CallText call={c} />
                      </li>
                    ))}
                  </ul>
                )}
              </td>
              <td className={s.muted}>{[...new Set(r.calls.map((c) => c.service))].join(' · ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ApiTable({ rows }: { rows: ApiRow[] }) {
  if (rows.length === 0) return <NoResult />
  return (
    <div className={s.tbl}>
      <table aria-label="API별 보내는 화면">
        <thead>
          <tr>
            <th className="w-[45%]">요청</th>
            <th className="w-28">서비스</th>
            <th>보내는 화면</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <td className="break-all">
                <CallText call={r} />
              </td>
              <td className={s.muted}>{r.service}</td>
              <td>
                <ul className={s.tags}>
                  {r.screens.map((sc) => (
                    <li key={sc.route} className={s.tag} title={sc.route}>
                      {sc.name}
                      <span className="sr-only"> ({sc.route})</span>
                    </li>
                  ))}
                </ul>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** 찾기 칸에 글자가 있으면 모든 묶음과 모든 서비스에서 찾는다 */
function SearchResult({
  query,
  groups,
  apis,
}: {
  query: string
  groups: ReturnType<typeof screenGroups>
  apis: ApiRow[]
}) {
  const screens = groups.flatMap((g) =>
    g.rows
      .filter((r) => matches(query, r.route, r.name, ...r.calls.flatMap((c) => [c.key, c.service])))
      .map((r) => ({ ...r, group: g.title })),
  )
  const found = apis.filter((r) =>
    matches(query, r.key, r.service, ...r.screens.flatMap((sc) => [sc.route, sc.name])),
  )
  return (
    <>
      <ReportHeader
        title={`「${query.trim()}」 찾기`}
        sub={`화면 ${screens.length}개 · 요청 ${found.length}종`}
      />
      <ReportSection title="화면">
        <ScreenTable rows={screens} showGroup />
      </ReportSection>
      <ReportSection title="요청">
        <ApiTable rows={found} />
      </ReportSection>
    </>
  )
}
