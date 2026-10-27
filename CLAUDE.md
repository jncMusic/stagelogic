# 스테이지로직 (www.stagelogic.kr) — 새 세션 안내

이 파일은 새 세션이 자동으로 읽는다. 지금까지 만든 것 · 정한 것 · 일하는 방식을 여기에 모아 둔다.
더 자세한 설정 방법은 `README.md`, 로고는 `design/logo/README.md`.

## 사용자와 일하는 방식

- **한국어**로, 쉬운 말로. 결과 위주로 짧게 보고하고, 사용자가 할 일은 번호 목록으로.
- **PR 병합(=배포)은 사용자가 "병합"이라고 할 때만.** PR은 초안으로 만들고, 병합 전 `draft:false`로 바꾼 뒤 병합.
- 병합 후에는 실제 사이트에서 동작을 직접 확인하고 알린다 (curl로 API · 페이지 확인).
- **비밀번호 · 키는 대화에 붙여 넣게 하지 않는다.** Vercel 환경 변수에 직접 넣도록 안내.
- **개인 정보는 다른 사람과 공유하지 않는다** (사용자가 위험하다고 명시). 감독 · 알림은 본인 메일로만.
- 개인 메일 주소 · 키 값을 저장소나 PR에 쓰지 않는다 (`ME_MAIL_TO` 등 환경 변수로).
- 데이터를 지어내지 않는다. 모르면 확인하고, 확인할 수 없으면 사용자에게 묻는다.
- 큰 방향(디자인 · 구조)은 시안이나 선택지를 보여 주고 고르게 한다. Playwright로 화면을 찍어 보여 주면 좋아한다.
- 노션 · 캘린더 · 아이폰(단축어 · 시리)을 쓰고, 휴대폰에서는 주로 노션 앱, 컴퓨터에서는 `/me/`.

## 무엇이 있나

정적 HTML 사이트 + Vercel 서버리스 함수(`api/`, `_`로 시작하는 파일은 주소 없음). Vercel 프로젝트 `stagelogic`(무료 요금제).

| 주소 | 무엇 | 데이터 |
|---|---|---|
| `/` `/about/` `/stage/` `/web/` `/academy/` `/classlogic/` `/portfolio/` `/contact/` | 회사 홈페이지 (홈은 흰 코드 × 검은 공연장, `home.css`·`home.js` / 흑백 공통 칸 `sub.css`) | HTML |
| `/work/` | 스테이지로직 업무 흐름 (흐름 · 보드 · 일정 · 목록) | Vercel Blob (`api/checklist.js`) |
| `/me/` | 개인 일정 — J&C · KBA · 개인 · Stagelogic (같은 화면 + 달력 · 영역 · 오늘 탭) | 노션 Action_DB (`api/me.js`) |
| `/rec/` | 휴대폰 홈 화면용 한 줄 기록 | → 노션 |
| `/api/capture/?k=키&t=내용` | 아이폰 단축어 "시리야, 기록" | → 노션 수집함 |
| `/api/me-cal/?k=키` | 구글 · 아이폰 캘린더 구독(.ics, 보기 전용) | 노션 |
| `/api/me-digest/` | 아침 9시 · 저녁 9시 · 일요일 주간 메일 (cron, 최대 1시간 늦음) | 노션 |
| `/api/contact/` `/api/digest/` | 문의 양식 메일, 업무 요약 메일 | |

`/work/`와 `/me/`는 같은 `work/index.html`을 쓰고 주소로 모드를 고른다 (`ME = location.pathname.startsWith("/me")`).

## 노션 (사용자의 David's Workstation, 통합 이름 "개인 일정")

- **Action_DB** `18f46c00-a29b-80c2-8feb-dd7a67f76b84` — 할 일 원본
  - `할일 또는 일정`(제목) · `분야`(J&C · KBA · 개인 · Stagelogic = 화면의 줄) · `태그`(Stagelogic 업무는 예전 분야 이름이 태그)
  - 단계: `시작`=진행 중, `보류`=막힘, `완료` 체크. `안함` 체크 = 안 하기로 함(화면에서 빠짐)
  - 날짜: `날짜`(하루 또는 기간), `데드라인`(있으면 마감일)
  - 분야가 빈 것 = **수집함** (`INBOX_SINCE` 이후, 템플릿 반복 페이지는 제외)
- GTD System `496018d3-…` · Areas `cb24252d-…` · GTD Lists `b7c0b2c8-…` → `/me/` 영역 현황판 (`api/_me-areas.js`)
- 설명 · 메모 · 담당 · 선행 업무 · 기록 · 오늘의 3가지 점검 기록은 노션에 칸이 없어 Blob `me/meta`에 저장
- Notion MCP의 query-data-sources는 사용자 요금제에서 안 됨 → **실제 데이터는 배포된 API로 읽는다**

## `/work/` ↔ 노션 연동 (`api/_checklist-notion.js`)

- `/work/` 업무 41개가 노션 Action_DB의 분야 **Stagelogic** 페이지와 이어져 있음 (`item.notion.id`)
- 제목 · 단계 · 시작일/마감일 · 분야(=노션 태그)를 **양쪽으로** 맞춤. 새 업무 · 삭제(노션 휴지통)도 반영
- `/work/` → 노션은 바로, 노션 → `/work/`는 `/work/`를 열 때(GET, 1분마다). 설명 · 메모 · 담당 · 선행은 따로
- 노션 쓰기 실패는 `notion.dirty`로 남겨 다음에 다시 씀. 이어 둔 업무가 하나도 없으면 연동은 꺼짐

