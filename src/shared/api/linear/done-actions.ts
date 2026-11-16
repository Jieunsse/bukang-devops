'use server'

import { unstable_cache } from 'next/cache'

import { getLinearSource } from '../../config/env'
import { createFixtureDone } from './done-fixture'
import { doneRangeSchema, type DoneIssue } from './done-schema'
import { fetchDone } from './fetch-done'
import { fromEachWorkspace } from './server'

const TEN_MINUTES = 600

/** 한 워크스페이스를 받지 못했으면 failure에 그 팀과 이유를 적는다. */
export type DoneResult = { issues: DoneIssue[]; failure?: string }

// 기간마다 따로 10분 저장한다. 인자(시작일, 종료일)가 캐시 키에 들어간다.
const getDone = unstable_cache(
  async (start: string, end: string): Promise<DoneResult> => {
    const source = getLinearSource()
    if (source.kind === 'fixture') return { issues: createFixtureDone({ start, end }) }
    const { values, failure } = await fromEachWorkspace(source.workspaces, (ws) =>
      fetchDone(ws, { start, end }),
    )
    const issues = values.flat().sort((a, b) => b.closedAt.localeCompare(a.closedAt))
    return failure ? { issues, failure } : { issues }
  },
  ['linear-done-v2'],
  { revalidate: TEN_MINUTES, tags: ['linear-done'] },
)

/** 브라우저가 부르는 서버 함수. 기간은 브라우저가 보낸 값이라 여기서 다시 검사한다. */
export async function loadDoneAction(range: unknown): Promise<DoneResult> {
  const { start, end } = doneRangeSchema.parse(range)
  return getDone(start, end)
}
