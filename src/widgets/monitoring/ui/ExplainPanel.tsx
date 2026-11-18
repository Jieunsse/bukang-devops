import { getExplanation } from '../model/explain-server'
import { ExplainView } from './ExplainView'

/** 서버에서 캐시된 해석을 읽는다. Suspense 안에 두어 지표가 먼저 보이게 한다 */
export async function ExplainPanel() {
  return <ExplainView result={await getExplanation()} />
}
