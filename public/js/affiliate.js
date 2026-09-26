/* ============================================================
   제휴 링크 렌더러 (쿠팡 파트너스)
   - config.js의 AFFILIATE.groups 를 읽어 <div class="aff-slot" data-aff="키"> 에 채웁니다.
   - url이 비어 있는 항목은 렌더링하지 않습니다. 그룹 전체가 비면 슬롯 자체가 사라집니다.
     → 승인 전에는 화면에 아무것도 나타나지 않으므로 '있는 척'이 발생하지 않습니다.
   - 링크가 하나라도 있으면 쿠팡 파트너스 필수 고지 문구를 항상 함께 노출합니다.
   ============================================================ */
/* ---------- 쿠팡 배너 ----------
   파트너스 <script> 조각은 삽입 위치를 스스로 정해 버린다. 실제로 두 배너가 모두
   오른쪽 레일에 들어가고 하단은 비었으며, 모바일에서는 숨은 레일에 들어가 아무것도
   보이지 않았다(2026-09-18 실측). 그래서 그 스크립트가 만들어내는 주소로
   iframe을 직접 만든다. 위치가 어긋날 여지가 없다. */
(function () {
  var B = (window.EBISEO_CONFIG || {}).COUPANG_BANNER;
  if (!B || !B.trackingCode) return;

  var NOTICE = ((window.EBISEO_CONFIG || {}).AFFILIATE || {}).disclosure ||
    '이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.';

  function frame(spec) {
    if (!spec || !spec.id) return null;
    var q = 'id=' + spec.id +
      '&trackingCode=' + encodeURIComponent(B.trackingCode) +
      '&subId=' + encodeURIComponent(spec.subId || '') +
      '&template=' + encodeURIComponent(spec.template || 'carousel') +
      '&width=' + spec.w + '&height=' + spec.h + '&tag=js';
    var f = document.createElement('iframe');
    f.src = 'https://ads-partners.coupang.com/widgets.html?' + q;
    f.width = spec.w; f.height = spec.h;
    f.setAttribute('frameborder', '0');
    f.setAttribute('scrolling', 'no');
    f.setAttribute('referrerpolicy', 'unsafe-url');
    f.setAttribute('loading', 'lazy');
    f.setAttribute('title', '쿠팡 파트너스 광고');
    f.style.border = '0';
    f.style.maxWidth = '100%';
    return f;
  }

  /* 광고가 보이는 곳에는 대가성 문구가 예외 없이 함께 나온다 (공정위 심사지침·쿠팡 규정) */
  function place(parent, spec, cls) {
    var f = frame(spec);
    if (!f) return;
    var box = document.createElement('div');
    box.className = cls;
    var note = document.createElement('p');
    note.className = 'cp-notice';
    note.textContent = NOTICE;
    box.appendChild(f);
    box.appendChild(note);
    parent.appendChild(box);
  }

  /* 본문 맨 끝은 거의 아무도 도달하지 않는다(2026-09-18 사용자 지적).
     그렇다고 맨 위에 두면 '오늘 할 일'처럼 먼저 보여야 할 것을 밀어낸다.
     그래서 본문의 3분의 1 지점에 넣되, 제목과 본문 사이를 가르지 않도록
     블록 요소(section/article/div) 바로 뒤에만 넣는다. */
  function insertMid(main, box) {
    var kids = Array.prototype.filter.call(main.children, function (el) {
      return String(el.className || '').indexOf('cp-') !== 0;
    });
    var start = Math.max(1, Math.floor(kids.length / 3));
    for (var i = start; i < kids.length; i++) {
      var t = kids[i].tagName;
      if (t === 'SECTION' || t === 'ARTICLE' || t === 'DIV') {
        kids[i].insertAdjacentElement('afterend', box);
        return;
      }
    }
    main.appendChild(box);
  }

  /* 2026-09-26: 수익 자리는 CPA(상담 1건 16,000p)가 먼저다. CPA가 레일과 본문 1/3 지점을 가져가고,
     쿠팡(구매 1건 276원)은 본문 끝으로 내려간다. 페이지에 이미 .cpa-slot 이 있으면 본문 CPA는 만들지 않는다. */
  /* 이 페이지에 배정된 캠페인. config.CPA.byPath 에 경로가 있으면 그것, 없으면 quote. */
  function resolveCpaKey() {
    var C = (window.EBISEO_CONFIG || {}).CPA || {};
    var path = location.pathname.replace(/\.html$/, '');
    var k = C.byPath && C.byPath[path];
    return (k && C[k]) ? k : 'quote';
  }
  window.resolveCpaKey = resolveCpaKey;
  function cpaReady() {
    var c = ((window.EBISEO_CONFIG || {}).CPA || {})[resolveCpaKey()];
    return !!(c && typeof c.url === 'string' && /^https:\/\/\S+$/i.test(c.url.trim()));
  }
  function cpaSlot(place, compact) {
    var d = document.createElement('div');
    d.className = 'cpa-slot'; d.setAttribute('data-cpa', resolveCpaKey()); d.setAttribute('data-place', place);
    if (compact) d.setAttribute('data-compact', '1');
    return d;
  }

  function mount() {
    var w = window.innerWidth || 0;
    /* 레일은 자리가 나는 화면에서만 만든다. 숨겨놓고 불러오면 보이지도 않는 광고를 받는다.
       다만 전체 조회의 16%에만 보이므로(28일 실측 37/233회) 본문 배너가 주력이다. */
    /* 2026-09-26: 레일은 1,180px부터. 1,600px 기준일 때 데스크톱 방문자 상당수(사장님 화면 1,414px 포함)가 레일을 못 봤다.
       1,180~1,599px에서는 CSS가 본문을 왼쪽으로 옮겨 자리를 만든다(헤더는 가운데 그대로).
       레일 안은 CPA 카드(상담 1건 16,000p) 위, 쿠팡 300×300 아래 — 미디어펜 같은 사이드바처럼 세로로 쌓는다. */
    if (w >= 1180) {
      var rail = document.createElement('div'); rail.className = 'cp-rail cp-rail-r';
      if (cpaReady()) rail.appendChild(cpaSlot('rail', false));
      document.body.appendChild(rail);
      place(rail, B.side, 'cp-rail-item');
    }
    var main = document.querySelector('main');
    if (!main) return;
    var spec = w >= 680 ? B.bottom : B.bottomNarrow;
    var f = frame(spec);
    if (!f) return;
    var box = document.createElement('div');
    box.className = 'cp-inline';
    var note = document.createElement('p');
    note.className = 'cp-notice';
    note.textContent = NOTICE;
    box.appendChild(f);
    box.appendChild(note);
    if (cpaReady()) {
      if (!document.querySelector('.cpa-slot:not([data-place="rail"])')) insertMid(main, cpaSlot('article', false));   // 레일은 본문이 아니다
      main.appendChild(box);            // 쿠팡은 본문 끝
    } else insertMid(main, box);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();

(function () {
  var cfg = (window.EBISEO_CONFIG || {}).AFFILIATE;
  if (!cfg || !cfg.groups) return;

  var esc = window.escapeHtml || function (s) { return String(s == null ? '' : s); };

  function isValid(u) {
    return typeof u === 'string' && /^https:\/\/\S+$/i.test(u.trim());
  }

  function render(slot) {
    var key = slot.getAttribute('data-aff');
    var group = cfg.groups[key];
    if (!group) { slot.remove(); return; }

    var items = (group.items || []).filter(function (it) { return isValid(it.url); });
    if (!items.length) { slot.remove(); return; }   // 링크 없으면 흔적 없이 제거

    var links = items.map(function (it) {
      return '<a class="btn btn-outline btn-sm" style="margin:0 6px 6px 0" href="' +
        esc(it.url.trim()) + '" target="_blank" rel="nofollow sponsored noopener" ' +
        'data-aff-item="' + esc(it.name) + '">' + esc(it.name) + ' →</a>';
    }).join('');

    slot.className = 'card';
    slot.innerHTML =
      '<div class="card-title"><span data-icon="info"></span><h2 style="font-size:16px">' +
        esc(group.title || '관련 상품') +
        ' <span class="badge" style="font-size:11px;vertical-align:middle">광고</span></h2></div>' +
      (group.note ? '<p class="sub" style="font-size:13px;margin-bottom:10px">' + esc(group.note) + '</p>' : '') +
      '<div>' + links + '</div>' +
      '<p class="sub" style="font-size:12px;margin-top:10px;line-height:1.5">' +
        esc(cfg.disclosure || '') + '</p>';

    // 클릭 추적 (GA4가 켜져 있을 때만 전송, 개인정보는 보내지 않음)
    slot.addEventListener('click', function (e) {
      var a = e.target.closest('[data-aff-item]');
      if (!a || typeof window.track !== 'function') return;
      window.track('affiliate_click', { group: key, item: a.getAttribute('data-aff-item') });
    });
  }

  function init() {
    var slots = document.querySelectorAll('.aff-slot');
    for (var i = 0; i < slots.length; i++) render(slots[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* ---------- 이사 견적 CPA (애드릭스) ----------
   <div class="cpa-slot" data-cpa="quote" data-place="cost"></div> 에 채운다.
   config.CPA.quote.url 이 비어 있으면 슬롯을 흔적 없이 지운다 — 승인 전에 '있는 척'하지 않는다.
   공정위 2024-12-01 개정: 대가성 문구를 블록의 첫 부분에 둔다. 그래서 제목보다 위에 있다. */
(function () {
  var cfg = (window.EBISEO_CONFIG || {}).CPA;
  var esc = window.escapeHtml || function (s) { return String(s == null ? '' : s); };

  function isValid(u) { return typeof u === 'string' && /^https:\/\/\S+$/i.test(u.trim()); }

  function render(slot) {
    var key = slot.getAttribute('data-cpa');
    var c = cfg && cfg[key];
    if (!c || !isValid(c.url)) { slot.remove(); return; }
    var place = slot.getAttribute('data-place') || 'unknown';
    var useForm = slot.hasAttribute('data-form') && isValid(c.formUrl || '');

    /* 홈 바로가기 그리드의 여섯 번째 칸. 다른 칸과 같은 모양이되 '광고' 배지를 단다. */
    if (slot.hasAttribute('data-tile')) {
      var t = document.createElement('a');
      t.className = 'quick-tile cpa-tile'; t.href = c.url.trim(); t.target = '_blank'; t.rel = 'nofollow sponsored noopener';
      t.innerHTML = '<span class="qi">🚚</span><b>견적 받기 <span class="badge" style="font-size:10px;vertical-align:middle">광고</span></b><small>방문견적 2~3곳 무료</small>';
      t.addEventListener('click', function () { if (typeof window.track === 'function') window.track('cpa_click', { campaign: key, place: place }); });
      slot.replaceWith(t);
      return;
    }
    var compact = slot.hasAttribute('data-compact');
    slot.className = 'card cpa-card' + (compact ? ' cpa-compact' : '');
    if (compact) {
      slot.innerHTML =
        '<p class="sub" style="font-size:11.5px;line-height:1.5;margin-bottom:8px">' +
          '<span class="badge" style="font-size:11px;vertical-align:middle;margin-right:6px">광고</span>' + esc(c.disclosure) + '</p>' +
        '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">' +
          '<div style="flex:1 1 180px;min-width:0"><b style="font-size:15px">' + esc(c.title) + '</b>' +
            '<div class="sub" style="font-size:12.5px;margin-top:2px">어떤 이사를 준비하세요? · 이사일 60일 이내만 신청 가능</div></div>' +
        '</div>' +
        /* 벤치마킹(2026-09-26, 위매치·짐싸): 버튼 하나보다 이사 종류를 고르게 하는 편이 신청으로 이어진다. 세 칩 모두 같은 신청 폼으로 간다. */
        '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">' +
          ['가정이사', '원룸·소형', '사무실'].map(function (k) {
            return '<a class="btn btn-outline btn-sm" style="flex:1 1 auto;text-align:center;white-space:nowrap;word-break:keep-all;padding-left:10px;padding-right:10px" href="' + esc(c.url.trim()) + '" target="_blank" rel="nofollow sponsored noopener" data-cpa-link data-kind="' + k + '">' + k + ' →</a>';
          }).join('') +
        '</div>';
      Array.prototype.forEach.call(slot.querySelectorAll('[data-cpa-link]'), function (lk) {
        lk.addEventListener('click', function () { if (typeof window.track === 'function') window.track('cpa_click', { campaign: key, place: place, kind: lk.getAttribute('data-kind') || '' }); });
      });
      return;
    }
    slot.innerHTML =
      '<p class="sub" style="font-size:12px;line-height:1.5;margin-bottom:8px">' +
        '<span class="badge" style="font-size:11px;vertical-align:middle;margin-right:6px">광고</span>' +
        esc(c.disclosure) + '</p>' +
      '<div class="card-title" style="margin-bottom:6px"><span data-icon="truck"></span>' +
        '<h2 style="font-size:16px">' + esc(c.title) + '</h2></div>' +
      (c.note ? '<p class="sub" style="font-size:13px;margin-bottom:12px">' + esc(c.note) + '</p>' : '') +
      (useForm
        ? '<iframe title="이사 견적 상담 신청 (애드릭스)" src="' + esc(c.formUrl.trim()) + '" width="100%" height="' + (parseInt(c.formHeight, 10) || 1260) + '" style="border:0;display:block;max-width:100%" scrolling="no" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>' +
          '<p class="sub" style="font-size:12px;margin-top:8px">위 신청서는 애드릭스·이사스토리가 운영하며, 입력한 정보는 이비서가 아니라 해당 업체에 전달됩니다.</p>'
        : '<a class="btn btn-block" href="' + esc(c.url.trim()) + '" target="_blank" rel="nofollow sponsored noopener" data-cpa-link>' +
          '무료 견적 신청하러 가기 →</a>');

    // data-icon 은 common.js 가 DOMContentLoaded 에서 채우므로, 그 뒤에 만들어진 건 직접 채운다
    var ic = slot.querySelector('[data-icon]');
    if (ic && typeof window.icon === 'function' && !ic.innerHTML) ic.innerHTML = window.icon('truck');

    var link = slot.querySelector('[data-cpa-link]');
    if (link) link.addEventListener('click', function () {
      if (typeof window.track === 'function') window.track('cpa_click', { campaign: key, place: place });
    });
    if (useForm && typeof window.track === 'function') window.track('cpa_form_view', { campaign: key, place: place });
  }

  function init() {
    var slots = document.querySelectorAll('.cpa-slot');
    for (var i = 0; i < slots.length; i++) render(slots[i]);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

/* ---------- 가이드 글 모바일 하단 고정 CTA ----------
   벤치마킹(2026-09-26): 모바일 하단 고정 CTA는 여러 실측에서 전환을 12~31% 올렸다. 이비서 방문의 62%가 모바일이고,
   가이드 글은 검색으로 들어온 사람이 읽고 그냥 나가는 자리다. 조건을 좁게 둔다 —
   가이드 글 · 680px 미만 · 본문을 25% 이상 읽은 뒤 · 닫으면 이 세션에선 다시 안 뜸. 탭바 위에 얹는다. */
(function () {
  var KEYC = typeof window.resolveCpaKey === 'function' ? window.resolveCpaKey() : 'quote';
  var c = ((window.EBISEO_CONFIG || {}).CPA || {})[KEYC];
  if (!c || typeof c.url !== 'string' || !/^https:\/\/\S+$/i.test(c.url.trim())) return;
  if (!/^\/guide\/.+/.test(location.pathname)) return;
  if ((window.innerWidth || 0) >= 680) return;
  var KEY = 'ebiseo_cpa_sticky_closed';
  try { if (sessionStorage.getItem(KEY) === '1') return; } catch (e) {}
  var esc = window.escapeHtml || function (s) { return String(s == null ? '' : s); };
  var shown = false, bar = null;

  function show() {
    if (shown) return; shown = true;
    bar = document.createElement('div');
    bar.className = 'cpa-sticky';
    bar.innerHTML =
      '<div class="cpa-sticky-txt"><span class="badge" style="font-size:10px;margin-right:4px">광고</span>' +
        '<b>이사업체 방문견적 2~3곳 무료</b><span class="sub"> · 이비서가 수수료를 지급받습니다</span></div>' +
      '<a class="btn btn-sm" href="' + esc(c.url.trim()) + '" target="_blank" rel="nofollow sponsored noopener" data-cpa-link>견적 받기</a>' +
      '<button type="button" class="cpa-sticky-x" aria-label="닫기">×</button>';
    document.body.appendChild(bar);
    bar.querySelector('[data-cpa-link]').addEventListener('click', function () {
      if (typeof window.track === 'function') window.track('cpa_click', { campaign: KEYC, place: 'sticky' });
    });
    bar.querySelector('.cpa-sticky-x').addEventListener('click', function () {
      bar.remove(); try { sessionStorage.setItem(KEY, '1'); } catch (e) {}
    });
    if (typeof window.track === 'function') window.track('cpa_sticky_view', { campaign: KEYC });
  }
  function onScroll() {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    if (h > 0 && window.scrollY / h >= 0.25) { show(); window.removeEventListener('scroll', onScroll); }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
})();
