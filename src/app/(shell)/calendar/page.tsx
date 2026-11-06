import { CalendarView } from '@/widgets/calendar'

export default function CalendarPage() {
  // data-wide: 큰 모니터에서 달력을 넓게 쓰도록 AppShell의 내용 폭 제한을 푼다.
  // 폭 제한을 푼 대신 넓은 화면에서는 좌우 여백을 더 줘서 칸이 지나치게 옆으로 퍼지지 않게 한다.
  return (
    <div data-wide className="xl:px-8 2xl:px-16">
      <CalendarView />
    </div>
  )
}
