'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * 요소의 실제 폭(px). SVG viewBox 폭을 이 값으로 두면 축 글자가 늘거나 줄지 않고 정한 크기(12px)로 보인다.
 * 재기 전(서버 그리기·테스트)에는 fallback을 쓴다.
 */
export function useWidth<T extends Element>(fallback: number) {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(fallback)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry?.contentRect.width ?? 0)
      if (w > 0) setWidth(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return { ref, width }
}
