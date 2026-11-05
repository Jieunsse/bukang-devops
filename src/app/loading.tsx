import { Spinner } from '@heroui/react'

/** 첫 화면을 그리기 전에 서버가 Linear 데이터를 받는 동안 보여 준다. */
export default function Loading() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background" aria-busy="true">
      <Spinner size="lg" aria-label="티켓을 불러오는 중" />
    </main>
  )
}
