/* ============================================================
   내 상황 체크 → 맞는 지원·제도 (홈 플래너)
   - 상황을 여러 개 고르면 그에 맞는 제도·챙길 일을 홈에 바로 보여준다
   - 선택은 localStorage(ebiseo_profile)에 저장. 다음 방문에도 유지
   - 제도 설명은 /policy·/youth-housing·가이드에 있는 내용만 요약해서 씀.
     수치·기한은 그 페이지가 원본이므로 여기서는 링크로 보낸다.
   ============================================================ */

const PROFILE_TAGS = [
  { id: 'youth',    ico: '🎒', label: '청년 1인가구' },
  { id: 'newlywed', ico: '💍', label: '신혼부부' },
  { id: 'pregnant', ico: '🤰', label: '임신 중' },
  { id: 'baby',     ico: '👶', label: '아기·어린이' },
  { id: 'middle',   ico: '🧭', label: '중장년' },
  { id: 'senior',   ico: '🧓', label: '어르신' },
  { id: 'foreign',  ico: '🌏', label: '외국인' }
];

/* 상황별 제도(items)와 추가로 챙길 일(tasks). href는 전부 사이트 안 페이지 */
const PROFILE_DATA = {
  youth: {
    items: [
      { t: '청년 주거지원 모집 — 지금 신청할 수 있나', s: '매입임대·전세임대·행복주택·안심주택·HUG 든든전세의 접수 상태와 올해 일정', href: '/youth-housing', hot: true },
      { t: '청년전용 버팀목 전세대출', s: '만 19~34세 무주택 · 연 2.2~3.3% · 최대 1.5억 (2026-09-10 기금 안내 기준)', href: '/policy#loan' },
      { t: '청년전용 보증부 월세대출', s: '보증금 연 1.3% · 월세 연 1.0% · 월 50만원까지', href: '/guide/youth-wolse-loan' },
      { t: '청년월세 특별지원', s: '월 최대 20만원 × 12개월 · 2026년 접수는 5월 마감, 내년 일정 확인', href: '/guide/youth-monthly-rent-support' },
      { t: '월세 세액공제', s: '신고된 월세 금액 기준 · 집주인이 적게 신고하자고 해도 응하지 말 것', href: '/policy#support' },
      { t: '전세보증금 반환보증', s: '잔금·전입 후 빨리 가입 · 원룸은 등기부만으로 부족', href: '/policy#contract' }
    ],
    tasks: [
      { d: -45, t: '등기부등본에서 반드시 볼 것 (다가구는 선순위 보증금까지)', href: '/guide/registry-check' },
      { d: -30, t: '자취 첫 달 실제 비용 계산', href: '/guide/first-living-cost' }
    ]
  },
  newlywed: {
    items: [
      { t: '신혼부부전용 전세자금', s: '혼인 7년 이내 · 부부합산 7,500만원 이하 · 수도권 최대 3억', href: '/policy#loan', hot: true },
      { t: '행복주택 — 신혼부부 계층', s: '시세 60~80% · 자녀 있으면 14년 거주 · 단지별 수시 공고', href: '/youth-housing#happy' },
      { t: '디딤돌 구입자금 (신혼 완화 기준)', s: '집을 살 계획이면 대출 한도부터 확인', href: '/loan' },
      { t: '전세보증금 반환보증', s: '두 사람 보증금이 커질수록 필수', href: '/policy#contract' }
    ],
    tasks: [
      { d: -60, t: '집부터 계약하지 말고 대출 한도부터 — 신혼집 순서', href: '/guide/newlywed-home-loan' },
      { d: -55, t: '전세와 월세, 우리 상황엔 뭐가 나을까', href: '/guide/jeonse-vs-wolse' }
    ]
  },
  pregnant: {
    items: [
      { t: '신생아 특례 버팀목·디딤돌 (출산 후 2년 내 신청)', s: '출산하면 전세·구입 모두 특례 금리 대상이 됩니다. 지금 미리 조건 확인', href: '/loan', hot: true },
      { t: '행복주택 — 신혼부부·예비신혼 계층', s: '시세 60~80% · 단지별 수시 공고', href: '/youth-housing#happy' },
      { t: '전세보증금 반환보증', s: '출산 전후로 이사가 많은 시기 · 잔금·전입 후 바로 가입', href: '/policy#contract' }
    ],
    tasks: [
      { d: -30, t: '임산부 이사, 무엇을 다르게 해야 할까 — 몸을 지키는 순서', href: '/guide/moving-with-baby' },
      { d: -30, t: '이 시기엔 포장이사를 권하는 이유', href: '/guide/packing-vs-semi-packing' },
      { d: -3, t: '입주청소로 새집 먼지·냄새 줄이기', href: '/guide/move-out-cleaning' }
    ]
  },
  baby: {
    items: [
      { t: '신생아 특례 버팀목·디딤돌', s: '2년 내 출산 가구 · 부부합산 1.3억 이하 · 전세 최대 3억 / 구입 최대 5억', href: '/loan', hot: true },
      { t: '행복주택 — 자녀 있는 신혼부부는 14년', s: '시세 60~80% · 단지별 수시 공고', href: '/youth-housing#happy' },
      { t: '주거급여', s: '소득인정액 중위소득 48% 이하 가구 · 부양의무자 기준 없음', href: '/policy#support' }
    ],
    tasks: [
      { d: -3, t: '아기와 함께하는 이사 당일 동선', href: '/guide/moving-with-baby' },
      { d: 3, t: '이사 후 주소 변경 — 어린이집·학교·병원까지', href: '/guide/address-change-list' },
      { d: -1, t: '이사 당일 체크리스트', href: '/guide/moving-day-checklist' }
    ]
  },
  middle: {
    items: [
      { t: '주거급여', s: '소득인정액 중위소득 48% 이하 · 부양의무자 기준 없음', href: '/policy#support', hot: true },
      { t: '디딤돌 구입자금 · 보금자리론', s: '집을 줄여 옮길 때 구입 자금 조건 비교', href: '/loan' },
      { t: '장기수선충당금 돌려받기', s: '아파트 세입자였다면 이사 나갈 때 집주인에게 청구', href: '/policy#after' },
      { t: '전세보증금 반환보증', s: '보증금이 클수록 가입 우선', href: '/policy#contract' }
    ],
    tasks: [
      { d: -30, t: '보관이사가 필요한 순간과 비용 구조', href: '/guide/storage-moving' },
      { d: -35, t: '가족 이사 비용, 어디서 차이가 날까', href: '/guide/moving-cost-family' },
      { d: -60, t: '보증금을 안 돌려줄 때', href: '/guide/deposit-return' }
    ]
  },
  senior: {
    items: [
      { t: '주택연금 — 집에 살면서 매달 받기', s: '만 55세 이상 · 공시가격 12억 이하 · 시세 2억 미만 1주택은 감정평가수수료 공사 부담', href: '/policy#group', hot: true },
      { t: '고령자 매입임대·고령자복지주택', s: '만 65세 이상 무주택 · 시세 40%(복지주택 30%) · 거주 기간 제한 없음', href: '/policy#group' },
      { t: '집 고치는 지원 — 안전손잡이·문턱 제거', s: '주거급여 수선유지급여 · 서울 희망의 집수리', href: '/policy#group' },
      { t: '주거급여', s: '소득인정액 중위소득 48% 이하', href: '/policy#support' }
    ],
    tasks: [
      { d: 3, t: '이사 후 주소 변경, 어디까지 해야 할까', href: '/guide/address-change-list' },
      { d: -1, t: '이사 당일 체크리스트', href: '/guide/moving-day-checklist' }
    ]
  },
  foreign: {
    items: [
      { t: '체류지 변경신고가 전입신고 역할을 합니다', s: '이사한 날부터 15일 이내 (14일 안에 하면 안전) · 동네 주민센터에서도 됩니다 · 대항력이 생깁니다', href: '/policy#group', hot: true },
      { t: '전세보증금 반환보증', s: '외국인도 가입 가능 · 임대차계약서·등기부등본 준비', href: '/policy#contract' },
      { t: '전월세 신고제', s: '보증금 6,000만원 초과 또는 월세 30만원 초과면 30일 내 신고', href: '/policy#contract' }
    ],
    tasks: [
      { d: -45, t: '등기부등본에서 반드시 볼 것', href: '/guide/registry-check' },
      { d: -60, t: '보증금을 안 돌려줄 때', href: '/guide/deposit-return' }
    ]
  }
};

