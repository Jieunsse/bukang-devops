import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => cleanup())

// server-only는 브라우저 번들에 서버 코드가 섞이면 빌드를 막는다. 테스트는 Node에서 돌아서 막을 필요가 없다.
vi.mock('server-only', () => ({}))
