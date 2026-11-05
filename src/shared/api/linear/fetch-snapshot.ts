import 'server-only'

import { z } from 'zod'

import { cyclesResponseSchema, issuesResponseSchema, type Snapshot } from './schema'

const ENDPOINT = 'https://api.linear.app/graphql'
const TEAM_KEY = 'BUK'
const PAGE_SIZE = 100
/** 100건 × 10쪽 = 1000건. 넘으면 잘린 목록 대신 오류를 낸다. */
export const MAX_PAGES = 10

// labels(first: 20)처럼 안쪽 목록 크기를 정해야 Linear의 쿼리 복잡도 한도 안에 든다.
const ISSUES_QUERY = `
  query Issues($teamKey: String!, $after: String) {
    issues(
      first: ${PAGE_SIZE}
      after: $after
      filter: { team: { key: { eq: $teamKey } }, state: { type: { nin: ["completed", "canceled"] } } }
    ) {
      nodes {
        id identifier title url dueDate startedAt
        state { name type }
        assignee { id name avatarUrl }
        labels(first: 20) { nodes { id name } }
        projectMilestone { id name progress }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`

const CYCLES_QUERY = `
  query Cycles($teamKey: String!, $after: String) {
    cycles(first: ${PAGE_SIZE}, after: $after, filter: { team: { key: { eq: $teamKey } } }) {
      nodes { id number name startsAt endsAt }
      pageInfo { hasNextPage endCursor }
    }
  }
`

/** Linear에 닿지 못했거나 Linear가 오류를 돌려준 경우 */
export class LinearRequestError extends Error {
  name = 'LinearRequestError'
}

/** 응답이 왔지만 우리가 아는 모양이 아닌 경우 */
export class LinearResponseError extends Error {
  name = 'LinearResponseError'
}

const envelopeSchema = z.object({
  data: z.unknown().optional(),
  errors: z.array(z.object({ message: z.string() })).optional(),
})

type FetchImpl = (url: string, init: RequestInit) => Promise<Response>

async function request<T>(
  fetchImpl: FetchImpl,
  apiKey: string,
  query: string,
  variables: Record<string, unknown>,
  schema: z.ZodType<T>,
): Promise<T> {
  const response = await fetchImpl(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: apiKey },
    body: JSON.stringify({ query, variables }),
    // 캐시는 unstable_cache 한 곳에서만 한다.
    cache: 'no-store',
  })
  const envelope = envelopeSchema.safeParse(await response.json().catch(() => null))
  const messages = envelope.success ? envelope.data.errors?.map((e) => e.message) : undefined
  if (!response.ok || messages?.length) {
    throw new LinearRequestError(
      `Linear 요청 실패(${response.status}): ${messages?.join(', ') ?? '응답 없음'}`,
    )
  }
  const parsed = schema.safeParse(envelope.success ? envelope.data.data : undefined)
  if (!parsed.success) {
    throw new LinearResponseError(`Linear 응답 형식이 달라요: ${z.prettifyError(parsed.error)}`)
  }
  return parsed.data
}

type Page<N> = { nodes: N[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } }

/** 다음 쪽이 없을 때까지 받는다. 쪽 수가 한도를 넘으면 잘린 목록 대신 오류를 낸다. */
export async function paginate<T, N>(
  fetchImpl: FetchImpl,
  apiKey: string,
  query: string,
  schema: z.ZodType<T>,
  pick: (data: T) => Page<N>,
): Promise<N[]> {
  const nodes: N[] = []
  let after: string | null = null
  for (let page = 0; page < MAX_PAGES; page++) {
    const data: Page<N> = pick(
      await request(fetchImpl, apiKey, query, { teamKey: TEAM_KEY, after }, schema),
    )
    nodes.push(...data.nodes)
    if (!data.pageInfo.hasNextPage) return nodes
    after = data.pageInfo.endCursor
  }
  throw new LinearRequestError(`목록이 ${MAX_PAGES * PAGE_SIZE}건을 넘어 다 받지 못했어요.`)
}

/** BUK 팀의 끝나지 않은 티켓 전부와 사이클을 받는다. */
export async function fetchSnapshot(
  apiKey: string,
  fetchImpl: FetchImpl = fetch,
  now: Date = new Date(),
): Promise<Snapshot> {
  const issues = await paginate(
    fetchImpl,
    apiKey,
    ISSUES_QUERY,
    issuesResponseSchema,
    (d) => d.issues,
  )
  const cycles = await paginate(
    fetchImpl,
    apiKey,
    CYCLES_QUERY,
    cyclesResponseSchema,
    (d) => d.cycles,
  )
  return { fetchedAt: now.toISOString(), issues, cycles }
}
