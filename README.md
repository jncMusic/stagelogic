# 스테이지로직 컴퍼니 홈페이지

스테이지로직 컴퍼니(StageLogic Company)의 회사 홈페이지입니다.
빌드 과정 없는 정적 사이트(HTML · CSS · JS)라서 파일을 고치면 그대로 반영됩니다.

## 화면 구성

| 페이지 | 경로 | 내용 |
| --- | --- | --- |
| 홈 | `/` | 슬로건, 세 사업 소개, 핵심 가치, 대표 포트폴리오 |
| 회사 소개 | `/about/` | 이름의 의미, 핵심 가치, 사업 구조, 기업 정보 |
| 공연기획 | `/stage/` | 서비스 내용, 진행 과정, 사례 |
| 홈페이지 제작 | `/web/` | 서비스 내용, 제작 과정, 사례 |
| 클래스로직 | `/classlogic/` | 기능 소개, 출시 알림 신청 (가칭·출시 예정 표기) |
| 포트폴리오 | `/portfolio/` | 분야별 거르기 (전체 / 공연기획 / 홈페이지 / 솔루션) |
| 문의 | `/contact/` | 상담 문의 양식, 연락처 |

## 파일 구조

```
index.html              홈
about/ stage/ web/      각 페이지 (폴더마다 index.html)
classlogic/ portfolio/
contact/
404.html                없는 주소로 들어왔을 때
assets/css/style.css    공통 스타일 (색상은 맨 위 :root 에서 바꿈)
assets/js/site.js       메뉴, 포트폴리오 거르기, 문의 양식, 연락처
assets/favicon.svg      브라우저 탭 아이콘
```

머리말 메뉴와 꼬리말은 각 페이지에 똑같이 들어 있습니다. 메뉴를 바꿀 때는 모든 페이지를 함께 고쳐 주세요.

## 연락처 넣기

대표 전화와 이메일이 정해지면 `assets/js/site.js` 맨 위만 채우면 됩니다.

```js
const CONTACT = {
  email: 'hello@example.com',
  phone: '02-000-0000',
};
```

비어 있는 동안은 화면에 "준비 중"으로 나옵니다.
문의 양식은 서버 없이 방문자의 메일 앱을 열어 위 주소로 보내는 방식입니다.
나중에 문의를 바로 받아 두고 싶으면 Formspree 같은 양식 서비스나 Firebase로 바꿀 수 있습니다.

## 미리 보기

```bash
python3 -m http.server 8000
```

브라우저에서 http://localhost:8000 을 엽니다.

## 배포

Vercel의 `jncmusic's projects` 팀에 `stagelogic` 프로젝트로 연결되어 있습니다.
`main`에 올라가면 정식 사이트가, PR을 올리면 미리보기 주소가 자동으로 만들어집니다.
빌드 명령은 비워 두고, 출력 폴더는 저장소 최상위(`.`)로 둡니다.

### 도메인

정식 주소는 `www.stagelogic.kr` 입니다. (Vercel 기본 방식) 나머지 주소는 모두 이쪽으로 넘깁니다.

| 주소 | 설정 |
| --- | --- |
| `www.stagelogic.kr` | 정식 주소 (Production) |
| `stagelogic.kr` | `www.stagelogic.kr` 로 308 이동 |
| `stagelogic.co.kr` | `www.stagelogic.kr` 로 308 이동 |
| `www.stagelogic.co.kr` | `www.stagelogic.kr` 로 308 이동 (Vercel 화면에서 설정이 막혀 `vercel.json` 에서 처리) |

각 페이지의 `canonical` · `og:url`, `sitemap.xml`, `robots.txt` 가 모두 `https://www.stagelogic.kr` 기준입니다.
페이지를 새로 만들면 `sitemap.xml` 에도 한 줄 추가해 주세요.

## 업무 흐름 (`/work/`)

회사 내부용 업무 관리 화면입니다. 비밀번호를 넣어야 열리고, 검색엔진에는 노출되지 않습니다.
데이터는 Vercel Blob에 JSON 파일로 저장되며, 저장할 때마다 순번이 붙은 새 파일을 만들고 최근 5개를 백업으로 남깁니다.

- **흐름**: 분야(가로줄) × 단계(할 일 · 진행 중 · 막힘 · 완료) 지도. 카드를 끌어 단계 · 분야를 옮기고, 선행 업무는 화살표로 이어집니다. 카드에 마우스를 올리면 이어진 업무만 또렷해집니다.
- **보드**: 단계별 칸반. 설명 · 메모까지 보입니다.
- **일정**: 시작일 · 마감일 막대. 끌어서 날짜를 옮기고, 오른쪽 끝을 끌어 마감일을 바꿉니다.
- **목록**: 정렬되는 표.
- 업무를 누르면 오른쪽에서 모든 칸(단계 · 분야 · 담당 · 날짜 · 선행 · 메모)을 바로 고치고, 누가 언제 무엇을 바꿨는지 기록이 남습니다.
- 분야는 메뉴 → 분야 관리에서 이름 · 순서를 바꾸고 추가합니다(최대 8개, 분야마다 고유 색).
- 단축키: `N` 새 업무, `/` 검색, `1`~`4` 화면 전환, `Esc` 닫기.

처음 한 번 Vercel 화면에서 설정합니다.

1. 프로젝트 → Storage → Create → **Blob** 을 만들고 `stagelogic` 프로젝트에 연결합니다. (연결 정보 `BLOB_STORE_ID` 가 자동으로 들어갑니다. 예전 방식 저장소는 `BLOB_READ_WRITE_TOKEN`.)
2. 프로젝트 → Settings → Environment Variables 에 `CHECKLIST_PASSWORD` 를 추가합니다.
   Production 에 체크되어 있어야 정식 주소에서 열립니다.
