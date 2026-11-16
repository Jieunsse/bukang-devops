import 'server-only'

import { unstable_cache } from 'next/cache'

import { getLinearSource, MissingApiKeyError, type Workspace } from '../../config/env'
import { fetchSnapshot, LinearRequestError, LinearResponseError } from './fetch-snapshot'
import { createFixtureSnapshot } from './fixture'
import type { Issue, Member, Snapshot } from './schema'

export const SNAPSHOT_TAG = 'linear-snapshot'
const TEN_MINUTES = 600

/**
 * 끝나지 않은 티켓과 사이클. 서버 전체가 10분 동안 같은 값을 나눠 쓴다.
 * 10분이 지나면 다음 요청은 지난 값을 받고, 뒤에서 새로 받는다.
 */
/**
 * 서버 캐시를 거치지 않고 지금 바로 받는다. 워크스페이스마다 받아 합친다.
 * 한 곳이 실패하면 그 팀 몫은 이 서버가 직전에 받은 값을 쓴다. 그래야 잠깐 실패해도 10분 동안 티켓이 사라지지 않는다.
 */
export async function fetchFreshSnapshot(): Promise<Snapshot> {
  const source = getLinearSource()
  if (source.kind === 'fixture') return createFixtureSnapshot()
  const { values, failure, failedTeams } = await fromEachWorkspace(source.workspaces, (ws) =>
    fetchSnapshot(ws, fetch, new Date()),
  )
  const fresh = values.values()
  const parts = source.workspaces.flatMap(({ teamKey }) => {
    if (!failedTeams.includes(teamKey)) return [fresh.next().value!]
    return lastGood ? [teamPartOf(lastGood, teamKey)] : []
  })
  const merged = mergeSnapshots(parts)
  return failure ? { ...merged, failure } : merged
}

/** 합친 값에서 한 팀 몫만 꺼낸다. 이슈 번호 앞 팀 키와 사이클의 팀으로 고른다. */
function teamPartOf(snapshot: Snapshot, teamKey: string): Snapshot {
  return {
    fetchedAt: snapshot.fetchedAt,
    issues: snapshot.issues.filter((i) => i.identifier.startsWith(`${teamKey}-`)),
    cycles: snapshot.cycles.filter((c) => c.team === teamKey),
    // 멤버는 합칠 때 팀을 나누지 않아서 다 넘긴다. 이름이 같으면 한 사람으로 합쳐진다.
    members: snapshot.members,
    project: null,
  }
}

/**
 * 워크스페이스마다 따로 부른다. 한 곳이 실패해도 나머지 값을 주고, 실패한 팀과 이유를 failure에 적는다.
 * values는 성공한 워크스페이스 순서 그대로다. 모두 실패하면 첫 오류를 그대로 낸다.
 */
export async function fromEachWorkspace<T>(
  workspaces: Workspace[],
  load: (ws: Workspace) => Promise<T>,
): Promise<{ values: T[]; failure?: string; failedTeams: string[] }> {
  const settled = await Promise.allSettled(workspaces.map(load))
  const values: T[] = []
  const failures: string[] = []
  const failedTeams: string[] = []
  let firstError: unknown
  settled.forEach((result, n) => {
    if (result.status === 'fulfilled') return void values.push(result.value)
    const { teamKey } = workspaces[n]!
    console.error(`${teamKey} 팀을 Linear에서 받지 못했어요`, result.reason)
    failures.push(`${teamKey} 팀: ${failureReason(result.reason)}`)
    failedTeams.push(teamKey)
    firstError ??= result.reason
  })
  if (values.length === 0) throw firstError
  return failures.length
    ? { values, failure: failures.join(', '), failedTeams }
    : { values, failedTeams }
}

/**
 * 같은 사람·라벨·마일스톤도 워크스페이스마다 id가 다르다. 이름이 같으면 먼저 본 id로 맞춘다.
 * 그래야 사람별 화면, 완료·취소 묶음, 필터에 한 번만 보인다. seed(대시보드 값)의 id를 먼저 본다.
 */
