# 이비서 — VS Code 작업 안내

> 이 문서 하나로 VS Code에서 이비서 프로젝트를 열고, 고치고, 배포할 수 있습니다.
> 작성: 2026-09-09

---

## 0. 5분 세팅

### ① 폴더 열기
VS Code 실행 → `파일 > 폴더 열기` → **`C:\Users\USER\Downloads\ebiseo-project`** 선택

> 반드시 `ebiseo-project`를 여세요. 그 안의 `public`만 열면 git과 도구가 동작하지 않습니다.

### ② 확장 프로그램 설치
폴더를 열면 VS Code가 **"권장 확장 설치"** 알림을 띄웁니다. 눌러서 설치하세요.
알림이 안 뜨면 좌측 확장 아이콘 → 검색창에 `@recommended` 입력.

| 확장 | 하는 일 |
|---|---|
| Live Server | 사이트를 내 컴퓨터에서 미리보기 |
| Korean Language Pack | VS Code 한글화 |
| Code Spell Checker | 오타 잡기 |

### ③ 미리보기
왼쪽 탐색기에서 **`public/index.html`** 우클릭 → **Open with Live Server**
브라우저가 열리고, 파일을 저장할 때마다 **자동으로 새로고침**됩니다.

> 주의: 반드시 `public/index.html`에서 시작하세요. 그래야 `/css`, `/js` 경로가 맞습니다.

---

## 1. 폴더 구조 — 어디를 고쳐야 하나

```
ebiseo-project/
├── public/          ★ 실제 사이트. 이 안만 배포됩니다
│   ├── index.html   홈
│   ├── cost.html, checklist.html, gilil.html, loan.html, safety.html,
│   │   situation.html, policy.html, news.html, board.html, company.html,
│   │   guide.html, about.html, privacy.html, terms.html, contact.html,
│   │   login.html, mypage.html, 404.html
│   ├── guide/       가이드 글 29편
│   ├── css/style.css   디자인 시스템 전체
│   ├── js/
│   │   ├── config.js   ★ 설정은 여기만 고치면 됨 (도메인·GA4·제휴링크·기능플래그)
│   │   ├── common.js   헤더·네비·푸터·공유
│   │   ├── home.js     홈 대시보드 + 빠른 안내 챗봇
│   │   ├── gilil*.js   이사 길일 계산
│   │   └── 그 외 페이지별 스크립트
│   ├── _headers     보안 헤더 + 캐시 정책 (Cloudflare가 읽음)
│   ├── sitemap.xml  46개 URL
│   └── robots.txt
├── docs/            문서 (이 파일, 인수인계 문서)
├── tools/           PowerShell 자동화 스크립트
├── ebiseo-tools.bat 더블클릭하면 도구 메뉴가 뜸
└── .git/            GitHub 저장소 (gayeon5252-gif/ebiseo-site)
```

**핵심 규칙: `public/` 밖의 파일은 사이트에 올라가지 않습니다.**
`docs/`, `tools/`, `*.zip`은 배포에서 자동 제외됩니다.

---

## 2. 자주 하는 작업

### 새 가이드 글 쓰기
**`ebiseo-tools.bat` 더블클릭 → 1번**
한글 제목만 넣으면 영문 주소 생성 + HTML 파일 생성 + 목록 카드 추가 + 사이트맵 등록까지 자동입니다.
그다음 VS Code에서 `public/guide/새글.html`을 열어 본문만 채우세요.

### 글 내용만 수정
`public/guide/*.html`을 직접 편집하고 저장 → Live Server로 확인.
**본문 하단의 "확인 기준일"도 함께 고치세요.**

### 설정 변경 (GA4 ID, 쿠팡 링크, 기능 켜고 끄기)
`public/js/config.js` 한 곳만 고치면 사이트 전체에 반영됩니다.

### CSS나 JS를 고쳤다면 — 캐시 버전 올리기 (중요)
**`ebiseo-tools.bat` → 3번**
모든 HTML의 `?v=14`가 `?v=15`로 일괄 변경됩니다.

> 이걸 빼먹으면 **방문자 브라우저에 옛 스크립트가 남아 화면이 깨집니다.**
> 실제로 예전에 이 문제로 데스크탑에서 선택 메뉴가 안 보이는 사고가 있었습니다.
> HTML만 고쳤으면 안 해도 됩니다.

---

## 3. 배포

### 지금 방식 (수동)
1. **`ebiseo-tools.bat` → 2번** — 배포용 zip 생성 (뺄 파일 자동 제외)
2. https://dash.cloudflare.com → Workers & Pages → `ebiseo` → **Create deployment**
3. Production 선택 → zip 올리기 → **Save and deploy**
4. **`ebiseo-tools.bat` → 4번** — 라이브 사이트 점검 (버전·사이트맵·글 수 대조)

### 더 나은 방식 (권장, 아직 미설정)
Cloudflare Pages를 GitHub 저장소에 연결하면 **`git push`만 하면 자동 배포**됩니다.
zip을 만들 필요도, 대시보드에 들어갈 필요도 없어집니다.

설정: Cloudflare Pages → `ebiseo` → Settings → Builds & deployments → Git 연결
- 저장소: `gayeon5252-gif/ebiseo-site`
- 빌드 명령: 비워둠 (빌드 과정 없음)
- 출력 디렉터리: **`public`**

---

## 4. Git 사용법 (VS Code에서)

