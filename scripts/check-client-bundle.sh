#!/usr/bin/env sh
# 빌드한 브라우저 번들에 Linear 호출 코드나 키 이름이 들어 있으면 실패한다.
# 키는 서버에만 있어야 하므로, 이 문자열이 보이면 서버 코드가 브라우저로 샌 것이다.
set -eu
test -d .next/static || { echo "먼저 pnpm build를 실행해 주세요." >&2; exit 1; }
if grep -rlE 'api\.linear\.app|LINEAR_API_KEY' .next/static; then
  echo '브라우저 번들에 Linear 서버 코드가 들어 있어요.' >&2
  exit 1
fi
echo '브라우저 번들에 Linear 서버 코드가 없어요.'
