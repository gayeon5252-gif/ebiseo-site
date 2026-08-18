# 이비서 — 배포 & 애드센스 승인 가이드

## 1. 배포하기 (무료)
1. GitHub에 `ebiseo` 폴더를 올리고 **GitHub Pages** 활성화, 또는 **Netlify/Vercel**에 폴더를 드래그&드롭.
2. 배포 후 나온 주소(예: `https://ebiseo.netlify.app`)를 확인.
3. 가능하면 **개인 도메인 연결을 권장** (애드센스 승인에 유리).

## 2. 배포 직후 할 일
- `sitemap.xml`, `robots.txt` 안의 `https://내도메인.com`을 실제 주소로 교체.
- [Google Search Console](https://search.google.com/search-console)에 사이트 등록 → sitemap.xml 제출.

## 3. 애드센스 신청
1. [Google AdSense](https://adsense.google.com) 가입 → 사이트 추가.
2. 발급받은 코드 스니펫을 **모든 페이지 `<head>`**에 추가
   (각 html 파일 상단에 주석으로 자리를 만들어 뒀어요 — `index.html` 참고).
3. `ads.txt` 파일의 주석을 해제하고 본인 `pub-ID`로 교체.
4. 심사 대기 (보통 수일~2주).

## 4. 승인 확률을 높이는 팁
- **콘텐츠 추가**: guide.html에 글 6편이 있지만, 승인 전까지 주 1~2편씩 더 쌓을수록 좋아요 (총 15~20편 권장).
- **운영 기간**: 사이트 개설 후 2~4주 이상 지난 뒤 신청하면 유리.
- 필수 페이지(개인정보처리방침·이용약관·소개·문의)는 이미 포함되어 있음.
- 광고 자리 표시(`ad-slot`)는 승인 후 실제 광고 코드로 교체.

## 5. 파일 구조
```
ebiseo/
├─ index.html      홈 (D-day 플래너 + 이비서 챗봇)
├─ cost.html       비용계산 (진단→계산→추가비용→방식비교→준비물)
├─ checklist.html  날짜별 체크리스트 + 행정업무
├─ safety.html     계약 안전센터 + 입주점검 + 예산장
├─ loan.html       대출·지원 진단 + 상환계산기 + 공식링크
├─ company.html    업체 비교·리뷰 + 신혼모드 + 포인트
├─ guide.html      가이드 글 6편 (애드센스 핵심 콘텐츠)
├─ about/privacy/terms/contact.html  정책·소개 페이지
├─ css/style.css   디자인시스템 (토스 클린 블루)
├─ js/             페이지별 스크립트
└─ sitemap.xml, robots.txt, ads.txt
```

## 6. 다음 단계 (PART 2 — 백엔드)
회원가입·로그인(Supabase/Firebase), 마이페이지, 실제 지도 API 거리 계산 등은
백엔드 셋업이 필요해요. 진행 원하시면 "PART 2 진행할게요"라고 말씀해 주세요.
