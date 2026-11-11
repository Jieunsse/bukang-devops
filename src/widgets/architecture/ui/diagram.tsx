// 세 그림이 같이 쓰는 SVG 조각. 색은 HeroUI 테마 변수를 따라 밝은·어두운 화면 모두 맞는다.

export type Box = { x: number; y: number; w: number; h: number }
/** selected: 고른 것, normal: 보통, faded: 고른 것과 상관없어 흐리게 */
export type Tone = 'selected' | 'normal' | 'faded'

const RECT: Record<Tone, string> = {
  selected: 'fill-accent stroke-accent',
  normal: 'fill-surface stroke-border',
  faded: 'fill-surface stroke-border opacity-30',
}
const TITLE: Record<Tone, string> = {
  selected: 'fill-accent-foreground',
  normal: 'fill-foreground',
  faded: 'fill-foreground opacity-30',
}
const SUB: Record<Tone, string> = {
  selected: 'fill-accent-foreground opacity-80',
  normal: 'fill-muted',
  faded: 'fill-muted opacity-30',
}

export function NodeBox({
  box,
  title,
  sub,
  tone = 'normal',
  monoSub,
  onClick,
}: {
  box: Box
  title: string
  sub?: string
  tone?: Tone
  monoSub?: boolean
  onClick?: () => void
}) {
  const cx = box.x + box.w / 2
  const cy = box.y + box.h / 2
  const interactive = onClick
    ? {
        role: 'button',
        tabIndex: 0,
        'aria-label': sub ? `${title} ${sub}` : title,
        'aria-pressed': tone === 'selected',
        onClick,
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onClick()
          }
        },
        className:
          'cursor-pointer outline-none [&:focus-visible>rect]:stroke-focus [&:focus-visible>rect]:stroke-2',
      }
    : {}
  return (
    <g {...interactive}>
      <rect
        x={box.x}
        y={box.y}
        width={box.w}
        height={box.h}
        rx={10}
        className={`${RECT[tone]} transition-opacity`}
      />
      <text
        x={cx}
        y={sub ? cy - 7 : cy}
        textAnchor="middle"
        dominantBaseline="central"
        className={`text-[14px] font-medium ${TITLE[tone]}`}
      >
        {title}
      </text>
      {sub && (
        <text
          x={cx}
          y={cy + 11}
          textAnchor="middle"
          dominantBaseline="central"
          className={`text-[11px] ${monoSub ? 'font-mono' : ''} ${SUB[tone]}`}
        >
          {sub}
        </text>
      )}
    </g>
  )
}

/** 화살촉 두 가지(보통·강조). 그림마다 id가 겹치지 않게 prefix를 받는다. */
export function Arrowheads({ prefix }: { prefix: string }) {
  return (
    <defs>
      {(['normal', 'active'] as const).map((k) => (
        <marker
          key={k}
          id={`${prefix}-${k}`}
          viewBox="0 0 10 10"
          refX={9}
          refY={5}
          markerWidth={7}
          markerHeight={7}
          orient="auto-start-reverse"
        >
          <path d="M0 0 L10 5 L0 10 z" className={k === 'active' ? 'fill-accent' : 'fill-muted'} />
        </marker>
      ))}
    </defs>
  )
}

/** active: 고른 것과 이어진 선, normal: 보통, faded: 상관없는 선 */
export type EdgeTone = 'active' | 'normal' | 'faded'

export function Edge({
  d,
  tone,
  arrow,
  dashed,
}: {
  d: string
  tone: EdgeTone
  /** Arrowheads의 prefix. 없으면 화살촉을 그리지 않는다. */
  arrow?: string
  dashed?: boolean
}) {
  const cls = {
    active: 'stroke-accent opacity-100',
    normal: 'stroke-muted opacity-50',
    faded: 'stroke-muted opacity-10',
  }[tone]
  return (
    <path
      d={d}
      fill="none"
      strokeWidth={tone === 'active' ? 2 : 1.25}
      strokeDasharray={dashed ? '4 4' : undefined}
      markerEnd={arrow ? `url(#${arrow}-${tone === 'active' ? 'active' : 'normal'})` : undefined}
      className={`${cls} transition-opacity`}
    />
  )
}

/** 위에서 아래로 휘는 선 */
export const down = (x1: number, y1: number, x2: number, y2: number) => {
  const m = (y1 + y2) / 2
  return `M${x1} ${y1} C${x1} ${m} ${x2} ${m} ${x2} ${y2}`
}

/** 왼쪽에서 오른쪽으로 휘는 선 */
export const across = (x1: number, y1: number, x2: number, y2: number) => {
  const m = (x1 + x2) / 2
  return `M${x1} ${y1} C${m} ${y1} ${m} ${y2} ${x2} ${y2}`
}

/** 그림이 화면보다 넓으면 가로로 스크롤한다. 작은 화면에서 글자가 읽히지 않을 만큼 줄어드는 것을 막는다. */
export function Canvas({
  label,
  width,
  height,
  minWidth,
  children,
}: {
  label: string
  width: number
  height: number
  minWidth: string
  children: React.ReactNode
}) {
  return (
    <div className="overflow-x-auto">
      <svg
        role="group"
        aria-label={label}
        viewBox={`0 0 ${width} ${height}`}
        className={`w-full ${minWidth}`}
      >
        {children}
      </svg>
    </div>
  )
}
