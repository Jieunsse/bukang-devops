import { CalendarView } from '@/widgets/calendar'

export default function CalendarPage() {
  // data-wide: 큰 모니터에서 달력을 넓게 쓰도록 AppShell의 내용 폭 제한을 푼다.
  return (
    <div data-wide>
      <CalendarView />
    </div>
  )
}
