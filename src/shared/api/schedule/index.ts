// 브라우저에서도 가져올 수 있는 것만 둔다. Firestore 호출은 './store'에 있다.
export type { Schedule, ScheduleColor, ScheduleInput, WriteRequest, WriteResult } from './schema'
export {
  DEFAULT_SCHEDULE_COLOR,
  SCHEDULE_COLOR_LABEL,
  SCHEDULE_COLORS,
  scheduleInputSchema,
  TITLE_MAX,
} from './schema'
