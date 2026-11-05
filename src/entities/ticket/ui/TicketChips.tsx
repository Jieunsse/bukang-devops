import { Chip } from '@heroui/react'

import type { Issue } from '@/shared/api/linear'

/** 기본 칩은 안쪽 여백이 좁아 글자가 테두리에 붙어 보여서 넓힌다. */
const TAG_CHIP = 'h-6 px-2.5'

/** Linear 라벨 색을 옅게 깔아 종류를 나눈다. 긴 이름은 자르고 마우스를 올리면 전체를 보여 준다. */
export function LabelChip({ label }: { label: Issue['labels'][number] }) {
  return (
    <Chip
      size="sm"
      className={`${TAG_CHIP} max-w-full`}
      style={
        label.color
          ? {
              backgroundColor: `color-mix(in oklab, ${label.color} 22%, transparent)`,
              color: `color-mix(in oklab, ${label.color} 65%, var(--foreground))`,
            }
          : undefined
      }
    >
      <span title={label.name} className="truncate">
        {label.name}
      </span>
    </Chip>
  )
}

/** 마일스톤은 자르면 어느 것인지 몰라서 언제나 한 줄로 다 보여 준다. 칸 폭은 milestoneColumnWidth로 잡는다. */
export function MilestoneChip({ name }: { name: string | null }) {
  return (
    <Chip size="sm" className={`${TAG_CHIP} whitespace-nowrap`}>
      {name ?? '마일스톤 없음'}
    </Chip>
  )
}
