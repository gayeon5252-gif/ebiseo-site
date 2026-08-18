/* ============================================================
   비용계산 페이지 로직
   ① 맞춤 진단 → ② 비용 계산(항목별 내역 공개) → ③ 추가비용
   ④ 방식 비교(정적 표) ⑤ 준비물 계산기
   계산식: 기본 차량·작업비 + 거리 + 인력 + 층수·운반환경 + 날짜 할증 + 추가 서비스
   ============================================================ */

/* ---------- 탭 전환 ---------- */
function showTab(name) {
  document.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');
  document.getElementById('panel-' + name).style.display = 'block';
  document.querySelectorAll('#cost-tabs .chip').forEach(c => {
    const on = c.dataset.tab === name;
    c.style.borderColor = on ? 'var(--primary)' : 'var(--border)';
    c.style.color = on ? 'var(--primary)' : 'var(--text)';
    c.style.fontWeight = on ? '700' : '400';
  });
  window.scrollTo({ top: 0 });
}
document.querySelectorAll('#cost-tabs .chip').forEach(c =>
  c.addEventListener('click', () => showTab(c.dataset.tab))
);
showTab('diagnose');

/* ---------- 가구원 수별 기준표 (참고값) ---------- */
const REF = {
  1: { boxes: [15, 25],  vol: 5,  ton: '1톤',      trucks: 1, workers: 2, hours: '3~4시간', base: [500000, 700000] },
  2: { boxes: [25, 45],  vol: 9,  ton: '1~2.5톤',  trucks: 1, workers: 2, hours: '4~5시간', base: [600000, 1200000] },
  3: { boxes: [40, 65],  vol: 15, ton: '2.5~5톤',  trucks: 1, workers: 3, hours: '5~6시간', base: [1000000, 1600000] },
  4: { boxes: [60, 90],  vol: 22, ton: '5톤',      trucks: 1, workers: 4, hours: '6~7시간', base: [1300000, 1900000] },
  5: { boxes: [85, 120], vol: 30, ton: '5~7.5톤',  trucks: 2, workers: 4, hours: '6~8시간', base: [1600000, 2300000] },
  6: { boxes: [110, 160],vol: 40, ton: '7.5~10톤', trucks: 2, workers: 5, hours: '7~9시간', base: [2000000, 3000000] }
};
const SPECIAL_FEES = { '피아노': 200000, '금고': 150000, '돌침대': 200000, '에어컨 이전설치': 150000, '벽걸이TV 이전': 70000 };

/* ---------- 이사 방식: 기본 작업비 배율 ----------
   포장이사(REF 기준) 대비 — 반포장은 잔짐 포장을 직접 하므로 약 75%,
   일반이사는 운반만 맡기므로 약 55%, 용달은 차량+기사 운반만이라 약 38% */
const METHODS = {
  pack:   { name: '포장이사',   mult: 1.0,  who: '포장·운반·정리 모두 업체' },
  semi:   { name: '반포장이사', mult: 0.75, who: '큰 짐 포장·운반은 업체, 잔짐은 직접' },
  normal: { name: '일반이사',   mult: 0.55, who: '운반만 업체 (포장·정리 직접)' },
  truck:  { name: '용달이사',   mult: 0.38, who: '차량+기사 운반만 (포장·상하차 보조·정리 직접)' }
};

