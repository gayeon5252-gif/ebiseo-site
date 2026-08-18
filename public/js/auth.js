/* ============================================================
   인증 공통 모듈 (Supabase Auth)
   - config.js에 키가 있으면 Supabase SDK를 동적 로드해 연결
   - 키가 없으면 '미연결 모드' — UI는 보이되 데모 안내
   - 헤더에 로그인/마이페이지 버튼 자동 삽입
   - window.ebAuth 로 각 페이지에서 사용
   ============================================================ */
(function () {
  const cfg = window.EBISEO_CONFIG || {};
  const enabled = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY);
  let client = null;
  const readyCallbacks = [];

  window.ebAuth = {
    enabled,
    client: () => client,
    /* 로그인된 사용자 반환 (없으면 null) */
    async getUser() {
      if (!client) return null;
      const { data } = await client.auth.getUser();
      return data && data.user ? data.user : null;
    },
    async signUp(email, password) {
      return client.auth.signUp({ email, password });
    },
    async signIn(email, password) {
      return client.auth.signInWithPassword({ email, password });
    },
    /* provider: 'google' | 'kakao' */
    async signInOAuth(provider) {
      const base = (window.SITE_URL || location.origin);
      const options = { redirectTo: base + '/mypage' }; // 확장자 없는 클린 URL로 복귀
      /* 참고: Supabase는 카카오에 account_email·profile_image·profile_nickname을 항상 요청합니다.
         (여기서 scopes를 지정해도 빠지지 않고 뒤에 덧붙기만 합니다.)
         따라서 카카오 개발자센터 [카카오 로그인 > 동의항목]에서 이 세 항목이 모두
         '사용 안 함'이 아니어야 합니다. 하나라도 빠지면 카카오가 KOE205를 냅니다.
         이메일 항목은 비즈 앱에서만 설정할 수 있습니다. (2026-08 전환 완료) */
      return client.auth.signInWithOAuth({ provider, options });
    },
    async signOut() {
      await client.auth.signOut();
      location.href = '/';
    },
    /* 보호 라우트 가드: 미로그인 시 로그인 페이지로 */
    async requireLogin() {
      if (!enabled) return null; // 미연결 모드에서는 페이지가 데모 안내 표시
      const user = await this.getUser();
      if (!user) { location.href = '/login?next=' + encodeURIComponent(location.pathname.replace(/\.html$/, '')); }
      return user;
    },
    onReady(cb) { client ? cb() : readyCallbacks.push(cb); }
  };

  /* ---------- Supabase SDK 동적 로드 ---------- */
  function initClient() {
    client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    readyCallbacks.forEach(cb => cb());
    updateHeaderButton();
  }
  if (enabled) {
    if (window.supabase) initClient();
    else {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
      s.onload = initClient;
      s.onerror = () => console.warn('Supabase SDK 로드 실패 — 오프라인이거나 네트워크 문제');
      document.head.appendChild(s);
    }
  }

  /* ---------- 헤더 로그인/마이 버튼 ---------- */
  async function updateHeaderButton() {
    const header = document.querySelector('.header-inner');
    if (!header) return;
    let slot = document.getElementById('auth-slot');
    if (!slot) {
      slot = document.createElement('div');
      slot.id = 'auth-slot';
      slot.style.cssText = 'display:flex;gap:6px;align-items:center';
      header.appendChild(slot);
    }
    const page = location.pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/';
    const user = enabled ? await window.ebAuth.getUser() : null;
    if (user) {
      const meta = user.user_metadata || {};
      /* 카카오 로그인은 이메일이 없을 수 있으므로 닉네임을 먼저 사용 */
      const name = meta.nickname || meta.name || meta.full_name ||
                   (user.email ? user.email.split('@')[0] : '내 정보');
      slot.innerHTML = '<a class="btn btn-sm btn-outline" href="/mypage">👤 ' + (window.escapeHtml?escapeHtml(name):name) + '</a>';
    } else if (page !== '/login') {
      slot.innerHTML = '<a class="btn btn-sm" href="/login">로그인</a>';
    } else {
      slot.innerHTML = '';
    }
  }
  // common.js가 헤더를 만든 뒤 실행되도록 DOMContentLoaded에서 호출
  document.addEventListener('DOMContentLoaded', updateHeaderButton);
})();
