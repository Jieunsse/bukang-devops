'use client'

import { useEffect, useState } from 'react'

/** 지금 시각. 1분마다 바뀌어 자정이 지나면 날짜 묶음도 바뀐다. */
export function useNow(): number {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])
  return now
}
