# bukang-devops

크루런 팀의 Linear 티켓을 기한별로 모아 보는 대시보드입니다.
보기만 하는 앱이라 티켓 수정은 Linear에서 합니다.

## 시작하기

```bash
pnpm install
pnpm dev
```

`LINEAR_API_KEY` 없이 실행하면 고정 예시 데이터가 나옵니다.
실제 데이터를 보려면 `.env.example`을 `.env.local`로 복사하고 Linear 개인 API 키를 넣습니다.

## 검사

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

GitHub Actions가 PR과 main 푸시마다 같은 검사를 돌립니다.

## 배포

Vercel에 이 저장소를 연결해 배포합니다. PR마다 미리보기 주소가 생기고, main에 푸시하면 운영에 배포됩니다.
함수는 서울 지역(`icn1`)에서 돕니다. 운영 환경변수에 `LINEAR_API_KEY`가 없으면 오류 화면이 나옵니다.

설계는 [docs/spec.md](docs/spec.md)에 있습니다.
