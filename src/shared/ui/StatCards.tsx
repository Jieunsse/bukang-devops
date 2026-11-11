'use client'

import { cardVariants } from '@heroui/styles'

export type StatItem<K extends string> = {
  key: K
  label: string
  count: number
  /** 숫자 색. 기한 세 단계(지남 빨강, 오늘 주황)에만 쓴다. */
  className?: string
}

/** 숫자 요약 칸. 칸들을 판 하나로 묶는다. 누르면 그 칸을 고르고, 고른 칸은 안쪽 테두리로 보여 준다. 다시 누를 때의 동작은 쓰는 쪽이 정한다. */
export function StatCards<K extends string>({
  items,
  selected,
  onSelect,
}: {
  items: StatItem<K>[]
  selected: K | null
  onSelect: (key: K) => void
}) {
  const card = cardVariants()
  return (
    <div role="group" aria-label="숫자 요약" className="panel-group stat-panel grid-cols-2 lg:grid-cols-4">
      {items.map((item) => {
        const isSelected = selected === item.key
        return (
          <button
            key={item.key}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelect(item.key)}
            className={card.base({
              className: `text-left outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset ${isSelected ? 'ring-2 ring-accent ring-inset' : ''}`,
            })}
          >
            <span className="text-sm text-muted">{item.label}</span>
            <span className={`text-3xl font-semibold tabular-nums ${item.className ?? ''}`}>
              {item.count}
            </span>
          </button>
        )
      })}
    </div>
  )
}
