/* ============================================================
   이비서 공통 스크립트
   - 둥근 라인 SVG 아이콘 세트
   - 헤더/하단탭/푸터 컴포넌트 주입 (확장자 없는 클린 URL)
   - localStorage 저장 헬퍼 / 공유 / ICS 캘린더 내보내기
   ============================================================ */

/* ---------- 아이콘 (stroke 기반, round cap/join) ---------- */
const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>',
  calc: '<rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M8.5 7.5h7"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 15.5h.01M12 15.5h.01M15.5 15.5h.01"/>',
  check: '<path d="M9 11.5 11.5 14 15.5 9"/><rect x="4" y="4" width="16" height="16" rx="3"/>',
  loan: '<circle cx="12" cy="12" r="8.5"/><path d="M12 8v8M9.5 10.2c0-1 1.1-1.7 2.5-1.7s2.5.7 2.5 1.7c0 2.6-5 1.4-5 3.9 0 1 1.1 1.7 2.5 1.7s2.5-.7 2.5-1.7"/>',
  truck: '<path d="M3 7h11v9H3z"/><path d="M14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/>',
  chat: '<path d="M21 12a8 8 0 0 1-8 8H4l2-3.2A8 8 0 1 1 21 12z"/><path d="M8.5 11h.01M12 11h.01M15.5 11h.01"/>',
  box: '<path d="M3.5 8 12 3.5 20.5 8v8L12 20.5 3.5 16z"/><path d="M3.5 8 12 12.5 20.5 8"/><path d="M12 12.5v8"/>',
  alert: '<path d="M12 4 21 19H3z"/><path d="M12 10.5v3.5"/><path d="M12 16.5h.01"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5"/><path d="M12 7.8h.01"/>',
  cal: '<rect x="4" y="5" width="16" height="16" rx="2.5"/><path d="M8 3v4M16 3v4M4 10h16"/>',
  won: '<path d="M4 7l3 10 3-8 3 8 3-10"/><path d="M3 12h18"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-3.5-3.5"/>',
  book: '<path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2z"/><path d="M9 8h6M9 12h6"/>',
  share: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 10.8 15.8 7.2M8.2 13.2 15.8 16.8"/>',
  send: '<path d="m4 12 16-7-5 16-3.5-6.5z"/><path d="M20 5 11.5 14.5"/>',
  empty: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 15c1-1 2-1.5 3.5-1.5s2.5.5 3.5 1.5"/><path d="M9 10h.01M15 10h.01"/>',
  arrow: '<path d="M9 6l6 6-6 6"/>'
};
function icon(name, cls) {
  return '<svg class="icon ' + (cls || '') + '" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
}

/* ---------- 저장 헬퍼 (이 기기의 브라우저에만 저장됨) ---------- */
const store = {
  get(key, def) {
    try { const v = localStorage.getItem('ebiseo_' + key); return v === null ? def : JSON.parse(v); }
    catch (e) { return def; }
  },
  set(key, val) {
    try { localStorage.setItem('ebiseo_' + key, JSON.stringify(val)); } catch (e) { /* 저장 실패 무시 */ }
  }
};

/* ---------- 공통 유틸 ---------- */
function fmtWon(n) { return n.toLocaleString('ko-KR') + '원'; }
function fmtMan(n) { return Math.round(n / 10000).toLocaleString('ko-KR') + '만원'; }
function daysUntil(dateStr) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr); d.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}
// escapeHtml 은 config.js 에서 window.escapeHtml 로 제공 (없을 때 대비 폴백)
window.escapeHtml = window.escapeHtml || function (s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
};

/* ---------- 네비게이션 (확장자 없는 클린 URL) ---------- */
const NAV_MAIN = [ // 모바일 하단 탭 (5개)
  { href: '/',          key: 'home',      label: '홈',       ic: 'home' },
  { href: '/cost',      key: 'cost',      label: '비용계산',  ic: 'calc' },
  { href: '/checklist', key: 'checklist', label: '체크리스트', ic: 'check' },
  { href: '/loan',      key: 'loan',      label: '대출·지원', ic: 'loan' },
  { href: '/guide',     key: 'guide',     label: '가이드',    ic: 'book' }
];
const NAV_DESKTOP = [ // 상단 GNB (데스크탑)
  { href: '/',          key: 'home',      label: '홈' },
  { href: '/cost',      key: 'cost',      label: '비용계산' },
  { href: '/checklist', key: 'checklist', label: '체크리스트' },
  { href: '/situation', key: 'situation', label: '상황별' },
  { href: '/gilil',     key: 'gilil',     label: '이사 길일' },
  { href: '/safety',    key: 'safety',    label: '계약안전' },
  { href: '/loan',      key: 'loan',      label: '대출·지원' },
  { href: '/policy',    key: 'policy',    label: '정부지원' },
  { href: '/guide',     key: 'guide',     label: '가이드' }
];

function currentKey() {
  // /cost, /cost.html, /guide/xxx 등에서 페이지 키 추출
  const p = location.pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/';
  if (p === '' || p === '/' || p === '/index') return 'home';
  const first = p.split('/')[1];
  return first || 'home';
}