3. 다시 배포(Redeploy)한 뒤 `/work/` 에서 비밀번호로 열고, 백업 파일(.json)을 불러옵니다.

### Claude가 점검표를 고치게 하기

Claude는 비밀번호 대신 따로 발급한 토큰으로 점검표를 읽고 고칩니다. 토큰을 지우면 바로 막힙니다.

1. 긴 무작위 문자열을 하나 만듭니다. (비밀번호 생성기 등)
2. Vercel → Settings → Environment Variables 에 `CHECKLIST_AGENT_TOKEN` 으로 넣고(Production) 다시 배포합니다.
3. Claude 클라우드 환경 편집 화면에서
   - 네트워크 시크릿: 호스트 `www.stagelogic.kr`, `Authorization: Bearer <같은 값>` 으로 추가
     (시크릿 칸이 없으면 환경 변수 `CHECKLIST_AGENT_TOKEN` 으로)
   - 네트워크 액세스: 허용 도메인에 `www.stagelogic.kr` 추가. 새 세션부터 적용됩니다.

Claude는 `scripts/checklist.sh` 로 목록 보기, 상태 · 메모 바꾸기, 항목 추가 · 삭제를 합니다.

## J&C · 개인 흐름 (`/me/`)

`/work/` 와 같은 화면으로 J&C · KBA · 개인 업무를 봅니다. 업무 원본은 노션 **Action_DB** 이고, 스테이지로직 업무와는 데이터 · 비밀번호가 따로입니다.

- **분야 줄** = Action_DB의 `분야` 선택지(지금은 J&C · KBA · 개인) (노션에서 이름 · 색을 바꾸거나 늘리면 화면도 그대로 따라감)
- **태그** = Action_DB의 `태그` 선택지. 카드에 `#태그`로 보이고, 위쪽 필터로 골라 볼 수 있음 (/me/ 에서는 담당 대신 태그를 고름)
- **보이는 업무** = `분야`가 정해진 업무 중 `안함`이 아닌 것 (완료한 업무는 최근 60일 안에 고친 것만)
- **상태** = `시작`(진행 중) · `보류`(막힘) · `완료` 체크와 맞물림
- **날짜** = `날짜`(기간이면 시작~마감, 하루면 그날이 마감), `데드라인`을 쓰던 업무는 마감일이 `데드라인`으로 감
- 설명 · 메모 · 담당 · 선행 업무 · 기록은 노션에 칸이 없어서 Blob(`me/meta-…`)에 업무별로 저장
- 삭제하면 노션 휴지통으로 이동 (30일 안에 되살릴 수 있음)

처음 한 번 설정:

1. https://www.notion.so/profile/integrations 에서 **새 내부 통합** 만들기 → 비밀 키 복사
2. 노션에서 Action_DB 페이지 오른쪽 위 `⋯` → **연결** → 만든 통합 추가
3. Vercel 환경 변수에 `NOTION_TOKEN`(1번 키), `ME_PASSWORD`(이 화면 비밀번호) 넣고 다시 배포

Claude도 `/api/me/` 를 `/api/checklist/` 와 같은 토큰으로 읽고 고칠 수 있습니다.

## 메일 (문의 양식 · 아침 업무 요약)

- 문의 양식은 `/api/contact/` 로 보내져 대표 메일로 들어옵니다. 보낸 분이 이메일을 적었으면 **답장**이 그분께 바로 갑니다.
  서버 메일 설정 전이거나 실패하면 예전처럼 방문자의 메일 앱을 엽니다.
- 평일 아침 8시(한국 시각)에 `/api/digest/` 가 업무 흐름 요약(마감 지남 · 오늘 · 3일 안 · 막힘 · 진행 중)을 보냅니다. (`vercel.json` 의 `crons`)

Vercel → Settings → Environment Variables (Production):

| 이름 | 값 |
| --- | --- |
| `RESEND_API_KEY` | [Resend](https://resend.com) 에서 발급한 키 |
| `MAIL_TO` | 받는 주소 (없으면 `stagelogic@naver.com`) |
| `MAIL_FROM` | 보내는 주소. 도메인 인증 후 `스테이지로직 <hello@stagelogic.kr>` (없으면 Resend 시험 주소 — 이때는 Resend 가입 메일로만 감) |
| `CRON_SECRET` | 아무 긴 무작위 문자열 (요약 메일 주소를 남이 부르지 못하게) |

도메인 인증: Resend → Domains 에 `stagelogic.kr` 를 추가하면 DNS 레코드 몇 줄이 나옵니다. 카페24 DNS 에 그대로 넣습니다(끝의 점 없이).

## 게시 전 확인할 것

- [x] 대표 전화 · 이메일 (`assets/js/site.js`)
- [ ] 공개용 주소를 넣을지 (사업자등록 주소가 주거지라면 넣지 않는 쪽 권장)
- [ ] 포트폴리오 각 프로젝트의 역할 표기와 주최 기관의 게시 동의, 사진 사용 권한
- [ ] 회사 소개의 전문가 소개(이력) — 자료를 받으면 `about/index.html`의 `#people` 구역을 채우고 `hidden`을 지운다
- [ ] 클래스로직 상표 (42류 유사 상표 'CLASSLOG' 출원 중) — 확정 전까지 "가칭 · 출시 예정" 유지
- [x] 도메인 구입 (stagelogic.kr, stagelogic.co.kr)
- [x] 도메인 연결 (Vercel → Settings → Domains, 위 표대로)
