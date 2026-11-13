'use client'

import { Button } from '@heroui/react'
import { useState } from 'react'

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button size="sm" variant="tertiary" onPress={copy}>
      {copied ? '복사됨' : '복사하기'}
    </Button>
  )
}
