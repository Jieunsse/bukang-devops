'use client'

import { Moon, Sun } from '@gravity-ui/icons'
import { Button } from '@heroui/react'
import { useTheme } from 'next-themes'
import { useSyncExternalStore } from 'react'

const noop = () => () => {}

/** 처음에는 기기 설정을 따른다. 한 번 누르면 고른 값을 브라우저에 기억한다(next-themes). */
export function ThemeToggle({ showLabel = false }: { showLabel?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme()
  // 서버는 기기 설정을 모른다. 브라우저가 이어받은 뒤에만 지금 화면을 보고 아이콘을 정한다.
  const isClient = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  )
  const isDark = isClient && resolvedTheme === 'dark'
  const label = isDark ? '밝은 화면으로 바꾸기' : '어두운 화면으로 바꾸기'
  return (
    <Button
      isIconOnly={!showLabel}
      fullWidth={showLabel}
      variant={showLabel ? 'ghost' : 'tertiary'}
      className={showLabel ? 'justify-start' : undefined}
      aria-label={label}
      onPress={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {isDark ? <Sun aria-hidden className="size-4" /> : <Moon aria-hidden className="size-4" />}
      {showLabel && (isDark ? '밝은 화면' : '어두운 화면')}
    </Button>
  )
}
