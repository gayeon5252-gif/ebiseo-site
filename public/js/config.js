/* ============================================================
   이비서 전역 설정 (한 곳에서 관리)
   ============================================================ */
window.EBISEO_CONFIG = {
  /* 대표 도메인 — 도메인 변경 시 이 값만 바꾸면 canonical/OG/공유가 함께 갱신됩니다. */
  SITE_URL: 'https://isabiseo.com',

  /* Supabase (anon/publishable 키는 공개 가능 — RLS로 보호). service_role 키 금지! */
  SUPABASE_URL: 'https://eqohaoerrkuxgukrhwws.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_eWn0GFAKZmmmWSQqsYQIXw_XjOJJRZP',

  /* GA4 측정 ID — 실제 값(G-XXXXXXXXXX)을 넣으면 자동으로 분석이 켜집니다.
     비워두면 분석 스크립트가 로드되지 않습니다. */
  GA_MEASUREMENT_ID: 'G-B48QQVFM8J',

  /* ── 쿠팡 파트너스 제휴 링크 ──────────────────────────────
     사용법: 쿠팡파트너스 승인 후 발급받은 링크를 url에 붙여넣으세요.
     url이 비어 있는 항목은 화면에 아예 표시되지 않습니다(가짜 링크 방지).
     하나라도 채우면 해당 위치에 상품 블록과 법정 고지 문구가 함께 나타납니다. */
  AFFILIATE: {
    disclosure: '이 페이지는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.',
    groups: {
      supplies: {
        title: '이사 준비물 바로 보기',
        note: '아래는 이사에 흔히 쓰이는 품목입니다. 구매 전 규격과 수량을 꼭 확인하세요.',
        items: [
          { name: '이사박스',           url: 'https://link.coupang.com/a/f4X2ok3MIe' },
          { name: '에어캡(뽁뽁이)',     url: 'https://link.coupang.com/a/f4X47VUR8S' },
          { name: '박스테이프',         url: 'https://link.coupang.com/a/f4X6yYKRUW' },
          { name: '라벨 스티커',        url: 'https://link.coupang.com/a/f4YaFUT5ky' },
          { name: '옷 압축팩',          url: 'https://link.coupang.com/a/f4Ycu2wZRA' }
        ]
      },
      cleaning: {
        title: '입주청소 용품 바로 보기',
        note: '셀프 청소를 계획 중이라면 아래 품목이 기본입니다.',
        items: [
          { name: '다목적 세정제',  url: 'https://link.coupang.com/a/f4Yd3wJd9g' },
          { name: '곰팡이 제거제',  url: 'https://link.coupang.com/a/f4YfhMirvM' },
          { name: '물걸레·청소포',  url: 'https://link.coupang.com/a/f4YhzVDO8W' },
          { name: '고무장갑',       url: 'https://link.coupang.com/a/f4Yj6p6uBg' }
        ]
      }
    }
  },

  /* 기능 플래그 — 아직 실제 시스템이 없는 기능은 false로 두어 공개 화면에서 숨깁니다.
     추후 백엔드가 준비되면 true로 켜서 다시 노출할 수 있습니다. */
  FEATURES: {
    ads: false,          // 광고 슬롯
    affiliate: false,    // 제휴 견적 연결 버튼 / 마케팅 URL
    companyCompare: false,// 업체 비교표(실데이터 없음)
    reviews: false,      // 사용자 리뷰
    points: false        // 포인트 적립/사용
  }
};

/* ---------- 전역 헬퍼 ---------- */
window.SITE_URL = window.EBISEO_CONFIG.SITE_URL;
window.FEATURES = window.EBISEO_CONFIG.FEATURES;

/* XSS 방지용 HTML 이스케이프 (사용자 입력을 innerHTML에 넣기 전에 반드시 사용) */
window.escapeHtml = function (s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
};
