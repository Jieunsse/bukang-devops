import { MonitoringView } from '@/widgets/monitoring'
import { loadMonitoring } from '@/widgets/monitoring/model/load'

// 그라파나 토큰은 서버에서만 쓰고, 브라우저에는 계산한 지표만 내려 준다. 1분마다 다시 받는다.
export const revalidate = 60

export default async function MonitoringPage() {
  return <MonitoringView data={await loadMonitoring()} />
}
