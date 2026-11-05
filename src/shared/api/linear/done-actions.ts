'use server'

import { unstable_cache } from 'next/cache'

import { getLinearSource } from '../../config/env'
import { createFixtureDone } from './done-fixture'
import { doneRangeSchema, type DoneIssue } from './done-schema'
import { fetchDone } from './fetch-done'

const TEN_MINUTES = 600

// 기간마다 따로 10분 저장한다. 인자(시작일, 종료일)가 캐시 키에 들어간다.
const getDone = unstable_cache(
  async (start: string, end: string): Promise<DoneIssue[]> => {
    const source = getLinearSource()
    return source.kind === 'live'
      ? fetchDone(source.apiKey, { start, end })
      : createFixtureDone({ start, end })
  },
  ['linear-done-v1'],
  { revalidate: TEN_MINUTES, tags: ['linear-done'] },
)

/** 브라우저가 부르는 서버 함수. 기간은 브라우저가 보낸 값이라 여기서 다시 검사한다. */
export async function loadDoneAction(range: unknown): Promise<DoneIssue[]> {
  const { start, end } = doneRangeSchema.parse(range)
  return getDone(start, end)
}
