import { create } from 'zustand'

import type { Bucket } from '@/entities/ticket'

type DashboardState = {
  /** 마감 목록에 보여 줄 묶음. 숫자 칸과 위쪽 탭이 같은 값을 바꾼다. */
  bucket: Bucket | 'all'
  setBucket: (bucket: Bucket | 'all') => void
}

export const useDashboardStore = create<DashboardState>((set) => ({
  bucket: 'all',
  setBucket: (bucket) => set({ bucket }),
}))
