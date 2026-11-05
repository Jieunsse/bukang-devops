import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => cleanup())

// server-only는 브라우저 번들에 서버 코드가 섞이면 빌드를 막는다. 테스트는 Node에서 돌아서 막을 필요가 없다.
vi.mock('server-only', () => ({}))

// jsdom에는 ResizeObserver가 없다. HeroUI 탭과 표가 크기를 잴 때 쓴다.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// jsdom에는 Web Animations API가 없다. HeroUI 탭 표시선이 움직일 때 쓴다.
Element.prototype.getAnimations ??= () => []
