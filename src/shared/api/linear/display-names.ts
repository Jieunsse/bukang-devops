// Linear 이름이 실명이 아닌 팀원. 이름은 바뀔 수 있어서 Linear 사용자 id로 맞춘다.
const REAL_NAMES: Record<string, string> = {
  '870b71d5-9aed-4a8c-bf90-1972694b203b': '이다윗',
  '833c0d35-5772-4e08-875c-dc85ca4fc8cb': '김호빈',
  'f6ad6c3a-2e01-4c69-b3d6-71966925bd01': '옥지훈',
}

export function displayName(user: { id: string; name: string }): string {
  return REAL_NAMES[user.id] ?? user.name
}
