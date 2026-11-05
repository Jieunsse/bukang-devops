'use client'

import { ChevronDown, ChevronRight } from '@gravity-ui/icons'
import { Button } from '@heroui/react'

/**
 * 머리줄 전체를 눌러 아래 내용을 접고 펼치는 버튼. 대시보드 마감 목록의 묶음 접기와 같은 모양이다.
 * 제목 구조는 쓰는 쪽이 정한다. 보통 `<h3>`으로 감싼다.
 */
export function CollapseButton({
  isOpen,
  onToggle,
  className = '',
  children,
}: {
  isOpen: boolean
  onToggle: () => void
  className?: string
  children: React.ReactNode
}) {
  return (
    <Button
      variant="ghost"
      aria-expanded={isOpen}
      onPress={onToggle}
      className={`-ml-3 gap-2 px-3 font-semibold ${className}`}
    >
      {isOpen ? (
        <ChevronDown aria-hidden className="size-4 shrink-0" />
      ) : (
        <ChevronRight aria-hidden className="size-4 shrink-0" />
      )}
      {children}
    </Button>
  )
}
