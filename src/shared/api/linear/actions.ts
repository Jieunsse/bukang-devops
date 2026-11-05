'use server'

import { getSnapshot } from './server'

// 브라우저가 부르는 서버 함수. 키는 서버에만 있고 데이터만 내려간다.
export async function loadSnapshotAction() {
  return getSnapshot()
}
