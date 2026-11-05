# CLAUDE.md

크루런 팀(Linear BUK 팀)의 티켓 일정과 기한을 보는 조회 전용 대시보드입니다.
설계 기준은 `docs/spec.md`입니다. 문서에 없는 화면 구성·데이터 범위는 정하지 않고 먼저 묻습니다.

## 명령어

- `pnpm dev`: 개발 서버. `LINEAR_API_KEY`가 없으면 고정 예시 데이터로 동작합니다.
- `pnpm lint && pnpm typecheck && pnpm test`: 커밋 전 검사. `pnpm build`까지 CI에서 돌립니다.
- `pnpm test`는 램을 아끼려고 `--maxWorkers=2`로 돕니다.

## 폴더 (얕은 FSD)

- `src/app`: Next.js 라우팅, 전역 Provider
- `src/widgets`: 화면 덩어리(머리 영역, 메뉴, 대시보드 카드)
- `src/features`: 사용자 동작(필터, 새로고침)
- `src/entities`: 티켓·사이클 같은 데이터 모양과 계산
- `src/shared`: 어디서나 쓰는 도구(날짜, 환경변수, Linear 호출)
- 위 층은 아래 층만 가져옵니다.

## 규칙

- `LINEAR_API_KEY`는 서버 코드에서만 읽습니다. `NEXT_PUBLIC_`를 붙이지 않고, 값을 출력하거나 커밋하지 않습니다.
- 날짜 계산은 모두 한국 시간 기준입니다.
- HeroUI 컴포넌트와 기본 테마를 그대로 씁니다. 상태 색은 기한 세 단계(지남 빨강, 오늘 주황, 그 밖 회색)에만 씁니다.
- 커밋은 Conventional Commits이고 설명은 한글로 시작합니다. commitlint가 검사합니다.
- 화면 문구는 상태값 영어나 코드 이름 대신 뜻으로 씁니다.
