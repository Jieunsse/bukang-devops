'use server'

import { writeSchedule } from './service'
import { getScheduleStore } from './store'

// 브라우저가 부르는 서버 함수. 비밀번호 확인과 저장은 서버에서만 한다.
export async function listSchedulesAction() {
  return getScheduleStore().list()
}

export async function writeScheduleAction(password: unknown, request: unknown) {
  return writeSchedule(getScheduleStore(), process.env.SCHEDULE_PASSWORD, password, request)
}
