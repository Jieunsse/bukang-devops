// Linear 이름이 실명이 아닌 팀원. 이름은 바뀔 수 있어서 Linear 사용자 id로 맞춘다.
const REAL_NAMES: Record<string, string> = {
  '870b71d5-9aed-4a8c-bf90-1972694b203b': '이다윗',
  '833c0d35-5772-4e08-875c-dc85ca4fc8cb': '김호빈',
  'f6ad6c3a-2e01-4c69-b3d6-71966925bd01': '옥지훈',
}

// 새 워크스페이스(CRU)에서는 같은 사람도 사용자 id가 달라서 Linear 이름으로도 찾는다.
// shortcut: Linear 이름을 바꾸면 놓친다. CRU 사용자 id를 알게 되면 위 목록에 더한다.
const REAL_NAMES_BY_LINEAR_NAME: Record<string, string> = {
  'Da Wit Lee': '이다윗',
  'bari cesco': '김호빈',
  지은세: '옥지훈',
}

export function displayName(user: { id: string; name: string }): string {
  return REAL_NAMES[user.id] ?? REAL_NAMES_BY_LINEAR_NAME[user.name] ?? user.name
}
