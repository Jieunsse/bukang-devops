import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ThemeToggle } from './ThemeToggle'

const setTheme = vi.fn()
let resolvedTheme = 'light'
vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme, setTheme }) }))

describe('밝은·어두운 화면 전환', () => {
  beforeEach(() => setTheme.mockReset())

  it('밝은 화면에서 누르면 어두운 화면으로 바꾸고 고른 값을 남긴다', async () => {
    resolvedTheme = 'light'
    render(<ThemeToggle />)
    await userEvent.click(screen.getByRole('button', { name: '어두운 화면으로 바꾸기' }))
    expect(setTheme).toHaveBeenCalledWith('dark')
  })

  it('어두운 화면에서 누르면 밝은 화면으로 바꾼다', async () => {
    resolvedTheme = 'dark'
    render(<ThemeToggle />)
    await userEvent.click(screen.getByRole('button', { name: '밝은 화면으로 바꾸기' }))
    expect(setTheme).toHaveBeenCalledWith('light')
  })
})
