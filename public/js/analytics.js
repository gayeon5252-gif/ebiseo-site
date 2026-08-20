/* ============================================================
   GA4 분석 — 측정 ID가 있을 때만 로드 (없으면 조용히 비활성화)
   민감정보(소득·주소·대출금액·이메일·리뷰 본문 등)는 절대 전송하지 않습니다.
   이벤트 발생 여부만 측정합니다.

   운영자 본인 접속 제외
   -------------------------------------------------------------
   주소 뒤에 ?ga=off 를 붙여 한 번 들어오면 이 브라우저는 이후
   계속 집계에서 빠집니다. (localStorage에 저장)
   다시 집계하려면 ?ga=on 으로 한 번 들어오면 됩니다.

     끄기 : https://isabiseo.com/?ga=off
     켜기 : https://isabiseo.com/?ga=on

   기기·브라우저마다 한 번씩 해주셔야 합니다.
   IP 기반 제외와 달리 인터넷이 바뀌어도 유지됩니다.
   ============================================================ */
(function () {
  var cfg = window.EBISEO_CONFIG || {};
  var GA_ID = cfg.GA_MEASUREMENT_ID;
  var OPT_KEY = 'ebiseo_ga_optout';

  /* ---------- 운영자 제외 스위치 ---------- */
  var optedOut = false;
  try {
    var q = (location.search || '').toLowerCase();
    if (q.indexOf('ga=off') > -1) {
      localStorage.setItem(OPT_KEY, '1');
      console.info('[이비서] 이 브라우저는 방문자 집계에서 제외됩니다.');
    } else if (q.indexOf('ga=on') > -1) {
      localStorage.removeItem(OPT_KEY);
      console.info('[이비서] 이 브라우저의 집계 제외가 해제되었습니다.');
    }
    optedOut = localStorage.getItem(OPT_KEY) === '1';
  } catch (e) {
    /* 사생활 보호 모드 등에서 localStorage가 막히면 그냥 집계합니다 */
  }

  var enabled = /^G-[A-Z0-9]+$/.test(GA_ID || '') && !optedOut;

  if (enabled) {
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID, { anonymize_ip: true });
  }

  /* 공용 이벤트 헬퍼 — 어디서든 track('event_name', {비민감_파라미터}) 로 호출.
     GA 미설정 시에도 오류 없이 무시됩니다. */
  window.track = function (name, params) {
    try {
      if (enabled && typeof window.gtag === 'function') {
        window.gtag('event', name, params || {});
      }
    } catch (e) { /* 무시 */ }
  };
})();
