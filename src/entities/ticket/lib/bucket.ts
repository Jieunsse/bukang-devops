import type { Issue } from '@/shared/api/linear'
import type { DateString } from '@/shared/lib/date'

export const BUCKETS = ['overdue', 'today', 'thisWeek', 'later', 'noDue'] as const
export type Bucket = (typeof BUCKETS)[number]

export const BUCKET_LABEL: Record<Bucket, string> = {
  overdue: '기한 지남',
  today: '오늘',
  thisWeek: '이번 주',
  later: '그 뒤',
  noDue: '기한 없음',
}

/** today: 한국 시간 오늘, end: 이번 주(사이클 또는 사이클 밖 기간)의 마지막 날 */
export type BucketRange = { today: DateString; end: DateString }

export function bucketOf(dueDate: DateString | null, { today, end }: BucketRange): Bucket {
  if (dueDate === null) return 'noDue'
  if (dueDate < today) return 'overdue'
  if (dueDate === today) return 'today'
  if (dueDate <= end) return 'thisWeek'
  return 'later'
}

/** 묶음마다 기한이 이른 순으로 나눈다. */
export function groupByBucket(issues: Issue[], range: BucketRange): Record<Bucket, Issue[]> {
  const groups: Record<Bucket, Issue[]> = {
    overdue: [],
    today: [],
    thisWeek: [],
    later: [],
    noDue: [],
  }
  const sorted = [...issues].sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
  for (const issue of sorted) groups[bucketOf(issue.dueDate, range)].push(issue)
  return groups
}