function renderNav() {
  const key = currentKey();
  const header = document.createElement('header');
  header.className = 'header';
  header.innerHTML =
    '<div class="header-inner">' +
      '<a class="logo" href="/" aria-label="이비서 홈">' + icon('box') + '이비서</a>' +
      '<nav class="gnb" aria-label="주요 메뉴">' +
        NAV_DESKTOP.map(n => '<a href="' + n.href + '"' + (key === n.key ? ' class="active" aria-current="page"' : '') + '>' + n.label + '</a>').join('') +
      '</nav>' +
      '<button type="button" class="btn btn-sm btn-ghost" id="share-btn" aria-label="이 페이지 링크 공유" onclick="shareLink(this)">' + icon('share', 'icon-sm') + '공유</button>' +
    '</div>';
  document.body.prepend(header);

  const tab = document.createElement('nav');
  tab.className = 'tabbar';
  tab.setAttribute('aria-label', '하단 메뉴');
  tab.innerHTML = NAV_MAIN.map(n =>
    '<a href="' + n.href + '"' + (key === n.key ? ' class="active" aria-current="page"' : '') + '>' + icon(n.ic) + n.label + '</a>'
  ).join('');
  document.body.appendChild(tab);
}

function renderFooter() {
  const f = document.createElement('footer');
  f.className = 'footer';
  f.innerHTML =
    '<div class="container">' +
      '<nav class="footer-links" aria-label="하단 링크">' +
        '<a href="/about">서비스 소개</a>' +
        '<a href="/guide">이사 가이드</a>' +
        '<a href="/company">업체·신혼 도우미</a>' +
        '<a href="/privacy">개인정보처리방침</a>' +
        '<a href="/terms">이용약관</a>' +
        '<a href="/situation">상황별 가이드</a>' +
        '<a href="/policy">정부 지원·제도</a>' +
        '<a href="/news">제도 변경 소식</a>' +
        '<a href="/board">문의 게시판</a>' +
        '<a href="/contact">문의하기</a>' +
      '</nav>' +
      '<p>이비서 — 집을 구하는 순간부터 이사 후 정리까지, 놓치는 일 없게.</p>' +
      '<p>입력하신 이사 날짜·체크리스트·계산 내용은 <b>이 기기(브라우저)에만 저장</b>됩니다. 다른 기기와 자동으로 동기화되지 않습니다.</p>' +
      '<p>비용·대출·행정 정보는 참고용이며, 실제 견적·승인·법적 판단과 다를 수 있습니다. 반드시 공식 기관에서 확인하세요.</p>' +
      '<p style="margin-top:8px">© 2026 이비서(ebiseo)</p>' +
    '</div>';
  document.body.appendChild(f);
}

/* ---------- 링크 공유 (카카오톡·SNS 붙여넣기용 링크 복사) ---------- */
window.shareLink = function (btn) {
  const url = (window.SITE_URL || location.origin) + location.pathname.replace(/\.html$/, '').replace(/\/index$/, '/');
  const done = function () {
    if (btn) { const t = btn.textContent; btn.textContent = '링크 복사됨!'; setTimeout(() => btn.textContent = t, 1600); }
    if (window.track) window.track('share_clicked', { page: currentKey() });
  };
  if (navigator.share) {
    navigator.share({ title: document.title, url: url }).then(done).catch(() => {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(done).catch(() => alert('링크: ' + url));
  } else { alert('링크: ' + url); }
};

/* ---------- ICS 캘린더 파일 생성/다운로드 ---------- */
function icsDate(d) { // Date -> YYYYMMDD (종일 일정)
  const y = d.getFullYear(), m = ('0' + (d.getMonth() + 1)).slice(-2), day = ('0' + d.getDate()).slice(-2);
  return '' + y + m + day;
}
window.downloadICS = function (events, filename) {
  // events: [{title, date:'YYYY-MM-DD', desc}]
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ebiseo//moving//KR', 'CALSCALE:GREGORIAN'];
  const stamp = icsDate(new Date()) + 'T000000Z';
  events.forEach(function (ev, i) {
    const d = new Date(ev.date); const start = icsDate(d);
    const end = icsDate(new Date(d.getTime() + 86400000));
    lines.push('BEGIN:VEVENT');
    lines.push('UID:ebiseo-' + start + '-' + i + '@ebiseo');
    lines.push('DTSTAMP:' + stamp);
    lines.push('DTSTART;VALUE=DATE:' + start);
    lines.push('DTEND;VALUE=DATE:' + end);
    lines.push('SUMMARY:' + String(ev.title).replace(/([,;\\])/g, '\\$1'));
    if (ev.desc) lines.push('DESCRIPTION:' + String(ev.desc).replace(/([,;\\])/g, '\\$1'));
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename || 'ebiseo-moving.ics';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  if (window.track) window.track('calendar_exported', { count: events.length });
};

document.addEventListener('DOMContentLoaded', function () {
  renderNav();
  renderFooter();
  // data-icon="이름" 요소에 아이콘 삽입
  document.querySelectorAll('[data-icon]').forEach(el => {
    el.innerHTML = icon(el.dataset.icon, el.dataset.iconClass || '') + el.innerHTML;
  });
});
