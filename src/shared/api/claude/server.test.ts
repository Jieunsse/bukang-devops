// @vitest-environment node
// 서버 코드 테스트다. SDK는 브라우저 같은 환경(jsdom)에서 키를 쓰지 않게 막는다.
import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { askClaude, createClaudeClient, readClaudeConfig } from './server'

// 점검표: 키 노출, 외부 실패(시간 초과·429·거절·스키마 불일치), 계약 대조(Claude Messages 요청·응답 모양).
// 실제 API는 부르지 않는다. SDK에 가짜 fetch를 넣는다.

const KEY = 'sk-ant-test-secret'
const schema = z.object({ status: z.string(), cause: z.string() })

function fakeFetch(respond: (body: Record<string, unknown>, headers: Headers) => Response) {
  const calls: { body: Record<string, unknown>; headers: Headers; url: string }[] = []
  const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>
    const headers = new Headers(init?.headers)
    calls.push({ body, headers, url: String(url) })
    return respond(body, headers)
  })
  return { fetchImpl: fetchImpl as unknown as typeof fetch, calls }
}

const message = (text: string, stop_reason = 'end_turn') =>
  new Response(
    JSON.stringify({
      id: 'msg_1',
      type: 'message',
      role: 'assistant',
      model: 'claude-opus-5-5',
      content: [{ type: 'text', text }],
      stop_reason,
      stop_sequence: null,
      usage: { input_tokens: 10, output_tokens: 10 },
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  )

const config = { apiKey: KEY, model: 'claude-opus-5-5' }
const prompt = { system: '규칙', user: '{"a":1}', schema }

describe('Claude 연결 정보', () => {
  it('키가 없으면 쓰지 않고, 모델은 기본 claude-opus-5-5 이며 ANTHROPIC_MODEL로만 바꾼다', () => {
    expect(readClaudeConfig({})).toBeNull()
    expect(readClaudeConfig({ ANTHROPIC_API_KEY: ' ' })).toBeNull()
    expect(readClaudeConfig({ ANTHROPIC_API_KEY: KEY })).toEqual(config)
    expect(
      readClaudeConfig({ ANTHROPIC_API_KEY: KEY, ANTHROPIC_MODEL: 'claude-haiku-5-5' })?.model,
    ).toBe('claude-haiku-5-5')
  })
})

describe('Claude 호출', () => {
  it('요청 모양: 낮은 effort, 구조화 응답, 서버 쪽 대체 모델, thinking·temperature 없음', async () => {
    const { fetchImpl, calls } = fakeFetch(() => message('{"status":"정상","cause":"없음"}'))
    const result = await askClaude(createClaudeClient(config, fetchImpl), config, prompt)

    expect(result).toEqual({ ok: true, value: { status: '정상', cause: '없음' } })
    const { body, headers } = calls[0]!
    expect(body.model).toBe('claude-opus-5-5')
    expect(body.max_tokens).toBe(1000)
    expect(body.fallbacks).toBe('default')
    expect(body).not.toHaveProperty('thinking')
    expect(body).not.toHaveProperty('temperature')
    expect(body.output_config).toMatchObject({ effort: 'low', format: { type: 'json_schema' } })
    expect(headers.get('anthropic-beta')).toContain('server-side-fallback-2026-07-01')
    expect(body.system).toBe('규칙')
    expect(body.messages).toEqual([{ role: 'user', content: '{"a":1}' }])
  })

  it('호출마다 출력 한도와 effort를 바꿀 수 있다', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => {})
    const { fetchImpl, calls } = fakeFetch(() => message('{"status":"a","cause":"b"}'))
    await askClaude(createClaudeClient(config, fetchImpl), config, prompt, {
      maxTokens: 3000,
      effort: 'medium',
    })
    expect(calls[0]!.body.max_tokens).toBe(3000)
    expect(calls[0]!.body.output_config).toMatchObject({ effort: 'medium' })
  })

  it('Haiku로 바꾸면 대체 모델 옵션을 보내지 않는다', async () => {
    const haiku = { apiKey: KEY, model: 'claude-haiku-5-5' }
    const { fetchImpl, calls } = fakeFetch(() => message('{"status":"a","cause":"b"}'))
    await askClaude(createClaudeClient(haiku, fetchImpl), haiku, prompt)
    expect(calls[0]!.body).not.toHaveProperty('fallbacks')
    expect(calls[0]!.headers.get('anthropic-beta') ?? '').not.toContain('server-side-fallback')
  })

  it('거절(refusal)이면 실패로 돌려준다', async () => {
    const { fetchImpl } = fakeFetch(() => message('', 'refusal'))
    expect(await askClaude(createClaudeClient(config, fetchImpl), config, prompt)).toEqual({
      ok: false,
      reason: 'refusal',
    })
  })

  it('출력 한도에 닿아 잘리면 truncated로 돌려준다', async () => {
    const { fetchImpl } = fakeFetch(() => message('{"status":"a"', 'max_tokens'))
    expect(await askClaude(createClaudeClient(config, fetchImpl), config, prompt)).toEqual({
      ok: false,
      reason: 'truncated',
    })
  })

  it('응답이 스키마와 다르면 실패로 돌려준다', async () => {
    const { fetchImpl } = fakeFetch(() => message('{"status":1}'))
    const r = await askClaude(createClaudeClient(config, fetchImpl), config, prompt)
    expect(r.ok).toBe(false)
  })

  it('429는 rateLimit으로 돌려주고, 로그에 키와 응답 원문을 남기지 않는다', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { fetchImpl } = fakeFetch(
      () =>
        new Response(
          JSON.stringify({
            type: 'error',
            error: { type: 'rate_limit_error', message: `원문 ${KEY}` },
          }),
          {
            status: 429,
            headers: { 'content-type': 'application/json', 'retry-after': '0' },
          },
        ),
    )
    const r = await askClaude(createClaudeClient(config, fetchImpl), config, prompt)
    expect(r).toEqual({ ok: false, reason: 'rateLimit' })
    const logged = log.mock.calls.flat().map(String).join(' ')
    expect(logged).not.toContain(KEY)
    expect(logged).not.toContain('원문')
    log.mockRestore()
  })

  it('연결이 끊기거나 시간이 지나면 connection으로 돌려준다', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('fetch failed')
    }) as unknown as typeof fetch
    const r = await askClaude(createClaudeClient(config, fetchImpl), config, prompt)
    expect(r).toEqual({ ok: false, reason: 'connection' })
  })
})
