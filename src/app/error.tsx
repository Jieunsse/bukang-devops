'use client'

import { Button, Card } from '@heroui/react'

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <Card.Header>
          <Card.Title>Linear에서 티켓을 받지 못했어요</Card.Title>
          <Card.Description>
            잠시 뒤 다시 시도해 주세요. 계속 안 되면 Linear 키와 호출 한도를 확인해 주세요.
          </Card.Description>
        </Card.Header>
        <Card.Footer>
          <Button onPress={reset}>다시 시도</Button>
        </Card.Footer>
      </Card>
    </main>
  )
}
