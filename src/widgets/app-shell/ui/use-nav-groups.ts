'use client'

import { useCallback, useState, useSyncExternalStore } from 'react'

import type { NavGroupId } from './nav'

// 메뉴 그룹을 펼치고 접은 상태. localStorage에 기억하고, 저장소를 못 쓰는 환경에서는 이 화면 안에서만 기억한다.
// 지금 페이지가 든 그룹은 사용자가 이번에 접지 않았다면 펼쳐진 채로 시작해, 현재 위치가 메뉴에서 사라지지 않게 한다.

const KEY = 'bukang-devops:nav-groups'
const EVENT = 'nav-groups-change'
type Saved = Partial<Record<NavGroupId, boolean>>

function read(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange)
  window.addEventListener(EVENT, onChange)
  return () => {
    window.removeEventListener('storage', onChange)
    window.removeEventListener(EVENT, onChange)
  }
}

function parse(raw: string | null): Saved {
  if (!raw) return {}
  try {
    const v: unknown = JSON.parse(raw)
    return v && typeof v === 'object' ? (v as Saved) : {}
  } catch {
    return {}
  }
}

export function useNavGroups(currentGroup: NavGroupId | null) {
  // 서버에서 그릴 때는 저장값이 없다(null)고 보고, 브라우저에서 읽은 값으로 다시 그린다
  const raw = useSyncExternalStore(subscribe, read, () => null)
  // 이번 화면에서 누른 값. 저장소를 못 써도 누른 대로 바뀌게 한다
  const [clicked, setClicked] = useState<Saved>({})
  const saved = parse(raw)

  const isExpanded = (id: NavGroupId) =>
    clicked[id] ?? (id === currentGroup ? true : (saved[id] ?? false))

  const setExpanded = useCallback((id: NavGroupId, expanded: boolean) => {
    setClicked((c) => ({ ...c, [id]: expanded }))
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...parse(read()), [id]: expanded }))
      window.dispatchEvent(new Event(EVENT))
    } catch {
      // 저장소를 못 쓰면 이 화면 안에서만 기억한다
    }
  }, [])
  return { isExpanded, setExpanded }
}
