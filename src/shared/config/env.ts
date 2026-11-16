import 'server-only'

import { z } from 'zod'

const envSchema = z.object({
  /** 기존 bukang-final 워크스페이스(BUK 팀) 키 */
  LINEAR_API_KEY: z.string().optional(),
  /** 새 buka-last 워크스페이스(CRU 팀) 키. 없으면 BUK만 받는다. */
  LINEAR_API_KEY_CRU: z.string().optional(),
  // Vercel이 넣어 준다. 로컬에서는 없다. 빈 값은 키처럼 없는 것으로 본다.
  VERCEL_ENV: z.preprocess(
    (v) => v || undefined,
    z.enum(['production', 'preview', 'development']).optional(),
  ),
})

export class MissingApiKeyError extends Error {
  constructor() {
    super('운영 환경에 LINEAR_API_KEY가 없어요.')
    this.name = 'MissingApiKeyError'
  }
}

/** Linear 워크스페이스 하나. 워크스페이스마다 키가 따로이고 팀도 하나씩이다. */
export type Workspace = { apiKey: string; teamKey: string }

/** workspaces는 BUK, CRU 순이다. 마지막 워크스페이스에 새 작업 요청을 만든다. */
export type LinearSource = { kind: 'live'; workspaces: Workspace[] } | { kind: 'fixture' }

/**
 * BUK 키가 있으면 Linear, 없으면 예시 데이터. 운영에서 BUK 키가 없으면 예시 데이터를 보여 주지 않는다.
 * CRU 키는 있을 때만 더한다.
 */
export function getLinearSource(
  env: Record<string, string | undefined> = process.env,
): LinearSource {
  const { LINEAR_API_KEY, LINEAR_API_KEY_CRU, VERCEL_ENV } = envSchema.parse(env)
  if (LINEAR_API_KEY) {
    const workspaces = [{ apiKey: LINEAR_API_KEY, teamKey: 'BUK' }]
    if (LINEAR_API_KEY_CRU) workspaces.push({ apiKey: LINEAR_API_KEY_CRU, teamKey: 'CRU' })
    return { kind: 'live', workspaces }
  }
  if (VERCEL_ENV === 'production') throw new MissingApiKeyError()
  return { kind: 'fixture' }
}
