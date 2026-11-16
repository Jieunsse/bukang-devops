import 'server-only'

import { unstable_cache } from 'next/cache'

import { getLinearSource } from '../../config/env'
import { createFixtureSnapshot } from '../linear/fixture'
import { fromEachWorkspace, getSnapshot, SNAPSHOT_TAG } from '../linear/server'
import { fetchRequestLog, fetchRequestOptions } from './linear'
import type { RequestLogEntry, RequestOptions } from './schema'
import { withRequesterAvatars } from './service'

const TEN_MINUTES = 600

// 키가 없는 로컬 개발 서버에서 쓰는 예시 선택지
const FIXTURE_OPTIONS: RequestOptions = {
  teamId: 'team-buk',
  members: createFixtureSnapshot().members ?? [],
  labels: [
    { id: 'l-bug', name: 'Bug', color: '#eb5757' },
    { id: 'l-feature', name: 'Feature', color: '#bb87fc' },
    { id: 'l-improvement', name: 'Improvement', color: '#4ea7fc' },
  ],
  projects: [
    {
      id: 'p-final',
      name: '크루런 최종프로젝트',
      milestones: [
        { id: 'm-1', name: '핵심 기능' },
        { id: 'm-2', name: '발표 준비' },
      ],
    },
  ],
  cycles: [
    {
      id: 'c-1',
      number: 1,
      name: null,
      startsAt: '2026-11-08T15:00:00.000Z',
      endsAt: '2026-11-15T15:00:00.000Z',
    },
  ],
}

/**
 * 팀원·라벨·프로젝트·사이클은 자주 바뀌지 않아서 서버 전체가 10분 동안 나눠 쓴다.
 * 새 요청은 마지막 워크스페이스(CRU 키가 있으면 CRU, 없으면 BUK)에 만들어서 그 팀의 값을 받는다.
 */
export const getRequestOptions: () => Promise<RequestOptions & { teamKey: string }> =
  unstable_cache(
    async () => {
      const source = getLinearSource()
      if (source.kind === 'fixture') return { ...FIXTURE_OPTIONS, teamKey: 'BUK' }
      const target = source.workspaces.at(-1)!
      // 화면에 어느 팀에 만드는지 보여 주려고 팀 키를 함께 준다.
      return { ...(await fetchRequestOptions(target)), teamKey: target.teamKey }
    },
    ['request-options-v3'],
    { revalidate: TEN_MINUTES },
  )

// 키가 없는 로컬 개발 서버에서 쓰는 예시 내역
const FIXTURE_LOG: RequestLogEntry[] = [
  {
    identifier: 'BUK-예시',
    title: '배포 서버 메모리 늘리기',
    url: 'https://linear.app',
    createdAt: '2026-11-07T01:00:00.000Z',
    requester: '옥지훈',
    assignee: { name: '김호빈', avatarUrl: null },
    state: { id: 's-todo', name: 'Todo', type: 'unstarted', position: 1 },
  },
]

/** 한 워크스페이스를 받지 못했으면 failure에 그 팀과 이유를 적는다. */
export type RequestLogResult = { entries: RequestLogEntry[]; failure?: string }

/** 내역은 최근 이만큼만 보여 준다. 워크스페이스마다 이만큼 받아 합친 뒤 다시 자른다. */
const LOG_LIMIT = 100

/** 두 워크스페이스의 작업 요청 내역. 새 요청을 만들면 대시보드와 같은 태그로 비워 바로 보인다. */
export const getRequestLog: () => Promise<RequestLogResult> = unstable_cache(
  async () => {
    const source = getLinearSource()
    const [{ values, failure }, snapshot] = await Promise.all([
      source.kind === 'live'
        ? fromEachWorkspace(source.workspaces, (ws) => fetchRequestLog(ws))
        : { values: [FIXTURE_LOG], failure: undefined },
      getSnapshot(),
    ])
    const log = values
      .flat()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, LOG_LIMIT)
    const entries = withRequesterAvatars(log, snapshot.members ?? [])
    return failure ? { entries, failure } : { entries }
  },
  ['request-log-v3'],
  { revalidate: TEN_MINUTES, tags: [SNAPSHOT_TAG] },
)
