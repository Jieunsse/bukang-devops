import 'server-only'

import { z } from 'zod'

const envSchema = z.object({
  LINEAR_API_KEY: z.string().optional(),
  // Vercel이 넣어 준다. 로컬에서는 없다.
  VERCEL_ENV: z.enum(['production', 'preview', 'development']).optional(),
})

export class MissingApiKeyError extends Error {
  constructor() {
    super('운영 환경에 LINEAR_API_KEY가 없어요.')
    this.name = 'MissingApiKeyError'
  }
}

export type LinearSource = { kind: 'live'; apiKey: string } | { kind: 'fixture' }

/** 키가 있으면 Linear, 없으면 예시 데이터. 운영에서 키가 없으면 예시 데이터를 보여 주지 않는다. */
export function getLinearSource(
  env: Record<string, string | undefined> = process.env,
): LinearSource {
  const { LINEAR_API_KEY, VERCEL_ENV } = envSchema.parse(env)
  if (LINEAR_API_KEY) return { kind: 'live', apiKey: LINEAR_API_KEY }
  if (VERCEL_ENV === 'production') throw new MissingApiKeyError()
  return { kind: 'fixture' }
}
