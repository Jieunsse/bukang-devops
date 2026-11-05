import { create } from 'zustand'

import type { Bucket } from '@/entities/ticket'
import type { DateString } from '@/shared/lib/date'

type DashboardState = {
  /** 마감 목록에 보여 줄 묶음. 숫자 칸과 위쪽 탭이 같은 값을 바꾼다. */
  bucket: Bucket | 'all'
  /** 달력에서 고른 날짜. 고르면 마감 목록이 그날 기한 티켓만 보여 준다. */
  date: DateString | null
  setBucket: (bucket: Bucket | 'all') => void
  setDate: (date: DateString | null) => void
}

// 묶음과 날짜는 한 번에 하나만 고른다. 하나를 고르면 다른 하나는 풀린다.
export const useDashboardStore = create<DashboardState>((set) => ({
  bucket: 'all',
  date: null,
  setBucket: (bucket) => set({ bucket, date: null }),
  setDate: (date) => set({ date, bucket: 'all' }),
}))