export function unifyIds<T extends Issue>(
  issues: T[],
  seed: { members?: Member[]; issues: Issue[] } = { issues: [] },
): T[] {
  const people = new Map<string, string>()
  const labels = new Map<string, string>()
  const milestones = new Map<string, string>()
  const idOf = (ids: Map<string, string>, name: string, id: string) => {
    if (!ids.has(name)) ids.set(name, id)
    return ids.get(name)!
  }
  const unify = <I extends Issue>(issue: I): I => ({
    ...issue,
    assignee: issue.assignee && {
      ...issue.assignee,
      id: idOf(people, issue.assignee.name, issue.assignee.id),
    },
    labels: issue.labels.map((l) => ({ ...l, id: idOf(labels, l.name, l.id) })),
    milestone: issue.milestone && {
      ...issue.milestone,
      id: idOf(milestones, issue.milestone.name, issue.milestone.id),
    },
  })
  for (const m of seed.members ?? []) idOf(people, m.name, m.id)
  seed.issues.forEach(unify)
  return issues.map(unify)
}

/** 워크스페이스마다 받은 값을 하나로 합친다. 같은 사람은 실명이 같으면 앞(BUK) 워크스페이스의 id로 맞춘다. */
function mergeSnapshots(parts: Snapshot[]): Snapshot {
  // 한 곳만 받았으면 합칠 것이 없다.
  if (parts.length === 1) return parts[0]!
  const names = new Set<string>()
  const members: Member[] = []
  for (const member of parts.flatMap((p) => p.members ?? [])) {
    if (names.has(member.name)) continue
    names.add(member.name)
    members.push(member)
  }
  return {
    // 직전 값을 섞어 쓸 수 있어서 가장 최근에 받은 시각을 쓴다.
    fetchedAt: parts
      .map((p) => p.fetchedAt)
      .sort()
      .at(-1)!,
    issues: unifyIds(
      parts.flatMap((p) => p.issues),
      { members, issues: [] },
    ),
    // 지금 사이클은 앞에 있는 사이클부터 찾는다. 두 곳 사이클이 겹치면 새 티켓을 만드는 CRU 사이클을 고르려고 뒤집는다.
    cycles: parts.toReversed().flatMap((p) => p.cycles),
    members,
    // 진행률 기록이 쌓인 BUK 프로젝트를 먼저 쓴다.
    project: parts.find((p) => p.project)?.project ?? null,
  }
}

// 새로고침이 이미 받아 둔 값. 캐시를 다시 채울 때 Linear를 한 번 더 부르지 않으려고 둔다.
let primed: Snapshot | null = null

/** 다음에 캐시를 채울 때 이 값을 쓴다. */
export function primeNextSnapshot(snapshot: Snapshot) {
  primed = snapshot
}

export const getSnapshot: () => Promise<Snapshot> = unstable_cache(
  async () => {
    const next = primed
    primed = null
    return next ?? fetchFreshSnapshot()
  },
  ['linear-snapshot-v9'],
  { revalidate: TEN_MINUTES, tags: [SNAPSHOT_TAG] },
)

export { MissingApiKeyError }

/** 화면에 짧게 보여 줄 실패 이유 */
function failureReason(error: unknown): string {
  const message = error instanceof Error ? error.message : ''
  if (/rate ?limit|ratelimited/i.test(message)) return 'Linear 요청 한도에 걸렸어요'
  if (error instanceof LinearResponseError) return 'Linear 응답 형식이 달라졌어요'
  if (error instanceof LinearRequestError) return 'Linear가 요청을 받지 않았어요'
  return 'Linear에 연결하지 못했어요'
}

// 이 서버 인스턴스에서 마지막으로 받은 값. 서버 캐시가 비었을 때 Linear가 실패해도 이 값을 보여 준다.
// shortcut: 인스턴스마다 따로라 새로 뜬 인스턴스에는 없다. 그때는 브라우저에 남긴 값을 쓴다.
let lastGood: Snapshot | null = null

export type SnapshotResult = { snapshot: Snapshot } | { snapshot: null; failure: string }

/**
 * 끝나지 않은 티켓과 사이클을 서버 캐시에서 읽는다. 캐시가 오래되면 다음 요청은 지난 값을 받고 뒤에서 새로 받는다.
 * 뒤에서 새로 받다가 실패하면 Next가 지난 캐시 값을 그대로 둔다. 캐시가 비었을 때 실패하면 마지막 성공 값을 쓴다.
 * 운영에서 키가 없는 것은 숨기지 않고 오류를 낸다.
 */
export async function loadSnapshot(): Promise<SnapshotResult> {
  try {
    lastGood = await getSnapshot()
    return { snapshot: lastGood }
  } catch (error) {
    if (error instanceof MissingApiKeyError) throw error
    console.error('Linear에서 새로 받지 못했어요', error)
    const failure = failureReason(error)
    return lastGood ? { snapshot: { ...lastGood, failure } } : { snapshot: null, failure }
  }
}
