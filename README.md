# bukang-devops

크루런 팀의 Linear 티켓을 기한별로 모아 보는 대시보드입니다.
티켓은 보기만 하고 수정은 Linear에서 합니다. 달력의 「일정 보기」에서는 팀 일정을 팀 비밀번호로 추가·수정·삭제합니다.

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

### 환경변수

값은 Vercel 프로젝트 설정에만 넣고 저장소에 커밋하지 않습니다. 이름과 뜻은 `.env.example`에도 있습니다.

| 이름                      | 뜻                                                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `LINEAR_API_KEY`          | Linear 개인 API 키                                                                                                                         |
| `SCHEDULE_PASSWORD`       | 달력 일정을 추가·수정·삭제할 때 넣는 팀 비밀번호. 비어 있으면 아무도 바꿀 수 없습니다. 시도 횟수 제한이 없어서 16자 이상 무작위로 정합니다 |
| `FIREBASE_PROJECT_ID`     | Firebase 프로젝트 ID (서비스 계정 키 파일의 `project_id`)                                                                                  |
| `FIREBASE_CLIENT_EMAIL`   | 서비스 계정 이메일 (키 파일의 `client_email`)                                                                                              |
| `FIREBASE_PRIVATE_KEY`    | 서비스 계정 비밀 키 (키 파일의 `private_key`). 줄바꿈은 `\n` 글자 그대로 넣어도 됩니다                                                     |
| `GA4_PROPERTY_ID`         | 「이용 통계」가 읽는 크루런 GA4 속성 ID(숫자). 측정 ID(`G-`로 시작)가 아닙니다                                                             |
| `GA4_SERVICE_ACCOUNT_KEY` | GA4 속성 뷰어 권한이 있는 서비스 계정 키 JSON 한 줄, 또는 그 JSON의 base64. 비어 있으면 「이용 통계」에 연결 정보 없음 안내가 나옵니다     |

Firebase 값 세 개가 모두 있어야 Firestore에 저장합니다. 로컬 개발 서버에서 비어 있으면 서버 메모리에 저장하고, Vercel(운영·미리보기)에서 비어 있으면 일정 보기에 오류가 납니다.
Firestore 보안 규칙은 `firestore.rules`입니다. 브라우저에서 바로 읽고 쓰는 것을 모두 막고, 앱 서버만 서비스 계정으로 읽고 씁니다.

설계는 [docs/spec.md](docs/spec.md)에 있습니다.
