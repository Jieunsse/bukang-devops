import { SERVICES, type ServiceId } from '@/entities/architecture'

import { Arrowheads, Canvas, Edge, NodeBox, type Box, type EdgeTone, type Tone } from './diagram'

const W = 900
const H = 520
const ARROW = 'call'
const NODE = { w: 104, h: 48 }

// 위는 부르기만 하는 쪽, 가운데는 부르고 불리는 쪽, 아래는 불리기만 하는 쪽. 맨 아래 줄은 HTTP 호출이 없다.
// 선이 다른 상자를 지나가지 않게 손으로 자리를 정했다. 서비스나 호출이 늘면 함께 고친다.
const CENTER: Record<ServiceId, [number, number]> = {
  inquiry: [140, 60],
  payout: [760, 60],
  member: [140, 200],
  order: [450, 200],
  cash: [300, 350],
  product: [600, 350],
  queue: [780, 350],
  board: [300, 470],
  notification: [450, 470],
  file: [600, 470],
}

const BOX = Object.fromEntries(
  Object.entries(CENTER).map(([id, [cx, cy]]) => [
    id,
    { x: cx - NODE.w / 2, y: cy - NODE.h / 2, ...NODE },
  ]),
) as Record<ServiceId, Box>

const CALLS = SERVICES.flatMap((s) => s.calls.map((to) => ({ from: s.id, to })))

/** 두 상자 가운데를 잇는 선을 상자 테두리에서 끊는다. 양방향 호출이 겹치지 않게 옆으로 조금 띄운다. */
function line(a: Box, b: Box) {
  const [ax, ay, bx, by] = [a.x + a.w / 2, a.y + a.h / 2, b.x + b.w / 2, b.y + b.h / 2]
  const [dx, dy] = [bx - ax, by - ay]
  const len = Math.hypot(dx, dy)
  const [ox, oy] = [(-dy / len) * 5, (dx / len) * 5]
  const cut = (w: number, h: number) =>
    Math.min(w / 2 / Math.abs(dx || 1e-9), h / 2 / Math.abs(dy || 1e-9))
  const t1 = cut(a.w + 8, a.h + 8)
  const t2 = 1 - cut(b.w + 8, b.h + 8)
  return `M${ax + dx * t1 + ox} ${ay + dy * t1 + oy} L${ax + dx * t2 + ox} ${ay + dy * t2 + oy}`
}

/** 서비스끼리 HTTP로 직접 부르는 관계 */
export function ServiceCalls({
  selected,
  onSelect,
}: {
  selected: ServiceId | null
  onSelect: (id: ServiceId) => void
}) {
  const linked = new Set(
    selected
      ? CALLS.filter((c) => c.from === selected || c.to === selected).flatMap((c) => [c.from, c.to])
      : [],
  )
  const tone = (id: ServiceId): Tone =>
    !selected ? 'normal' : id === selected ? 'selected' : linked.has(id) ? 'normal' : 'faded'
  // 고른 서비스가 부르는 선은 강조색, 고른 서비스를 부르는 선은 보통 굵기로 남긴다.
  const edgeTone = (from: ServiceId, to: ServiceId): EdgeTone =>
    !selected ? 'normal' : from === selected ? 'active' : to === selected ? 'normal' : 'faded'

  return (
    <div className="flex flex-col gap-3">
      <Canvas label="서비스 호출" width={W} height={H} minWidth="min-w-[48rem]">
        <Arrowheads prefix={ARROW} />
        {CALLS.map((c) => (
          <Edge
            key={`${c.from}-${c.to}`}
            d={line(BOX[c.from], BOX[c.to])}
            tone={edgeTone(c.from, c.to)}
            arrow={ARROW}
          />
        ))}
        <text
          x={140}
          y={470}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-muted text-[12px]"
        >
          HTTP 호출 없음
        </text>
        {SERVICES.map((s) => (
          <NodeBox
            key={s.id}
            box={BOX[s.id]}
            title={s.label}
            sub={s.calls.length ? `${s.calls.length}곳을 부름` : '부르는 곳 없음'}
            tone={tone(s.id)}
            onClick={() => onSelect(s.id)}
          />
        ))}
      </Canvas>
      <Legend />
    </div>
  )
}

function Legend() {
  return (
    <ul className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted">
      <li className="flex items-center gap-2">
        <span aria-hidden className="h-0.5 w-6 bg-accent" />
        고른 서비스가 부르는 쪽
      </li>
      <li className="flex items-center gap-2">
        <span aria-hidden className="h-0.5 w-6 bg-muted" />
        고른 서비스를 부르는 쪽
      </li>
      <li>화살표는 부르는 쪽에서 불리는 쪽으로 가요. 이벤트는 「이벤트 흐름」에서 봐요.</li>
    </ul>
  )
}
