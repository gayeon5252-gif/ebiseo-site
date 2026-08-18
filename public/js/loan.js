/* ============================================================
   대출·주거지원 맞춤찾기
   - 조건 입력 → 제도별 자격 판정(사전진단) → 카드 표시
   - 상환 방식 비교 계산기(원리금균등·원금균등·만기일시)
   - 공식 사이트 링크 모음
   ※ 금리·한도는 참고값. 각 카드에 출처·기준일 표시 (관리자 수정은 PART 2)
   ============================================================ */

/* ---------- 탭 ---------- */
function showTab(name) {
  document.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');
  document.getElementById('panel-' + name).style.display = 'block';
  document.querySelectorAll('#loan-tabs .chip').forEach(c => {
    const on = c.dataset.tab === name;
    c.style.borderColor = on ? 'var(--primary)' : 'var(--border)';
    c.style.color = on ? 'var(--primary)' : 'var(--text)';
    c.style.fontWeight = on ? '700' : '400';
  });
  window.scrollTo({ top: 0 });
}
document.querySelectorAll('#loan-tabs .chip').forEach(c =>
  c.addEventListener('click', () => showTab(c.dataset.tab))
);
showTab('match');

// 혼인 상태에 따라 혼인기간 입력 표시
document.getElementById('l-marital').addEventListener('change', function () {
  document.getElementById('l-married-wrap').style.display = this.value === 'married' ? 'block' : 'none';
});

/* ---------- 제도 데이터 (참고값 · 기준일 표시) ---------- */
const ASOF = '2026년 7월 기준 · 출처: 기금e든든·주택도시기금·복지로·마이홈포털 (실제 조건은 공식 사이트 확인)';
const LINKS = {
  enhuf: 'https://enhuf.molit.go.kr',   // 기금e든든
  hf: 'https://www.hf.go.kr',
  hug: 'https://www.khug.or.kr',
  bokjiro: 'https://www.bokjiro.go.kr',
  myhome: 'https://www.myhome.go.kr',
  lh: 'https://apply.lh.or.kr',
  youth: 'https://www.youthcenter.go.kr'
};

