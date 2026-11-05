import { Card } from '@heroui/react'

export function ErrorScreen({ title, description }: { title: string; description: string }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <Card.Header>
          <Card.Title>{title}</Card.Title>
          <Card.Description>{description}</Card.Description>
        </Card.Header>
      </Card>
    </main>
  )
}
