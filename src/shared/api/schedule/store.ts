import 'server-only'

import { randomUUID } from 'node:crypto'

import { cert, getApp, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { z } from 'zod'

import { scheduleSchema, type Schedule } from './schema'
import type { ScheduleStore } from './service'

const COLLECTION = 'schedules'
// gRPC 상태 코드: 문서가 없음
const NOT_FOUND = 5
const APP_NAME = 'schedules'

const envSchema = z.object({
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  VERCEL_ENV: z.enum(['production', 'preview', 'development']).optional(),
})

export class MissingFirebaseError extends Error {
  constructor() {
    super('배포 환경에 Firebase 서비스 계정 값이 없어요.')
    this.name = 'MissingFirebaseError'
  }
}

/**
 * Firebase 값이 있으면 Firestore, 없으면 서버 메모리.
 * Vercel(운영·미리보기)에서 값이 없으면 오류를 낸다. 서버가 여러 개 떠서 메모리 저장이 맞지 않는다.
 */
export function getScheduleStore(env: Record<string, string | undefined> = process.env) {
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, VERCEL_ENV } =
    envSchema.parse(env)
  if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
    return firestoreStore({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      // Vercel 환경변수에는 줄바꿈이 \n 글자로 들어간다.
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    })
  }
  if (VERCEL_ENV) throw new MissingFirebaseError()
  return memoryStore
}

const sortByStart = (list: Schedule[]) =>
  list.toSorted((a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title))

function firestoreStore(credential: {
  projectId: string
  clientEmail: string
  privateKey: string
}): ScheduleStore {
  const app = getApps().some((a) => a.name === APP_NAME)
    ? getApp(APP_NAME)
    : initializeApp({ credential: cert(credential) }, APP_NAME)
  const col = getFirestore(app).collection(COLLECTION)
  return {
    async list() {
      const snap = await col.get()
      // 콘솔에서 손으로 넣은 문서처럼 모양이 틀린 문서는 건너뛰어 나머지 일정은 보이게 한다.
      const parsed = snap.docs.map((d) => scheduleSchema.safeParse({ ...d.data(), id: d.id }))
      return sortByStart(parsed.flatMap((p) => (p.success ? [p.data] : [])))
    },
    async create(input) {
      await col.add(input)
    },
    async update(id, input) {
      try {
        await col.doc(id).update(input)
        return true
      } catch (error) {
        if ((error as { code?: unknown }).code === NOT_FOUND) return false
        throw error
      }
    },
    async remove(id) {
      await col.doc(id).delete()
    },
  }
}

// shortcut: 로컬 개발 서버에서만 쓰고 서버를 다시 켜면 사라진다. Firebase 값을 넣으면 Firestore를 쓴다.
const memory = new Map<string, Schedule>()
const memoryStore: ScheduleStore = {
  async list() {
    return sortByStart([...memory.values()])
  },
  async create(input) {
    const id = randomUUID()
    memory.set(id, { ...input, id })
  },
  async update(id, input) {
    if (!memory.has(id)) return false
    memory.set(id, { ...input, id })
    return true
  },
  async remove(id) {
    memory.delete(id)
  },
}
