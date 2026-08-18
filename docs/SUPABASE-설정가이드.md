# Supabase 인증 설정 가이드 (PART 2-①)

로그인 기능을 켜려면 아래 순서대로 진행하세요. 약 10~15분 걸려요.

## 1. 프로젝트 만들기 (무료)
1. https://supabase.com 접속 → **Start your project** → GitHub 또는 이메일로 가입
2. **New Project** 클릭
   - Name: `ebiseo`
   - Database Password: 아무거나 강력하게 (기록해 두세요)
   - Region: `Northeast Asia (Seoul)`
3. 생성 완료까지 1~2분 대기

## 2. 키 복사해서 붙여넣기
1. 대시보드 왼쪽 ⚙ **Project Settings → API**
2. 두 값을 복사:
   - **Project URL** (예: `https://abcdefgh.supabase.co`)
   - **anon public** 키 (`eyJ...`로 시작하는 긴 문자열)
3. `js/config.js` 파일을 열어 붙여넣기:
```js
window.EBISEO_CONFIG = {
  SUPABASE_URL: 'https://abcdefgh.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1...'
};
```
> ⚠ `anon` 키는 공개되어도 되는 키예요(권한은 RLS로 제한).
> **`service_role` 키는 절대 config.js에 넣지 마세요.**

## 3. 이메일 로그인 활성화 (기본으로 켜져 있음)
- **Authentication → Providers → Email** 이 Enabled인지 확인
- 기본 설정은 "가입 확인 메일" 발송 — 테스트 중 번거로우면
  **Authentication → Providers → Email → Confirm email**을 끄면 즉시 로그인됩니다

## 4. 소셜 로그인 (선택)
### Google
1. https://console.cloud.google.com → 프로젝트 생성 → **API 및 서비스 → 사용자 인증 정보**
2. **OAuth 클라이언트 ID** 생성(웹 애플리케이션)
   - 승인된 리디렉션 URI: `https://<프로젝트ID>.supabase.co/auth/v1/callback`
3. 발급된 Client ID/Secret을 Supabase **Authentication → Providers → Google**에 입력 후 Enable

### Kakao
1. https://developers.kakao.com → 애플리케이션 추가
2. **카카오 로그인 활성화** → Redirect URI에 `https://<프로젝트ID>.supabase.co/auth/v1/callback` 등록
3. **동의항목**에서 이메일 동의 설정
4. REST API 키(Client ID)와 Client Secret(보안 탭에서 발급)을 Supabase **Providers → Kakao**에 입력 후 Enable

## 5. 사이트 주소 등록 (배포 후 필수)
- **Authentication → URL Configuration**
  - Site URL: 배포 주소 (예: `https://ebiseo.netlify.app`)
  - Redirect URLs에도 같은 주소 추가
- 로컬 테스트는 `http://localhost` 계열만 허용되므로,
  파일을 직접 열지 말고 간단 서버로 테스트하세요:
  `ebiseo` 폴더에서 `npx serve` 또는 VS Code Live Server

## 6. 동작 확인
1. `login.html` 접속 → 상단 "백엔드 미연결" 경고가 **사라졌는지** 확인
2. 회원가입 → (확인 메일) → 로그인
3. 로그인 후 헤더 오른쪽에 👤 닉네임 버튼이 뜨면 성공!

## 문제 해결
| 증상 | 원인·해결 |
|---|---|
| "백엔드 미연결" 계속 표시 | config.js 값 오타, 따옴표 누락 확인 |
| 소셜 버튼 오류 | 해당 Provider가 Supabase에서 Enable 안 됨 |
| OAuth 후 이상한 페이지 | URL Configuration의 Site URL 미설정 |
| 가입 메일이 안 옴 | 스팸함 확인, 또는 Confirm email 끄기 |