/* c(u): 자격 함수 — u = 사용자 입력. 반환 [적합여부, 사유] */
const POLICIES = [
  { name: '청년전용 버팀목 전세대출', cat: '전세', rate: '연 1.8~2.7%', limit: '최대 2억원 (보증금의 80%)', term: '2년 (최장 10년 연장)',
    target: '만 19~34세 무주택 세대주(예정자)', cond: '연소득 5,000만원 이하 · 보증금 3억원 이하(수도권)',
    docs: '신분증, 소득증빙, 재직증명, 임대차계약서, 등기부등본', deadline: '상시', link: LINKS.enhuf,
    c: u => u.purpose === 'jeonse' && u.age >= 19 && u.age <= 34 && u.homeless && u.income <= 5000 },
  { name: '일반 버팀목 전세대출', cat: '전세', rate: '연 2.3~3.3%', limit: '수도권 1.2억 / 그 외 8,000만원', term: '2년 (연장 가능)',
    target: '무주택 세대주', cond: '연소득 5,000만원 이하 (신혼 7,500만원)',
    docs: '신분증, 소득증빙, 주민등록등본, 임대차계약서', deadline: '상시', link: LINKS.enhuf,
    c: u => u.purpose === 'jeonse' && u.homeless && (u.marital === 'married' ? u.income <= 7500 : u.income <= 5000) },
  { name: '신혼부부 전용 전세자금대출', cat: '전세', rate: '연 1.5~2.7%', limit: '수도권 최대 3억원', term: '2년 (최장 10년)',
    target: '혼인 7년 이내 또는 3개월 내 결혼 예정', cond: '부부합산 연소득 7,500만원 이하 · 무주택',
    docs: '혼인관계증명서, 소득증빙, 임대차계약서', deadline: '상시', link: LINKS.enhuf,
    c: u => u.purpose === 'jeonse' && u.homeless && (u.marital === 'engaged' || (u.marital === 'married' && u.marriedYears <= 7)) && u.income <= 7500 },
  { name: '중소기업 취업청년 전월세보증금대출', cat: '전세', rate: '연 1.5%', limit: '최대 1억원', term: '2년 (최장 10년)',
    target: '만 19~34세 중소·중견기업 재직자', cond: '연소득 3,500만원 이하 · 보증금 2억원 이하',
    docs: '재직증명서, 사업자등록증명(회사), 소득증빙', deadline: '상시', link: LINKS.enhuf,
    c: u => u.purpose === 'jeonse' && u.sme && u.age >= 19 && u.age <= 34 && u.homeless && u.income <= 3500 },
  { name: '신생아 특례 버팀목 전세대출', cat: '전세', rate: '연 1.1~3.0%', limit: '최대 3억원', term: '2년 (최장 12년)',
    target: '대출 신청일 기준 2년 내 출산(입양)한 무주택 가구', cond: '부부합산 연소득 1.3억원 이하',
    docs: '출생증명서, 소득증빙, 임대차계약서', deadline: '상시', link: LINKS.enhuf,
    c: u => u.purpose === 'jeonse' && u.homeless && u.child === 'newborn' && u.income <= 13000 },
  { name: '청년전용 보증부 월세대출', cat: '월세', rate: '보증금 연 1.3% · 월세 연 1.0%', limit: '보증금 3,500만 + 월세 월 50만', term: '2년',
    target: '만 19~34세 무주택 단독세대주', cond: '연소득 5,000만원 이하 · 보증금 6,500만 이하 주택',
    docs: '신분증, 소득증빙, 임대차계약서', deadline: '상시', link: LINKS.enhuf,
    c: u => u.purpose === 'monthly' && u.age >= 19 && u.age <= 34 && u.homeless && u.income <= 5000 },
  { name: '주거안정 월세대출', cat: '월세', rate: '연 1.3%', limit: '월 60만원 (2년, 최대 1,440만원)', term: '2년 (최장 10년)',
    target: '취업준비생·사회초년생·근로장려금 수급자 등', cond: '연소득 5,000만원 이하 (우대형은 별도)',
    docs: '소득증빙, 임대차계약서', deadline: '상시', link: LINKS.enhuf,
    c: u => u.purpose === 'monthly' && u.income <= 5000 },
  { name: '디딤돌 구입자금대출', cat: '구입', rate: '연 2.65~3.95%', limit: '최대 2.5억 (신혼·2자녀 4억)', term: '10~30년',
    target: '무주택 세대주', cond: '연소득 6,000만원 이하 (신혼 8,500만원) · 주택 5억 이하(신혼 6억)',
    docs: '소득증빙, 매매계약서, 등기부등본', deadline: '상시', link: LINKS.enhuf,
    c: u => u.purpose === 'buy' && u.homeless && (u.marital === 'married' ? u.income <= 8500 : u.income <= 6000) },
  { name: '신생아 특례 디딤돌 구입대출', cat: '구입', rate: '연 1.6~3.3%', limit: '최대 5억원', term: '10~30년',
    target: '2년 내 출산(입양) 무주택 가구', cond: '부부합산 연소득 1.3억원 이하 · 주택 9억 이하',
    docs: '출생증명서, 소득증빙, 매매계약서', deadline: '상시', link: LINKS.enhuf,
    c: u => u.purpose === 'buy' && u.homeless && u.child === 'newborn' && u.income <= 13000 },
  { name: '청년 주택드림 디딤돌 대출', cat: '구입', rate: '연 2.2~3.6% (청약 당첨 시 최저 1%대)', limit: '분양가의 80%', term: '최장 40년',
    target: '만 20~39세 청년 주택드림 청약통장 가입자', cond: '연소득 7,000만원 이하 (미혼 기준)',
    docs: '청약통장, 당첨 서류, 소득증빙', deadline: '상시', link: LINKS.enhuf,
    c: u => u.purpose === 'buy' && u.age >= 20 && u.age <= 39 && u.income <= 7000 },
  { name: '보금자리론', cat: '구입', rate: '연 3.9~4.3% 수준', limit: '최대 3.6억 (다자녀 4억)', term: '10~50년',
    target: '무주택 또는 1주택(처분 조건)', cond: '연소득 7,000만원 이하(신혼 8,500) · 주택 6억 이하',
    docs: '소득증빙, 매매계약서', deadline: '상시', link: LINKS.hf,
    c: u => u.purpose === 'buy' && u.income <= 8500 },
  { name: 'HUG·HF 전세보증금 반환보증', cat: '보증', rate: '보증료 연 0.1~0.15% 수준', limit: '보증금 수도권 7억 이하', term: '임대차 기간',
    target: '전세(보증부 월세) 계약 임차인', cond: '전입신고+확정일자 필요 · 주택 유형별 조건 상이',
    docs: '임대차계약서, 등기부등본, 전입세대열람', deadline: '잔금·전입 후 조기 가입 권장', link: LINKS.hug,
    c: u => u.purpose !== 'buy' },
  { name: '청년월세 한시 특별지원', cat: '지원금', rate: '—', limit: '월 최대 20만원 × 12개월', term: '12개월',
    target: '만 19~34세 독립 거주 청년', cond: '청년가구 중위소득 60% 이하 · 보증금 5,000만 이하',
    docs: '임대차계약서, 소득·재산 신고', deadline: '지자체 공고 기간 내', link: LINKS.bokjiro,
    c: u => u.purpose === 'monthly' && u.age >= 19 && u.age <= 34 && u.income <= 2500 },
  { name: '주거급여', cat: '지원금', rate: '—', limit: '지역·가구별 기준임대료 내 실비', term: '수급 기간',
    target: '소득인정액 중위소득 48% 이하 가구', cond: '부양의무자 기준 없음',
    docs: '임대차계약서, 소득·재산 신고', deadline: '상시', link: LINKS.bokjiro,
    c: u => u.income <= 2000 },
  { name: '행복주택', cat: '공공임대', rate: '시세의 60~80% 임대료', limit: '전용 60㎡ 이하', term: '6~20년',
    target: '청년·신혼부부·대학생 등', cond: '무주택 · 소득 기준(모집공고별 상이)',
    docs: '청약통장, 소득·자산 서류', deadline: '모집공고 기간 내', link: LINKS.lh,
    c: u => u.homeless && (u.age <= 39 || u.marital !== 'single') },
  { name: '매입·전세임대주택', cat: '공공임대', rate: '시세의 30~50% 수준', limit: '지역별 지원 한도 내', term: '최장 20년',
    target: '저소득층·청년·신혼부부', cond: '무주택 · 소득·자산 기준(유형별 상이)',
    docs: '소득·자산 서류', deadline: '모집공고 기간 내', link: LINKS.lh,
    c: u => u.homeless && u.income <= 4000 },
  { name: '지자체 이사비·중개보수 지원', cat: '지원금', rate: '—', limit: '지자체별 최대 40만원 수준', term: '—',
    target: '청년·신혼부부 (지자체별 상이)', cond: '지자체 거주·전입 요건 확인 필요',
    docs: '이사비 영수증, 임대차계약서', deadline: '지자체 공고 기간 내', link: LINKS.youth,
    c: u => u.age <= 39 || u.marital !== 'single' }
];

