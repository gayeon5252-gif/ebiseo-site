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

  /* 집계할 호스트. 여기 없는 주소에서는 GA4를 아예 켜지 않습니다.
     미리보기 주소(ebiseo.pages.dev, ebiseo-site.pages.dev)와 옛 배포처
     (ebiseo.netlify.app), localhost가 같은 측정 ID로 보내고 있어서
     실제 방문자 수가 부풀려졌습니다 (2026-09-26 실측: 누적 조회 중 약 7%).
     도메인을 옮기면 여기부터 고쳐야 합니다. 안 고치면 수치가 0이 됩니다. */
  GA_HOSTS: ['isabiseo.com', 'www.isabiseo.com'],

  /* LH 임대 공고 실시간 위젯(/youth-housing) — Cloudflare Worker 주소.
     설치 방법은 tools/lh-notice-worker.js 머리말 참고. 비워두면 위젯이 링크 안내만 보여줍니다.
     예: 'https://lh-notice.계정이름.workers.dev' */
  LH_NOTICE_API: 'https://lh-notice.gayeon0114.workers.dev',

  /* ── 쿠팡 파트너스 제휴 링크 ──────────────────────────────
     사용법: 쿠팡파트너스 승인 후 발급받은 링크를 url에 붙여넣으세요.
     url이 비어 있는 항목은 화면에 아예 표시되지 않습니다(가짜 링크 방지).
     하나라도 채우면 해당 위치에 상품 블록과 법정 고지 문구가 함께 나타납니다. */
  /* 이사 견적 CPA — 애드릭스 「이사스토리 이사가격비교」. 상담신청 DB 1건당 16,000p (2026-09-26 확인).
     url은 애드릭스 [홍보링크 생성]으로 받은 주소. **비워 두면 블록 자체가 화면에 안 나옵니다.**
     쿠팡(구매 1건 276원)보다 58배라 수익 자리는 이쪽이 먼저입니다.
     미승인 조건(애드릭스): 오류·결번·중복·미성년자·장기부재·상담거절·본인아님·이사일이 신청일로부터 60일 이후.
     → 그래서 안내문에 "60일 이내"를 적습니다. 본인·지인 신청은 부정입니다.
     대가성 문구는 공정위 2024-12-01 개정대로 블록 **첫 부분**에, "지급받습니다" 표현으로. 바꾸지 마세요. */
  CPA: {
    quote: {
      url: 'https://appu.kr/?i=12539130',   // 애드릭스 홍보링크 (2026-09-26 발급)
      /* 입력폼 iframe. 폼은 appu.kr 안에서 돌아서 이름·전화번호가 이비서 서버를 거치지 않는다.
         data-form="1" 을 단 슬롯(비용계산 결과)에서만 링크 대신 폼을 그대로 보여준다. 높이는 2026-09-26 실측 1,241px. */
      formUrl: 'https://appu.kr/?i=12539130&t=o&f=o&ft=n',
      formHeight: 1020,
      title: '이사업체 방문견적 2~3곳 무료로 받기',
      note: '이사일이 60일 이내인 분만 신청할 수 있어요. 일부 지역은 견적이 어려울 수 있습니다.',
      disclosure: '여기서 견적을 신청하면 이비서가 애드릭스로부터 수수료를 지급받습니다.'
    },

    /* 모두이사 이사가격비교 — DB당 20,000p(프로모션 포함), 승인율 65%, 기대값 13,000. 신청서에 「입주청소 연결」 항목이 있어
       입주청소 페이지에서만 쓴다(byPath). 같은 자리에서 이사스토리와 경쟁시키지 않는다 — 신청을 둘로 쪼갤 뿐이다. */
    cleaning: {
      url: 'https://appu.kr/?i=12539131',
      formUrl: 'https://appu.kr/?i=12539131&t=o&f=o&ft=n',
      formHeight: 1340,   // 2026-09-26 실측: 모바일 1,222 / 데스크톱 1,329
      title: '이사 견적과 입주청소 연결을 한 번에',
      note: '신청서에서 입주청소 업체 연결도 같이 고를 수 있어요. 이사일이 60일 이내인 분만 신청할 수 있습니다.',
      disclosure: '여기서 견적을 신청하면 이비서가 애드릭스로부터 수수료를 지급받습니다.'
    },

    /* 예비: 포장이사 이사방 — DB당 20,000p(프로모션 +4,000), 승인율 62%, 미승인에 「지점마감」. 이사스토리가 멈추면
       quote.url / formUrl 의 i= 값을 12539132 로 바꾸고 폼 높이를 다시 잰다. 메타·당근 홍보 금지 캠페인. */

    /* 커튼/블라인드 무료방문견적 — DB당 24,000p, 승인율 100%. 세 캠페인 중 기대값이 가장 높다(2026-09-26 캠페인 페이지).
       이사 견적과 경쟁하지 않는 의도(새집 창문)라 이사 후·입주·신혼 페이지에만 붙인다. 미승인: 오류·결번·중복·미성년자·장기부재·상담거절·본인아님. */
    curtain: {
      url: 'https://appu.kr/?i=12539134',
      formUrl: 'https://appu.kr/?i=12539134&t=o&f=o&ft=n',
      formHeight: 1200,
      title: '새집 커튼·블라인드, 무료 방문 실측',
      note: '샘플 책자를 들고 와서 실측과 견적까지 무료로 봐줍니다. 창문 개수만 알면 됩니다.',
      disclosure: '여기서 신청하면 이비서가 애드릭스로부터 수수료를 지급받습니다.'
    },

    /* 이사/입주 청소 모두클린 — DB당 8,000p, 승인율 80%. 청소 전용 신청서(5항목)라 입주청소 가이드 독자의 의도와 정확히 맞는다.
       모두이사(cleaning, 기대값 13,000)는 이사 견적 신청서에 청소 항목이 딸린 것이라 청소만 찾는 독자에겐 어긋난다 → 예비로 내림. */
    clean: {
      url: 'https://appu.kr/?i=12539135',
      formUrl: 'https://appu.kr/?i=12539135&t=o&f=o&ft=n',
      formHeight: 1000,
      title: '입주청소 업체 무료 견적 받기',
      note: '청소 원하는 날짜와 주소만 적으면 됩니다. 전국 지점, 가격 정찰제라고 밝힌 곳입니다.',
      disclosure: '여기서 신청하면 이비서가 애드릭스로부터 수수료를 지급받습니다.'
    },

    /* 디비센스 「인터넷 비교원」 — 상담신청 22,000원. 헤드라인 승인율 83%지만 최근 1개월 참여 마케터 실제 승인율은 38%
       (2026-09-26 캠페인 상세). 기대값 ≈ 8,360. 이사 견적·커튼과 다른 순간(D-30 통신사 결정)이라 붙인다.
       **규정:** 사전검수 필수(없으면 DB 전액 무효), 당근·자체 입력폼 불가, 타깃은 약정 만료 + 통신사 이동. 문구는 광고주 요구 그대로:
       약정 끝난 분 / 통신사 변경 시 현금 / 기존 통신사 그대로면 혜택 없음 / 연체·미성년자·신용불량자 불가. 과장 금지.
       url 은 디비센스 [홍보 URL 만들기]로 받은 주소. 비어 있으면 어디에도 안 뜬다. 9/24~27 추석 일시중지. */
    internet: {
      url: '',
      title: '인터넷 약정 끝났다면, 이사하며 통신사 바꾸고 현금 지원',
      note: '통신사를 바꾸는 신규 가입만 해당해요. 지금 통신사를 그대로 쓰면 혜택이 없고, 연체·미성년자·신용불량 상태면 신청할 수 없습니다. 지원금은 광고주 기준 최대 48만원입니다.',
      disclosure: '여기서 신청하면 이비서가 디비센스로부터 수수료를 지급받습니다.'
    },

    /* 경로별 배정. 여기 없는 페이지는 전부 quote(이사스토리). 한 페이지엔 한 캠페인 — 같은 자리에 둘을 두면 신청을 쪼갤 뿐이다. */
    byPath: {
      '/guide/move-out-cleaning':    'clean',
      '/guide/address-change-list':  'internet',   // 주소변경 = 서비스 이전 맥락. 링크 비면 카드가 안 뜬다
      '/guide/move-in-report':       'curtain',
      '/guide/moving-day-checklist': 'curtain',
      '/guide/newlywed-home-loan':   'curtain'
    }
  },

  AFFILIATE: {
    disclosure: '이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.',  /* 쿠팡 규정 원문 그대로. 임의로 바꾸지 말 것 */
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

  /* 쿠팡 파트너스 배너 — 파트너스에서 발급받은 코드를 통째로 붙여넣습니다.
     비워두면 배너 자리 자체가 만들어지지 않습니다(있는 척 금지).
     side   = 데스크탑 좌우 여백 (1340px 이상에서만 보임. 모바일에는 없음)
     bottom = 본문 맨 아래 (모바일·데스크탑 공통)
     주의: 본인 클릭 후 구매는 파트너스 부정행위입니다. */
  COUPANG_BANNER: {
    trackingCode: 'AF5215861',
    /* 파트너스가 주는 <script> 조각은 삽입 위치를 스스로 정해 버려서
       두 배너가 한자리에 겹쳤습니다(2026-09-18). 그래서 값만 두고
       iframe을 직접 만듭니다. 배너를 새로 발급받으면 id·크기만 바꾸세요. */
    side:         { id: 808036,  w: 300, h: 300, subId: 'side' },
    bottom:       { id: 1031054, w: 600, h: 160, subId: 'bottom' },
    bottomNarrow: { id: 808036,  w: 300, h: 300, subId: 'bottom-m' }
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
