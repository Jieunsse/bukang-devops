import { Chip } from '@heroui/react'

/** 묶음 머리줄 옆에 붙는 티켓 수 칩 */
export function CountChip({ children }: { children: React.ReactNode }) {
  return (
    <Chip size="sm" className="tabular-nums">
      {children}
    </Chip>
  )
}