저장소는 이미 GitHub `gayeon5252-gif/ebiseo-site`에 연결돼 있습니다.

1. 파일을 고치고 저장
2. 좌측 **소스 제어** 아이콘(가지 모양) 클릭
3. 변경된 파일 옆 **+** 를 눌러 스테이징
4. 위 입력칸에 무엇을 바꿨는지 한글로 적기
5. **커밋** 버튼 → **변경 내용 동기화** (푸시)

**커밋 메시지는 한글로, 무엇을·왜 바꿨는지 적으세요.** 나중에 이 기록이 유일한 단서가 됩니다.
(2026-08-13에 무엇을 바꿨는지 기록이 없어 지금도 확인이 안 되는 항목이 있습니다.)

---

## 5. 절대 하면 안 되는 것

| 금지 | 이유 |
|---|---|
| `public/_redirects`에 규칙 추가 | Cloudflare Pages는 확장자 없는 주소를 기본 처리합니다. Netlify 시절 규칙(`/situation → situation.html`)을 넣으면 **리다이렉트 무한루프**로 페이지가 안 열립니다. 실제로 발생했던 사고입니다 |
| 비밀키를 `public/` 안에 넣기 | Supabase `service_role` 키, 카카오 Client Secret은 프런트엔드에 절대 금지. anon 키는 공개 가능(RLS 보호) |
| 검색엔진 소유확인을 "HTML 파일" 방식으로 | Cloudflare가 `.html` 주소를 308로 되돌려 검증에 실패합니다. **메타태그 방식**을 쓰세요 |
| 네이버에 사이트맵 재제출 | 이미 등록됐고 주기적으로 다시 읽어갑니다. 중복 오류만 납니다. 새 글은 `요청 → 웹 페이지 수집`으로 |
| 디자인 색상값 임의 변경 | 아래 6장 참고 |
| 없는 것을 있는 척 표시 | 가짜 업체·리뷰·제휴를 실제처럼 쓰지 않습니다. 제휴 링크가 비면 블록 자체가 사라지도록 설계돼 있습니다 |

---

## 6. 디자인 시스템 (고정값)

| 용도 | 값 |
|---|---|
| Primary | `#3182F6` |
| Primary Dark | `#1B64DA` |
| 본문 텍스트 | `#4E5968` (제목 `#191F28`) |
| 보조 텍스트 | `#8B95A1` |
| 배경 | `#F2F4F6` |
| 카드 | `#FFFFFF` |
| 테두리 | `#E5E8EB` |

버튼은 알약 모양(`border-radius:999px`), 폰트 Poppins, 아이콘은 둥근 선 스타일.
모바일 하단 탭 5개(홈/비용계산/체크리스트/대출·지원/가이드)는 늘리지 마세요.
데스크탑 상단 메뉴는 9개가 한계입니다. 10개가 되면 920px에서 헤더가 깨집니다.

---

## 7. 문제가 생겼을 때

| 증상 | 원인과 해결 |
|---|---|
| 배포했는데 화면이 그대로 | 캐시. Ctrl+F5. CSS·JS를 고쳤다면 도구 3번으로 버전 올렸는지 확인 |
| 특정 페이지가 안 열림 | `public/_redirects`에 규칙이 들어갔는지 확인 → 있으면 지우기 |
| Live Server에서 CSS가 깨짐 | `public/index.html`이 아닌 곳에서 시작했을 가능성. `public` 기준으로 다시 열기 |
| 배포 화면이 계속 도는 것처럼 보임 | 대개 이미 끝난 상태. 새로고침해서 확인. 반복 업로드 금지 |
| zip에서 폴더가 안 풀림 | PowerShell `Compress-Archive`가 역슬래시를 쓴 경우. 도구 2번을 쓰거나 탐색기 압축 사용 |

---

## 8. 지금 남은 일

**① 트래픽 만들기 (가장 중요)** — 수익은 방문자 수의 함수입니다. 한국어 애드센스 RPM은 1,000~10,000원 수준이라 월 100만원이면 하루 5,000~10,000 페이지뷰가 필요합니다. 새 글을 쓰면 네이버 `웹 페이지 수집 요청` + 구글 `색인 생성 요청`을 거세요.

**② 정기 점검** — `public/loan.html`의 버팀목·디딤돌·청년월세 금리와 한도는 자주 바뀝니다. 각 글의 확인 기준일도 함께 갱신하세요.

**③ 시행일 지난 제도 정리** — `guide/studio-maintenance-fee.html`의 "시행 예정" 표현 (2026-08-28 시행분).

**④ 콘텐츠 후보** — 다가구 선순위 보증금 확인법, 원룸 원상복구 범위, LH 청년매입임대 비교, 반려동물 이사, 어르신 이사, 외국인 임차 절차.

**⑤ 미확인 정보** — 주민등록법상 전입신고 과태료, 월세 세액공제 주택 요건, 주거급여 급지 구분, 보금자리론 요건. 확인되면 `public/policy.html`에 채우세요.

자세한 배경은 `docs/이비서-인수인계.md`를 보세요.

---

## 9. AI에게 이어서 요청할 때

새 대화에서 이렇게 말하면 됩니다.

> "`C:\Users\USER\Downloads\ebiseo-project` 폴더의 `docs/VSCODE-작업안내.md`와 `docs/이비서-인수인계.md`를 읽고 이비서 프로젝트를 이어서 진행해줘."

폴더 접근 권한을 물으면 허용해 주세요.