/* ---------- 진단 실행 ---------- */
document.getElementById('btn-match').addEventListener('click', function () {
  const u = {
    age: +document.getElementById('l-age').value,
    marital: document.getElementById('l-marital').value,
    marriedYears: +document.getElementById('l-married-years').value || 0,
    child: document.getElementById('l-child').value,
    homeless: document.getElementById('l-homeless').value === 'yes',
    income: +document.getElementById('l-income').value,
    assets: +document.getElementById('l-assets').value || 0,
    region: document.getElementById('l-region').value,
    purpose: document.getElementById('l-purpose').value,
    price: +document.getElementById('l-price').value || 0,
    amount: +document.getElementById('l-amount').value || 0,
    sme: document.getElementById('l-sme').value === 'yes'
  };
  const err = document.getElementById('l-error');
  if (!u.age || !u.income) { err.style.display = 'block'; return; }
  err.style.display = 'none';
  store.set('loanInput', u);

  document.getElementById('match-result').style.display = 'none';
  document.getElementById('match-loading').style.display = 'block';
  setTimeout(function () {
    document.getElementById('match-loading').style.display = 'none';
    renderMatches(u);
  }, 600);
});

function renderMatches(u) {
  const matched = POLICIES.filter(p => { try { return p.c(u); } catch (e) { return false; } });
  const box = document.getElementById('match-cards');
  document.getElementById('match-result').style.display = 'block';

  if (!matched.length) {
    box.innerHTML = '<div class="card"><div class="state">' + icon('empty') +
      '<p>입력 조건에 맞는 제도를 찾지 못했어요.<br>소득·목적을 바꿔 다시 진단해 보시거나,<br>마이홈포털 자가진단을 이용해 보세요.</p>' +
      '<a class="btn btn-sm" style="margin-top:10px" href="https://www.myhome.go.kr" target="_blank" rel="noopener">마이홈포털 자가진단</a></div></div>';
    return;
  }
  box.innerHTML = '<p style="font-size:14px;margin-bottom:10px"><b style="color:var(--primary)">' + matched.length + '개</b> 제도가 조건에 맞을 가능성이 있어요.</p>' +
    matched.map(p =>
      '<div class="card">' +
      '<div class="section-head" style="margin-bottom:6px"><h3>' + p.name + '</h3><span class="badge badge-blue">' + p.cat + '</span></div>' +
      '<div class="table-wrap"><table style="min-width:0;font-size:13px"><tbody>' +
      '<tr><th style="width:90px">대상</th><td>' + p.target + '</td></tr>' +
      '<tr><th>조건</th><td>' + p.cond + '</td></tr>' +
      '<tr><th>금리</th><td>' + p.rate + '</td></tr>' +
      '<tr><th>한도</th><td>' + p.limit + '</td></tr>' +
      '<tr><th>기간</th><td>' + p.term + '</td></tr>' +
      '<tr><th>준비서류</th><td>' + p.docs + '</td></tr>' +
      '<tr><th>신청기한</th><td>' + p.deadline + '</td></tr>' +
      '</tbody></table></div>' +
      '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">' +
      '<a class="btn btn-sm" href="' + p.link + '" target="_blank" rel="noopener">공식 사이트에서 신청·확인</a>' +
      '<button class="btn btn-sm btn-outline" onclick="prefillRepay()">이 금액으로 상환 계산</button></div>' +
      '<p class="sub" style="font-size:11px;margin-top:8px">' + ASOF + '</p>' +
      '</div>'
    ).join('');
}