/* ---------- 지역 좌표 → 거리 자동 계산 ---------- */
const REGIONS = {
  '서울': [37.5665, 126.9780], '인천': [37.4563, 126.7052], '수원': [37.2636, 127.0286],
  '성남': [37.4200, 127.1265], '고양': [37.6584, 126.8320], '용인': [37.2411, 127.1776],
  '부천': [37.5034, 126.7660], '안산': [37.3219, 126.8309], '안양': [37.3943, 126.9568],
  '화성': [37.1995, 126.8310], '평택': [36.9921, 127.1129], '의정부': [37.7381, 127.0337],
  '파주': [37.7600, 126.7800], '김포': [37.6153, 126.7156], '춘천': [37.8813, 127.7298],
  '원주': [37.3422, 127.9202], '강릉': [37.7519, 128.8761], '대전': [36.3504, 127.3845],
  '세종': [36.4800, 127.2890], '청주': [36.6424, 127.4890], '천안': [36.8151, 127.1139],
  '아산': [36.7898, 127.0019], '전주': [35.8242, 127.1480], '군산': [35.9676, 126.7366],
  '익산': [35.9483, 126.9576], '광주': [35.1595, 126.8526], '목포': [34.8118, 126.3922],
  '여수': [34.7604, 127.6622], '순천': [34.9506, 127.4872], '대구': [35.8714, 128.6014],
  '포항': [36.0190, 129.3435], '경주': [35.8562, 129.2247], '구미': [36.1195, 128.3446],
  '부산': [35.1796, 129.0756], '울산': [35.5384, 129.3114], '창원': [35.2281, 128.6811],
  '김해': [35.2285, 128.8894], '진주': [35.1800, 128.1076], '제주': [33.4996, 126.5312]
};
function haversine(a, b) {
  const R = 6371, toRad = x => x * Math.PI / 180;
  const dLat = toRad(b[0] - a[0]), dLng = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
// 출발지·도착지 select 채우기
(function () {
  const opts = Object.keys(REGIONS).map(r => '<option value="' + r + '">' + r + '</option>').join('');
  document.getElementById('f-from').innerHTML = '<option value="">선택</option>' + opts;
  document.getElementById('f-to').innerHTML = '<option value="">선택</option>' + opts;
})();
function updateDistance() {
  const from = document.getElementById('f-from').value;
  const to = document.getElementById('f-to').value;
  const sameWrap = document.getElementById('samearea-wrap');
  if (!from || !to) return;
  if (from === to) {
    sameWrap.style.display = 'block';
    document.getElementById('f-distance').value = document.getElementById('f-samearea').value;
  } else {
    sameWrap.style.display = 'none';
    // 직선거리 × 1.25 (도로 우회 보정)
    document.getElementById('f-distance').value = Math.max(1, Math.round(haversine(REGIONS[from], REGIONS[to]) * 1.25));
  }
}
['f-from', 'f-to', 'f-samearea'].forEach(id =>
  document.getElementById(id).addEventListener('change', updateDistance)
);

/* ---------- 짐 선택 칩 토글 ---------- */
const selectedItems = new Set();
document.querySelectorAll('#f-items .chip').forEach(c => {
  c.addEventListener('click', function () {
    const it = this.dataset.item;
    if (selectedItems.has(it)) {
      selectedItems.delete(it);
      this.style.background = 'var(--surface)'; this.style.color = 'var(--text)'; this.style.borderColor = 'var(--border)';
    } else {
      selectedItems.add(it);
      this.style.background = 'var(--primary)'; this.style.color = '#fff'; this.style.borderColor = 'var(--primary)';
    }
  });
});

/* ---------- 진단 → 계산 ---------- */
document.getElementById('btn-diagnose').addEventListener('click', function () {
  const people = +document.getElementById('f-people').value;
  const distance = +document.getElementById('f-distance').value;
  const floorFrom = +document.getElementById('f-floor-from').value;
  const floorTo = +document.getElementById('f-floor-to').value;
  const err = document.getElementById('diag-error');

  if (!people || !distance || !floorFrom || !floorTo) { err.style.display = 'block'; return; } // 오류 상태
  err.style.display = 'none';

  const diag = {
    people, distance, floorFrom, floorTo,
    method: document.getElementById('f-method').value,
    from: document.getElementById('f-from').value,
    to: document.getElementById('f-to').value,
    date: document.getElementById('f-date').value,
    elevator: document.getElementById('f-elevator').value,
    elevFee: +document.getElementById('f-elev-fee').value || 0,
    ladder: document.getElementById('f-ladder').value,
    parking: document.getElementById('f-parking').value,
    carry: document.getElementById('f-carry').value,
    storage: document.getElementById('f-storage').value,
    items: [...selectedItems]
  };
  store.set('diagnosis', diag);

  // 로딩 상태 → 결과
  showTab('result');
  document.getElementById('result-empty').style.display = 'none';
  document.getElementById('result-body').style.display = 'none';
  document.getElementById('result-loading').style.display = 'block';
  setTimeout(function () {
    document.getElementById('result-loading').style.display = 'none';
    renderResult(diag);
    if (window.track) window.track('cost_calculation_completed', { method: (diag.method||'') });
  }, 600);
});

function calc(diag) {
  const ref = REF[diag.people];
  const method = METHODS[diag.method || 'pack'];
  const rows = [];   // {name, desc, amount}
  // 이사 방식 배율을 기본 작업비에 적용 (거리·환경·특수짐 비용은 방식과 무관하게 동일)
  let min = Math.round(ref.base[0] * method.mult), max = Math.round(ref.base[1] * method.mult);
  const workers = diag.method === 'truck' ? '기사 1명 (상하차 보조 시 인력 추가)' : '작업 ' + ref.workers + '명';
  rows.push({ name: '기본 차량·작업비', desc: ref.ton + ' ' + ref.trucks + '대 · ' + workers + ' — ' + method.name + ' 기준', amount: (min + max) / 2 });

  // 거리: 30km 초과분 km당 2,000원
  let distFee = diag.distance > 30 ? (diag.distance - 30) * 2000 : 0;
  if (distFee) rows.push({ name: '거리 할증', desc: '30km 초과 ' + (diag.distance - 30) + 'km × 2,000원', amount: distFee });

  // 층수·운반환경
  let envFee = 0; const envDesc = [];
  if (diag.elevator === 'none') { const f = (Math.max(diag.floorFrom, 1) - 1 + Math.max(diag.floorTo, 1) - 1) * 20000; envFee += f; envDesc.push('계단 작업(양쪽 무엘베) ' + fmtWon(f)); }
  else if (diag.elevator === 'one') { const f = (Math.max(diag.floorFrom, diag.floorTo) - 1) * 15000; envFee += f; envDesc.push('계단 작업(한쪽 무엘베) ' + fmtWon(f)); }
  if (diag.elevFee) { envFee += diag.elevFee; envDesc.push('엘리베이터 예약비 ' + fmtWon(diag.elevFee)); }
  if (diag.ladder === 'yes' && diag.elevator !== 'both') { envFee += 250000; envDesc.push('사다리차 약 250,000원'); }
  if (diag.carry === 'mid') { envFee += 50000; envDesc.push('운반거리 10~30m +50,000원'); }
  if (diag.carry === 'long') { envFee += 150000; envDesc.push('장거리 손운반 +150,000원'); }
  if (diag.parking === 'no') { envFee += 30000; envDesc.push('주차 불가(주차료 등) +30,000원'); }
  if (envFee) rows.push({ name: '층수·운반환경', desc: envDesc.join(' · '), amount: envFee });

  // 날짜 할증: 주말/월말 (금~일 10%, 25일~말일 10%)
  let dateRate = 0; const dateDesc = [];
  if (diag.date) {
    const d = new Date(diag.date);
    if ([0, 5, 6].includes(d.getDay())) { dateRate += 0.1; dateDesc.push('주말 +10%'); }
    if (d.getDate() >= 25) { dateRate += 0.1; dateDesc.push('월말 +10%'); }
  }
  const baseAvg = (min + max) / 2; // 방식 배율이 적용된 기본비 기준
  const dateFee = Math.round(baseAvg * dateRate);
  if (dateFee) rows.push({ name: '날짜 할증', desc: dateDesc.join(' · ') + ' (손 없는 날은 추가 할증 가능)', amount: dateFee });

  // 추가 서비스(특수 짐 등)
  let svcFee = 0; const svcDesc = [];
  diag.items.forEach(it => { if (SPECIAL_FEES[it]) { svcFee += SPECIAL_FEES[it]; svcDesc.push(it + ' ' + fmtWon(SPECIAL_FEES[it])); } });
  if (diag.storage === 'yes') { svcFee += 300000; svcDesc.push('보관이사(1개월 보관+상하차) 약 300,000원'); }
  if (svcFee) rows.push({ name: '추가 서비스', desc: svcDesc.join(' · '), amount: svcFee });

  const extra = distFee + envFee + dateFee + svcFee;
  min += extra; max += extra;
  const avg = Math.round((min + max) / 2);
  return { ref, method, rows, min, max, avg, extra };
}

function renderResult(diag) {
  const r = calc(diag);
  document.getElementById('result-body').style.display = 'block';

  // 규모
  const workerTxt = diag.method === 'truck' ? '기사 1명' : r.ref.workers + '명';
  document.getElementById('scale-grid').innerHTML =
    stat(r.ref.boxes[0] + '~' + r.ref.boxes[1] + '박스', '예상 박스 수') +
    stat('약 ' + r.ref.vol + '㎥', '짐 부피') +
    stat(r.ref.ton + ' × ' + r.ref.trucks + '대', '차량') +
    stat(workerTxt + ' · ' + r.ref.hours, '작업 인원·시간');

  // 선택한 방식 표시 + 방식별 비용 비교 (동일 조건 적용)
  const cmpRows = Object.keys(METHODS).map(k => {
    const c = calc(Object.assign({}, diag, { method: k }));
    const isSel = k === (diag.method || 'pack');
    return '<tr' + (isSel ? ' style="background:#EBF3FE"' : '') + '><td><b>' + METHODS[k].name + '</b>' +
      (isSel ? ' <span class="badge badge-blue">선택</span>' : '') + '</td><td>' + METHODS[k].who + '</td>' +
      '<td style="text-align:right;white-space:nowrap">' + fmtMan(c.min) + ' ~ ' + fmtMan(c.max) + '</td></tr>';
  }).join('');
  document.getElementById('method-compare').innerHTML =
    '<h3 style="margin:16px 0 8px">같은 조건, 방식별 비용 비교</h3>' +
    '<div class="table-wrap"><table><thead><tr><th>방식</th><th>담당 범위</th><th style="text-align:right">예상 비용</th></tr></thead><tbody>' + cmpRows + '</tbody></table></div>';

  // 비용
  document.getElementById('method-label').textContent = r.method.name + ' 기준';
  document.getElementById('cost-grid').innerHTML =
    stat(fmtMan(r.min), '최소', 'var(--success)') +
    stat(fmtMan(r.avg), '평균', 'var(--primary)') +
    stat(fmtMan(r.max), '최대', 'var(--warn)') +
    stat(fmtMan(Math.round(r.avg * 0.125)), '권장 예비비(12.5%)');

  // 내역 표
  document.querySelector('#breakdown-table tbody').innerHTML = r.rows.map(row =>
    '<tr><td><b>' + row.name + '</b></td><td>' + row.desc + '</td><td style="text-align:right;white-space:nowrap">' + fmtWon(Math.round(row.amount)) + '</td></tr>'
  ).join('');

  // 홈 화면 연동용 저장
  store.set('costEstimate', { min: r.min, avg: r.avg, max: r.max });
}
function stat(val, label, color) {
  return '<div class="card" style="padding:14px;text-align:center"><b style="font-size:16px;color:' + (color || '#191F28') + '">' + val + '</b><div style="font-size:12px;color:var(--sub)">' + label + '</div></div>';
}

// 이전 진단이 있으면 결과 즉시 복원
const savedDiag = store.get('diagnosis', null);
if (savedDiag) { document.getElementById('result-empty').style.display = 'none'; renderResult(savedDiag); }

/* ---------- ③ 추가비용 계산 ---------- */
const EXTRAS = [
  { name: '손 없는 날 할증', desc: '음력 9·0일, 수요 집중', fee: 150000 },
  { name: '주말 할증', desc: '금·토·일 이사', fee: 100000 },
  { name: '월말 할증', desc: '25일~말일', fee: 100000 },
  { name: '장거리 할증', desc: '시·도 간 이동(100km 이상)', fee: 200000 },
  { name: '엘리베이터 사용료', desc: '아파트 관리사무소 납부', fee: 100000 },
  { name: '계단 작업비', desc: '엘리베이터 없는 층 작업', fee: 100000 },
  { name: '사다리차', desc: '층수별 상이, 회당', fee: 250000 },
  { name: '좁은 골목 진입', desc: '소형차 환적 작업', fee: 100000 },
  { name: '장거리 손운반', desc: '트럭→현관 30m 이상', fee: 150000 },
  { name: '추가 인력', desc: '1명당', fee: 150000 },
  { name: '주차료·통행료', desc: '고속도로·공영주차장', fee: 30000 },
  { name: '보관창고', desc: '월 기준', fee: 200000 },
  { name: '입주청소', desc: '평수별 상이(20평대 기준)', fee: 250000 },
  { name: '폐기물 처리', desc: '대형 폐기물 스티커·수거', fee: 50000 },
  { name: '가전 해체·설치', desc: '세탁기·건조기 등', fee: 80000 },
  { name: '에어컨 이전설치', desc: '배관 추가 시 증가', fee: 150000 },
  { name: '정수기·인터넷 이전', desc: '업체별 상이', fee: 50000 },
  { name: '추가 운행', desc: '왕복 2회 이상', fee: 150000 }
];
const extraChecked = store.get('extraChecked', {});
function renderExtras() {
  document.getElementById('extra-list').innerHTML = EXTRAS.map((e, i) =>
    '<label class="check-row"><input type="checkbox" data-i="' + i + '"' + (extraChecked[i] ? ' checked' : '') + '>' +
    '<div class="grow"><div style="font-weight:600;font-size:14px;color:#191F28">' + e.name + '</div><small>' + e.desc + '</small></div>' +
    '<b style="white-space:nowrap">' + fmtWon(e.fee) + '</b></label>'
  ).join('');
  document.querySelectorAll('#extra-list input').forEach(cb =>
    cb.addEventListener('change', function () {
      extraChecked[this.dataset.i] = this.checked;
      store.set('extraChecked', extraChecked);
      updateExtraTotal();
    })
  );
  updateExtraTotal();
}
function updateExtraTotal() {
  const total = EXTRAS.reduce((s, e, i) => s + (extraChecked[i] ? e.fee : 0), 0);
  document.getElementById('extra-total').textContent = fmtWon(total);
  store.set('spentTotal', total); // 홈 '사용한 비용' 연동
}
renderExtras();

/* ---------- ⑤ 준비물 계산기 ---------- */
const SUPPLY_BASE = [ // [이름, 1인 기준 수량, 인원 배수 적용 여부]
  ['소형 박스', 5, 1], ['중형 박스', 8, 1], ['대형 박스', 5, 1], ['옷걸이 박스', 2, 1],
  ['에어캡(뽁뽁이)', 1, 1, '롤'], ['포장지(신문지 대용)', 1, 1, '묶음'], ['박스테이프', 3, 1, '개'],
  ['커터칼', 1, 0, '개'], ['매직(네임펜)', 2, 0, '개'], ['색상 라벨 스티커', 1, 0, '세트'],
  ['지퍼백(소품용)', 10, 1, '장'], ['압축팩(이불·옷)', 3, 1, '장'], ['매트리스 커버', 1, 1, '장'],
  ['소파 커버', 1, 0, '장'], ['모서리 보호대', 8, 1, '개'], ['목장갑', 2, 1, '켤레'],
  ['덧신(실내 보호)', 2, 1, '켤레'], ['손수레(대여 가능)', 1, 0, '대'], ['종량제봉투(대형)', 5, 1, '장'],
  ['청소용품(물티슈·세제·걸레)', 1, 0, '세트'], ['기본 공구(드라이버·육각)', 1, 0, '세트']
];
const SURVIVAL = [
  '신분증·계약서·귀중품', '상비약·처방약', '휴대폰 충전기·멀티탭', '세면도구·수건',
  '갈아입을 옷 1~2벌', '침구(이불·베개)', '휴지·물티슈', '생수·간단한 간식',
  '일회용 컵·수저', '반려동물 용품(사료·배변패드)', '아이 용품(기저귀·분유)'
];
function renderSupplies() {
  const p = +document.getElementById('supply-people').value;
  const mult = p === 1 ? 1 : p === 2 ? 1.6 : p === 3 ? 2.3 : p === 4 ? 3 : p === 5 ? 3.8 : 4.5;
  document.querySelector('#supply-table tbody').innerHTML = SUPPLY_BASE.map(s => {
    const qty = s[2] ? Math.ceil(s[1] * mult) : s[1];
    return '<tr><td>' + s[0] + '</td><td style="text-align:right"><b>' + qty + (s[3] || '개') + '</b></td></tr>';
  }).join('');
}
document.getElementById('supply-people').addEventListener('change', renderSupplies);
renderSupplies();

const survivalDone = store.get('survivalDone', {});
document.getElementById('survival-list').innerHTML = SURVIVAL.map((s, i) =>
  '<label class="check-row"><input type="checkbox" data-i="' + i + '"' + (survivalDone[i] ? ' checked' : '') + '><div class="grow" style="font-size:14px">' + s + '</div></label>'
).join('');
document.querySelectorAll('#survival-list input').forEach(cb =>
  cb.addEventListener('change', function () { survivalDone[this.dataset.i] = this.checked; store.set('survivalDone', survivalDone); })
);