## 습관 시스템 (기록 → 정리 → 점검) — `api/_me-habit.js`, `api/_me-digest.js`

- 기록: 시리 · `/rec/` · `/me/` 입력창 · 노션 → 수집함
- 정리(저녁): 수집함에 분야 · 마감일 붙이기 (마감일 비면 한 번 묻기)
- 점검: 아침에 **오늘의 3가지** 확정(날짜를 오늘로 붙여 캘린더에 보이게), 저녁에 완료/내일로/보류(이유 필수),
  **어제 남은 일** 정리, 마감 3일 넘게 지난 일 **다시 정하기**
- 메일은 `ME_MAIL_TO`로만. `/me/` 메뉴 '아침 메일 미리 받기'로 바로 보내 볼 수 있음

## 실제 데이터 보기 · 고치기 (이 클라우드 환경)

`www.stagelogic.kr` 요청에는 네트워크 시크릿이 에이전트 토큰을 자동으로 붙여 준다 (비밀번호 불필요).

```bash
scripts/checklist.sh list                                   # /work/ 업무 목록
curl -s https://www.stagelogic.kr/api/checklist/            # /work/ 전체 (JSON)
curl -s https://www.stagelogic.kr/api/me/                   # /me/ 업무 (노션)
curl -s "https://www.stagelogic.kr/api/me/?scope=today"     # 오늘: 수집함 · 3가지 · 어제 남은 일 · 통계
curl -s "https://www.stagelogic.kr/api/me/?scope=areas"     # 영역 현황판
```

고칠 때는 같은 주소에 POST (`op: status | update | add | delete`, `/me/`는 `op: capture | triage | top-set | check …`).
노션 페이지를 직접 볼 때는 Notion MCP `notion-fetch`.

## 개발

- 테스트: `npm test` (`tests/` — 노션 · 저장소를 흉내 내는 `fake.mjs` 사용). API를 고치면 꼭 돌리고, 새 기능은 테스트를 더한다
- 화면 확인: Playwright (`executablePath: '/opt/pw-browsers/chromium'`), 로컬은 `python3 -m http.server`
- 코드 주석 · 커밋 메시지는 한국어, 짧게. 주변 코드 스타일을 따른다
- `vercel.json`: `/me/` → `work/index.html` 재작성, cron 4개, trailingSlash
- 환경 변수(값은 Vercel에만): `NOTION_TOKEN` `ME_PASSWORD` `ME_MAIL_TO` `CAPTURE_KEY` `RESEND_API_KEY` `MAIL_FROM` `CHECKLIST_PASSWORD` `CHECKLIST_AGENT_TOKEN` `CRON_SECRET`(선택)

## 로고 · 브랜드

- **가이드 · 색 · 글씨 · 시안 기록: `design/logo/README.md`** — 로고 작업 전에 먼저 읽기
- 확정: **K2** (코드 기호 `</>` + 금색 무대 바닥, 버건디 `#8e2433` + 금색 `#c9a24a`)
  - 메인 글씨 `STAGELOGIC`(Outfit, 넓은 자간), 보조 `StageLogic`(Cormorant 세리프)
- 파일 `assets/brand/`, 다시 만들기 `design/logo/tools/build.py` → `png.mjs`
- `design/`과 이 파일은 웹사이트에 올라가지 않음 (`.vercelignore`)

## 지난 결정 (다시 묻지 말 것)

- 슬로건 **'코드를 예술로'** (설명을 붙이지 않는다). 꼬리말 '무대엔 예술을, 코드엔 논리를'은 그대로
- 홈 첫 화면은 흰 코드(고딕) × 검은 공연장(명조) 가로 대비 + 약 2초 애니메이션. 아래 칸 큰 글씨는 서비스 이름 그대로(효율적인 학원관리 · 감각적인 홈페이지 · 음악회 기획/연출 대행)
- 말투: 손님을 달래는 말('괜찮아요, 저희가…') · 식상한 카피 · 동사 함축 카피('막을 올리다' 등) 쓰지 않음
- 1순위는 학원 솔루션 판매(대상: 예술학원 전체). 개원 · 운영 컨설팅(무형) + 개원 · 운영 체크리스트(유형)를 패키지로, 클래스로직이 본상품
- `/work/`는 그대로 쓰되 노션과 양쪽 연동. `/me/`는 개인 전용 (공유 안 함)
- 분야는 J&C · KBA · 개인 · Stagelogic 네 개, 세부 구분은 노션 `태그`
- 캘린더: 노션 캘린더는 Action_DB의 `날짜` 칸으로, 구글은 `/me/` 메뉴의 구독 주소로
- 38번 공연(서울교육가족 '한겨울의 클래식 향연')은 **2023. 12. 28** (홈페이지 맞음, PDF는 사용자가 직접 고침)
- 로고 시안에서 탈락: 원형 무대(E1~E3), 무대 선 · 스포트라이트 · 한글 중심(A · D · F), "꺾쇠가 조명" 같은 억지 설명
