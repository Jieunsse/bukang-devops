import { EVENTS, SERVICES, type Service, type ServiceId } from '@/entities/architecture'

import {
  Arrowheads,
  Canvas,
  down,
  Edge,
  NodeBox,
  type Box,
  type EdgeTone,
  type Tone,
} from './diagram'

const W = 1200
const H = 600
const ARROW = 'req'

const STORES = [
  { id: 'MySQL', title: 'MySQL 8.4', sub: 'DB 하나를 함께 씀' },
  { id: 'Redis', title: 'Redis', sub: '대기열 순번·토큰' },
  { id: 'Elasticsearch', title: 'Elasticsearch', sub: '대회 검색(nori)' },
  { id: 'S3', title: 'S3 (s3mock)', sub: '이미지 파일' },
  { id: 'Kafka', title: 'Kafka (Redpanda)', sub: '서비스 사이 이벤트' },
] as const

const EXTERNAL = [...new Set(SERVICES.flatMap((s) => s.external))]

/** 가로 한 줄에 n개를 같은 간격으로 놓는다. */
function row(n: number, w: number, y: number, h: number): Box[] {
  const gap = (W - 32 - n * w) / (n - 1)
  return Array.from({ length: n }, (_, i) => ({ x: 16 + i * (w + gap), y, w, h }))
}

const BROWSER: Box = { x: 260, y: 16, w: 160, h: 48 }
const NGINX: Box = { x: 520, y: 16, w: 160, h: 48 }
const WEB: Box = { x: 780, y: 16, w: 160, h: 48 }
const GATEWAY: Box = { x: 16, y: 120, w: W - 32, h: 52 }
const SVC = row(SERVICES.length, 104, 240, 48)
const STORE = row(STORES.length, 200, 370, 52)
const EXT = row(EXTERNAL.length, 156, 520, 52)
/** 서비스 줄 아래에 모든 서비스를 한 줄로 모으는 높이 */
const BUS = 324

const usesKafka = (id: ServiceId) => EVENTS.some((e) => e.from.includes(id) || e.to.includes(id))
const storesOf = (s: Service): string[] => [...s.stores, ...(usesKafka(s.id) ? ['Kafka'] : [])]
const bottom = (b: Box) => [b.x + b.w / 2, b.y + b.h] as const
const top = (b: Box) => [b.x + b.w / 2, b.y] as const

/** 「Slack(처리 실패 메시지 알림)」처럼 괄호 안 설명을 아랫줄로 뺀다. */
function split(name: string) {
  const m = /^(.*?)\((.*)\)$/.exec(name)
  return m ? { title: m[1]!.trim(), sub: m[2]! } : { title: name }
}