function getProfile() { return store.get('profile', []); }

function renderProfile() {
  const chips = document.getElementById('profile-chips');
  const out = document.getElementById('profile-result');
  if (!chips || !out) return;
  const sel = getProfile();

  chips.innerHTML = PROFILE_TAGS.map(tag => {
    const on = sel.indexOf(tag.id) > -1;
    return '<button type="button" class="chip" data-tag="' + tag.id + '" aria-pressed="' + on + '"' +
      ' style="' + (on ? 'border-color:var(--primary);background:#E8F3FF;color:var(--primary-dark);font-weight:700' : '') + '">' +
      tag.ico + ' ' + tag.label + '</button>';
  }).join('');
  chips.querySelectorAll('.chip').forEach(btn => btn.addEventListener('click', function () {
    const id = this.dataset.tag;
    let cur = getProfile();
    cur = cur.indexOf(id) > -1 ? cur.filter(x => x !== id) : cur.concat([id]);
    store.set('profile', cur);
    if (window.track) window.track('profile_select', { tags: cur.join(',') });
    renderProfile();
  }));

  // 대시보드 한 줄 요약
  const dashLine = document.getElementById('dash-profile');
  if (dashLine) {
    dashLine.textContent = sel.length
      ? '내 상황: ' + sel.map(id => (PROFILE_TAGS.find(t => t.id === id) || {}).label).filter(Boolean).join(' · ')
      : '';
  }

  if (!sel.length) {
    out.innerHTML = '<div class="state" style="padding:14px 0"><p style="font-size:14px;color:var(--sub)">해당되는 상황을 위에서 누르면 <b>받을 수 있는 제도</b>와 <b>추가로 챙길 일</b>이 여기에 나옵니다. 여러 개 골라도 됩니다.</p></div>';
    return;
  }

  // 여러 상황을 골랐을 때 같은 제도는 한 번만
  const seen = {}, items = [], tasks = [];
  sel.forEach(id => {
    const d = PROFILE_DATA[id]; if (!d) return;
    d.items.forEach(it => { if (!seen['i' + it.href + it.t]) { seen['i' + it.href + it.t] = 1; items.push(it); } });
    d.tasks.forEach(tk => { if (!seen['t' + tk.href]) { seen['t' + tk.href] = 1; tasks.push(tk); } });
  });
  items.sort((a, b) => (b.hot ? 1 : 0) - (a.hot ? 1 : 0));

  out.innerHTML =
    '<div class="card" style="padding:0;overflow:hidden">' +
      items.map(it =>
        '<a href="' + it.href + '" style="display:block;padding:12px 14px;border-bottom:1px solid var(--border);text-decoration:none">' +
          '<div style="font-weight:700;font-size:14.5px;color:#191F28">' + it.t + (it.hot ? ' <span class="badge badge-blue" style="vertical-align:middle;margin-left:4px">먼저</span>' : '') + '</div>' +
          '<div style="font-size:12.5px;color:var(--sub);margin-top:2px">' + it.s + '</div>' +
        '</a>'
      ).join('') +
    '</div>' +
    '<h3 style="font-size:14px;margin:14px 0 6px;color:#191F28">이 상황에서 체크리스트에 더 챙길 것</h3>' +
    '<div class="card" style="padding:0;overflow:hidden">' +
      tasks.map(tk =>
        '<a href="' + tk.href + '" style="display:flex;gap:8px;align-items:center;padding:11px 14px;border-bottom:1px solid var(--border);text-decoration:none;font-size:14px;color:var(--text)">' +
          '<span style="color:var(--primary);font-weight:700">→</span>' + tk.t +
        '</a>'
      ).join('') +
    '</div>' +
    '<p class="sub" style="font-size:12px;margin-top:8px">제도의 자격·금액·기한은 각 페이지가 원본입니다. 여기 요약은 2026-09-10 기준이며, 눌러서 최신 내용을 확인하세요.</p>';
}

renderProfile();
