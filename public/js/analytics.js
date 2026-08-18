/* ============================================================
   GA4 분석 — 측정 ID가 있을 때만 로드 (없으면 조용히 비활성화)
   민감정보(소득·주소·대출금액·이메일·리뷰 본문 등)는 절대 전송하지 않습니다.
   이벤트 발생 여부만 측정합니다.
   ============================================================ */
(function () {
  var cfg = window.EBISEO_CONFIG || {};
  var GA_ID = cfg.GA_MEASUREMENT_ID;
  var enabled = /^G-[A-Z0-9]+$/.test(GA_ID || '');

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