/* ---------- 상환 계산기 ---------- */
function prefillRepay() {
  const u = store.get('loanInput', null);
  if (u && u.amount) document.getElementById('r-amount').value = u.amount;
  showTab('repay');
  calcRepay();
}
function calcRepay() {
  const P = (+document.getElementById('r-amount').value || 0) * 10000;
  const annual = (+document.getElementById('r-rate').value || 0) / 100;
  const years = +document.getElementById('r-years').value || 0;
  const box = document.getElementById('repay-result');
  if (!P || !annual || !years) {
    box.innerHTML = '<div class="state">' + icon('empty') + '<p>금액·금리·기간을 모두 입력해 주세요.</p></div>';
    return;
  }
  const n = years * 12, r = annual / 12;

  // 원리금균등: 매달 동일 금액
  const pmtEq = P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
  const intEq = pmtEq * n - P;
  // 원금균등: 원금 고정 + 이자 감소 (첫 달 최대)
  const principalMo = P / n;
  const firstPmt = principalMo + P * r;
  const lastPmt = principalMo + principalMo * r;
  const intGd = P * r * (n + 1) / 2;
  // 만기일시: 매달 이자만, 만기에 원금
  const pmtBul = P * r;
  const intBul = pmtBul * n;

  function row(name, monthly, total, note) {
    return '<tr><td><b>' + name + '</b><br><small class="sub">' + note + '</small></td>' +
      '<td style="text-align:right;white-space:nowrap">' + monthly + '</td>' +
      '<td style="text-align:right;white-space:nowrap;color:var(--danger)">' + fmtWon(Math.round(total)) + '</td>' +
      '<td style="text-align:right;white-space:nowrap"><b>' + fmtWon(Math.round(P + total)) + '</b></td></tr>';
  }
  box.innerHTML =
    '<div class="table-wrap"><table style="min-width:0;font-size:13px">' +
    '<thead><tr><th>방식</th><th style="text-align:right">월 상환액</th><th style="text-align:right">총 이자</th><th style="text-align:right">총 상환액</th></tr></thead><tbody>' +
    row('원리금균등', fmtWon(Math.round(pmtEq)), intEq, '매달 같은 금액 · 가장 일반적') +
    row('원금균등', fmtWon(Math.round(firstPmt)) + ' → ' + fmtWon(Math.round(lastPmt)), intGd, '점점 줄어듦 · 총이자 최소') +
    row('만기일시', fmtWon(Math.round(pmtBul)) + ' (이자만)', intBul, '만기에 원금 일시 상환 · 전세대출에 흔함') +
    '</tbody></table></div>' +
    '<p class="sub" style="font-size:12px;margin-top:8px">중도상환수수료·보증료 등 부대비용은 포함되지 않은 단순 계산입니다.</p>';
}
document.getElementById('btn-repay').addEventListener('click', calcRepay);

