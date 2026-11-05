import {
  Circle,
  CircleArrowRight,
  CircleDashed,
  CirclePlay,
  ExclamationShape,
} from '@gravity-ui/icons'

import type { Issue } from '@/shared/api/linear'

import { stateLabel } from '../lib/state'

// 아이콘은 모두 회색이다. 상태 색은 기한 세 단계에만 쓴다.
const ICON = 'size-3.5 shrink-0 text-muted'

/** 상태 아이콘. 대기는 점선 원, 할 일은 빈 원, 진행 중은 재생, 리뷰 중은 화살표 원이다. */
export function StateIcon({ state }: { state: Issue['state'] }) {
  const label = stateLabel(state)
  const Icon =
    state.type === 'backlog'
      ? CircleDashed
      : state.type === 'started'
        ? state.name === 'In Review'
          ? CircleArrowRight
          : CirclePlay
        : Circle
  return <Icon role="img" aria-label={label} className={ICON} />
}

const PRIORITY_LABEL = ['없음', '긴급', '높음', '보통', '낮음']

/** 우선순위. 긴급은 느낌표, 높음·보통·낮음은 막대 3·2·1개를 채운다. 없으면 막대를 모두 비운다. */
export function PriorityIcon({ priority = 0 }: { priority?: number }) {
  const label = `우선순위 ${PRIORITY_LABEL[priority] ?? '없음'}`
  if (priority === 1) return <ExclamationShape role="img" aria-label={label} className={ICON} />
  const filled = priority === 0 ? 0 : 5 - priority
  return (
    <svg role="img" aria-label={label} viewBox="0 0 14 14" className={ICON}>
      {[0, 1, 2].map((n) => (
        <rect
          key={n}
          x={1 + n * 4.5}
          y={9 - n * 3}
          width={3}
          height={4 + n * 3}
          rx={1}
          fill="currentColor"
          opacity={n < filled ? 1 : 0.3}
        />
      ))}
    </svg>
  )
}
