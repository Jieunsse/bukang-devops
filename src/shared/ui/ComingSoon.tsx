import { EmptyState } from '@heroui/react'

export function ComingSoon({ title }: { title: string }) {
  return (
    <EmptyState className="py-24">
      <p className="font-medium text-foreground">{title}</p>
      <p className="text-sm text-muted">준비 중이에요. 다음 작업에서 채워요.</p>
    </EmptyState>
  )
}
