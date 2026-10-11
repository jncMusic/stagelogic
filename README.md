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
도메인을 연결하면 `sitemap.xml`을 추가하고 `robots.txt`에 그 주소를 적어 주세요.

## 게시 전 확인할 것

- [ ] 대표 전화 · 이메일 (`assets/js/site.js`)
- [ ] 공개용 주소를 넣을지 (사업자등록 주소가 주거지라면 넣지 않는 쪽 권장)
- [ ] 포트폴리오 각 프로젝트의 역할 표기와 주최 기관의 게시 동의, 사진 사용 권한
- [ ] 회사 소개의 전문가 소개(이력) — 자료를 받으면 `about/index.html`의 `#people` 구역을 채우고 `hidden`을 지운다
- [ ] 클래스로직 상표 (42류 유사 상표 'CLASSLOG' 출원 중) — 확정 전까지 "가칭 · 출시 예정" 유지
- [ ] 도메인 (stagelogiccompany.com, stagelogic.company 등 등록 가능)
