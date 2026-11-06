import { createHash, timingSafeEqual } from 'node:crypto'

const digest = (s: string) => createHash('sha256').update(s).digest()

/** 길이와 상관없이 같은 시간이 걸리게 해시끼리 비교한다. 서버에 비밀번호가 없으면 늘 틀렸다고 본다. */
export function passwordMatches(given: string, expected: string | undefined): boolean {
  if (!expected) return false
  return timingSafeEqual(digest(given), digest(expected))
}
