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

  function mount() {
    var w = window.innerWidth || 0;
    /* 레일은 자리가 나는 화면에서만 만든다. 숨겨놓고 불러오면 보이지도 않는 광고를 받는다.
       다만 전체 조회의 16%에만 보이므로(28일 실측 37/233회) 본문 배너가 주력이다. */
    if (w >= 1600) place(document.body, B.side, 'cp-rail cp-rail-r');
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
    insertMid(main, box);
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