/* ---------- 공식 링크 모음 ---------- */
const OFFICIAL = [
  ['정부24', '전입신고·주민등록등본 발급', 'https://www.gov.kr'],
  ['부동산거래관리시스템', '임대차 신고·확정일자', 'https://rtms.molit.go.kr'],
  ['기금e든든', '버팀목·디딤돌 대출 신청', 'https://enhuf.molit.go.kr'],
  ['마이홈포털', '주거복지 자가진단·공공주택 정보', 'https://www.myhome.go.kr'],
  ['HUG 주택도시보증공사', '전세보증금 반환보증', 'https://www.khug.or.kr'],
  ['HF 한국주택금융공사', '보금자리론·전세보증', 'https://www.hf.go.kr'],
  ['LH청약플러스', '행복주택·매입임대 청약', 'https://apply.lh.or.kr'],
  ['온통청년', '청년 이사비 지원 등 청년정책 통합검색', 'https://www.youthcenter.go.kr'],
  ['복지로', '주거급여·청년월세 신청', 'https://www.bokjiro.go.kr'],
  ['한전ON', '전기 사용자 명의변경', 'https://online.kepco.co.kr'],
  ['우체국 주거이전 우편물 전송', '옛 주소 우편물을 새 주소로', 'https://www.epost.go.kr'],
  ['폐가전 무상방문수거', '대형 폐가전 무료 수거 예약', 'https://www.15990903.or.kr']
];
document.getElementById('official-links').innerHTML = OFFICIAL.map(o =>
  '<div class="task-item"><div class="grow"><div class="title">' + o[0] + '</div><div class="meta">' + o[1] + '</div></div>' +
  '<a class="btn btn-sm btn-outline" href="' + o[2] + '" target="_blank" rel="noopener">바로가기</a></div>'
).join('');
