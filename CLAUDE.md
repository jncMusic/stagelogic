# 스테이지로직 (www.stagelogic.kr)

- 정적 HTML 사이트 + Vercel 서버리스 함수(`api/`, `_`로 시작하는 파일은 주소가 없음). 자세한 구조 · 설정은 `README.md`.
- 사용자와는 한국어로 이야기한다. PR 병합(배포)은 사용자가 "병합"이라고 할 때만.
- 비밀번호 · 키는 대화에 붙여 넣게 하지 않는다 (Vercel 환경 변수로 직접 넣게 안내).

## 로고 · 브랜드

- **가이드 · 색 · 글씨 · 시안 기록: `design/logo/README.md`** — 로고 작업 전에 먼저 읽기
- 최종 파일: `assets/brand/` (메인 = 넓은 대문자, 보조 = 세리프, 아이콘 · 한 색 포함)
- 다시 만들기: `design/logo/tools/build.py` → `png.mjs`
- `design/`은 웹사이트에 올라가지 않음 (`.vercelignore`)