/** 브라우저에서 들어온 요청이 게이트웨이를 거쳐 서비스, 저장소, 바깥 시스템까지 가는 길 */
export function RequestFlow({
  selected,
  onSelect,
}: {
  selected: ServiceId | null
  onSelect: (id: ServiceId) => void
}) {
  const sel = SERVICES.find((s) => s.id === selected)
  const svcTone = (id: ServiceId): Tone => (!sel ? 'normal' : id === sel.id ? 'selected' : 'faded')
  const edgeTone = (id: ServiceId): EdgeTone =>
    !sel ? 'normal' : id === sel.id ? 'active' : 'faded'
  const relatedTone = (hit: boolean): Tone => (!sel || hit ? 'normal' : 'faded')

  return (
    <div className="flex flex-col gap-6">
      <Canvas label="요청 흐름" width={W} height={H} minWidth="min-w-[60rem]">
        <Arrowheads prefix={ARROW} />

        <Edge d={`M${BROWSER.x + BROWSER.w} 40 H${NGINX.x}`} tone="normal" arrow={ARROW} />
        <Edge d={`M${NGINX.x + NGINX.w} 40 H${WEB.x}`} tone="normal" arrow={ARROW} />
        <text
          x={(NGINX.x + NGINX.w + WEB.x) / 2}
          y={30}
          textAnchor="middle"
          className="fill-muted text-[11px]"
        >
          화면 주소
        </text>
        <Edge d={down(...bottom(NGINX), ...top(GATEWAY))} tone="normal" arrow={ARROW} />
        <text x={NGINX.x + NGINX.w / 2 + 8} y={96} className="fill-muted text-[11px]">
          /api 주소
        </text>

        {SERVICES.map((s, i) => (
          <Edge
            key={s.id}
            d={down(SVC[i]!.x + SVC[i]!.w / 2, GATEWAY.y + GATEWAY.h, ...top(SVC[i]!))}
            tone={edgeTone(s.id)}
            arrow={ARROW}
          />
        ))}
        {/* 서비스마다 저장소 선을 그리면 30개 넘게 엉킨다. 평소에는 한 줄로 모아 보여 주고, 서비스를 고르면 그 서비스의 선만 그린다. 자세한 연결은 아래 표에 있다. */}
        {sel ? (
          storesOf(sel).map((store) => {
            const i = SERVICES.indexOf(sel)
            const j = STORES.findIndex((x) => x.id === store)
            return (
              <Edge
                key={store}
                d={down(...bottom(SVC[i]!), ...top(STORE[j]!))}
                tone="active"
                arrow={ARROW}
              />
            )
          })
        ) : (
          <g>
            {SVC.map((b) => (
              <Edge key={b.x} d={`M${b.x + b.w / 2} ${b.y + b.h} V${BUS}`} tone="normal" />
            ))}
            <Edge
              d={`M${SVC[0]!.x + SVC[0]!.w / 2} ${BUS} H${SVC.at(-1)!.x + SVC.at(-1)!.w / 2}`}
              tone="normal"
            />
            {STORE.map((b) => (
              <Edge key={b.x} d={`M${b.x + b.w / 2} ${BUS} V${b.y}`} tone="normal" arrow={ARROW} />
            ))}
          </g>
        )}
        {/* 바깥 시스템 선은 저장소 줄을 가로질러 복잡해지므로, 서비스를 골랐을 때만 그린다. */}
        {sel &&
          sel.external.map((e) => {
            const i = SERVICES.indexOf(sel)
            const j = EXTERNAL.indexOf(e)
            return (
              <Edge
                key={e}
                d={down(...bottom(SVC[i]!), ...top(EXT[j]!))}
                tone="active"
                arrow={ARROW}
                dashed
              />
            )
          })}

        <NodeBox box={BROWSER} title="브라우저" />
        <NodeBox box={NGINX} title="Nginx" sub="HTTPS 인증서(certbot)" />
        <NodeBox box={WEB} title="웹 화면" sub="Next.js" />
        <NodeBox
          box={GATEWAY}
          title="게이트웨이 :8000"
          sub="토큰을 확인하고 주소에 맞는 서비스로 넘김"
        />
        {SERVICES.map((s, i) => (
          <NodeBox
            key={s.id}
            box={SVC[i]!}
            title={s.label}
            sub={`:${s.port}`}
            monoSub
            tone={svcTone(s.id)}
            onClick={() => onSelect(s.id)}
          />
        ))}
        {STORES.map((st, j) => (
          <NodeBox
            key={st.id}
            box={STORE[j]!}
            title={st.title}
            sub={st.sub}
            tone={relatedTone(!!sel && storesOf(sel).includes(st.id))}
          />
        ))}
        {EXTERNAL.map((e, j) => (
          <NodeBox
            key={e}
            box={EXT[j]!}
            {...split(e)}
            tone={relatedTone(!!sel && sel.external.includes(e))}
          />
        ))}

        <text x={16} y={EXT[0]!.y - 12} className="fill-muted text-[12px]">
          바깥 시스템
        </text>
      </Canvas>
      <StoreMatrix selected={selected} onSelect={onSelect} />
    </div>
  )
}

/** 어느 서비스가 어떤 저장소와 바깥 시스템을 쓰는지 한 줄씩 보여 준다. */
function StoreMatrix({
  selected,
  onSelect,
}: {
  selected: ServiceId | null
  onSelect: (id: ServiceId) => void
}) {
  return (
    <div className="overflow-x-auto">
      <table aria-label="서비스별 저장소" className="w-full min-w-[48rem] text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-muted">
            <th scope="col" className="px-3 py-2 text-left font-medium">
              서비스
            </th>
            {STORES.map((st) => (
              <th key={st.id} scope="col" className="px-3 py-2 text-center font-medium">
                {st.id}
              </th>
            ))}
            <th scope="col" className="px-3 py-2 text-left font-medium">
              바깥 시스템
            </th>
          </tr>
        </thead>
        <tbody>
          {SERVICES.map((s) => {
            const used = storesOf(s)
            const on = s.id === selected
            return (
              <tr
                key={s.id}
                className={
                  'border-b border-border last:border-0 ' +
                  (on ? 'bg-accent-soft' : selected ? 'opacity-40' : '')
                }
              >
                <th scope="row" className="px-3 py-2 text-left font-medium">
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => onSelect(s.id)}
                    className="rounded outline-none hover:underline focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    {s.label}
                  </button>
                </th>
                {STORES.map((st) => (
                  <td key={st.id} className="px-3 py-2 text-center">
                    {used.includes(st.id) ? (
                      <span
                        aria-label="씀"
                        className="inline-block size-2.5 rounded-full bg-accent"
                      />
                    ) : (
                      <span className="sr-only">안 씀</span>
                    )}
                  </td>
                ))}
                <td className="px-3 py-2 text-muted">{s.external.join(', ')}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
