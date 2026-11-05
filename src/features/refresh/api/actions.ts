'use server'

import { refreshSnapshot } from './refresh'

export async function refreshSnapshotAction() {
  return refreshSnapshot()
}
