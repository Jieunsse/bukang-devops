const LABEL: Record<string, string> = {
  Backlog: '대기',
  Todo: '할 일',
  'In Progress': '진행 중',
  'In Review': '리뷰 중',
  // 작업 요청 내역은 끝난 티켓도 보여 준다.
  Done: '완료',
  Canceled: '취소',
  Duplicate: '중복',
}

/** Linear 상태 이름을 화면 문구로 바꾼다. 모르는 이름은 받은 그대로 둔다. */
export const stateLabel = (state: { name: string }) => LABEL[state.name] ?? state.name

/** 상태 열 순서. 같은 종류 안에서는 Linear에 정해 둔 순서(position)를 따른다. */
export const STATE_TYPE_ORDER = [
  'triage',
  'backlog',
  'unstarted',
  'started',
  'completed',
  'canceled',
]
