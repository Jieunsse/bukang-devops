// Claude API 호출. 키는 서버에서만 읽는다(NEXT_PUBLIC_ 없음). 키 값과 응답 원문은 로그에 남기지 않는다.
import 'server-only'

import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import type { z } from 'zod'

/** 모델 이름은 ANTHROPIC_MODEL로만 바꾼다. 날짜가 붙은 이름은 쓰지 않는다 */
export const DEFAULT_MODEL = 'claude-opus-5-5'
/** 기본 출력 한도. 너무 작으면 잘려서 JSON이 깨진다 */
const MAX_TOKENS = 1000
const TIMEOUT_MS = 20_000
/** 공개 사이트라 실패한 호출을 여러 번 다시 보내지 않는다 */
const MAX_RETRIES = 1
/** 안전 판정으로 거절되면 API가 다른 모델로 한 번 더 시도한다(Opus 5.5용) */
const FALLBACK_BETA = 'server-side-fallback-2026-07-01'

export type ClaudeConfig = { apiKey: string; model: string }

export function readClaudeConfig(env: {
  ANTHROPIC_API_KEY?: string
  ANTHROPIC_MODEL?: string
}): ClaudeConfig | null {
  const apiKey = env.ANTHROPIC_API_KEY?.trim()
  if (!apiKey) return null
  return { apiKey, model: env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL }
}

/** 테스트는 가짜 fetch를 넣는다 */
export function createClaudeClient(config: ClaudeConfig, fetchImpl?: typeof fetch): Anthropic {
  return new Anthropic({
    apiKey: config.apiKey,
    timeout: TIMEOUT_MS,
    maxRetries: MAX_RETRIES,
    ...(fetchImpl ? { fetch: fetchImpl } : {}),
  })
}

export type ClaudeFailure = 'refusal' | 'invalid' | 'rateLimit' | 'connection' | 'api'
export type ClaudeResult<T> = { ok: true; value: T } | { ok: false; reason: ClaudeFailure }

/** 대체 모델 기능은 Opus 계열에서만 켠다(Haiku에는 없다) */
const usesFallback = (model: string) => model.startsWith('claude-opus')

/**
 * 한 번 묻고 JSON 응답을 스키마로 검사해 돌려준다. 실패는 이유만 서버 로그에 남긴다.
 * 숫자와 판정은 부르는 쪽이 계산해 user에 넣는다. AI는 문장만 쓴다.
 */
export async function askClaude<S extends z.ZodType>(
  client: Anthropic,
  config: ClaudeConfig,
  prompt: { system: string; user: string; schema: S },
  /** 호출마다 바꿀 값. 길게 쓰거나 비교가 필요하면 늘린다 */
  options: { maxTokens?: number; effort?: 'low' | 'medium' | 'high' } = {},
): Promise<ClaudeResult<z.infer<S>>> {
  try {
    const fallback = usesFallback(config.model)
    // parse()는 거절로 본문이 비면 stop_reason을 보기 전에 실패한다. 그래서 create()로 받고 직접 검사한다(SDK 문서 방식)
    const response = await client.beta.messages.create({
      model: config.model,
      max_tokens: options.maxTokens ?? MAX_TOKENS,
      system: prompt.system,
      messages: [{ role: 'user', content: prompt.user }],
      output_config: {
        effort: options.effort ?? 'low',
        format: betaZodOutputFormat(prompt.schema),
      },
      ...(fallback ? { betas: [FALLBACK_BETA], fallbacks: 'default' as const } : {}),
    })
    // 비용을 재려고 출력 토큰 수만 남긴다(생각 토큰 포함). 응답 원문은 남기지 않는다
    console.info(
      `[claude] 출력 토큰 ${response.usage.output_tokens}, 멈춘 이유 ${response.stop_reason}`,
    )
    if (response.stop_reason === 'refusal') return fail('refusal')
    const text = response.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('')
    const parsed = prompt.schema.safeParse(safeJson(text))
    if (!parsed.success) return fail('invalid')
    return { ok: true, value: parsed.data as z.infer<S> }
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return fail('rateLimit', error.status)
    if (error instanceof Anthropic.APIConnectionError) return fail('connection')
    if (error instanceof Anthropic.APIError) return fail('api', error.status)
    return fail('api')
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

function fail(reason: ClaudeFailure, status?: number): { ok: false; reason: ClaudeFailure } {
  console.error(`[claude] 호출 실패: ${reason}${status ? ` (${status})` : ''}`)
  return { ok: false, reason }
}
