/* ============================================================
   제휴 링크 렌더러 (쿠팡 파트너스)
   - config.js의 AFFILIATE.groups 를 읽어 <div class="aff-slot" data-aff="키"> 에 채웁니다.
   - url이 비어 있는 항목은 렌더링하지 않습니다. 그룹 전체가 비면 슬롯 자체가 사라집니다.
     → 승인 전에는 화면에 아무것도 나타나지 않으므로 '있는 척'이 발생하지 않습니다.
   - 링크가 하나라도 있으면 쿠팡 파트너스 필수 고지 문구를 항상 함께 노출합니다.
   ============================================================ */
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
