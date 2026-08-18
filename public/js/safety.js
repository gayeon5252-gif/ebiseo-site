/* ============================================================
   집 계약 안전센터
   ① 계약 전 체크 ② 특약 예시 ③ 입주점검(상태+메모 저장) ④ 예산장
   ============================================================ */

/* ---------- 탭 ---------- */
function showTab(name) {
  document.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');
  document.getElementById('panel-' + name).style.display = 'block';
  document.querySelectorAll('#safe-tabs .chip').forEach(c => {
    const on = c.dataset.tab === name;
    c.style.borderColor = on ? 'var(--primary)' : 'var(--border)';
    c.style.color = on ? 'var(--primary)' : 'var(--text)';
    c.style.fontWeight = on ? '700' : '400';
  });
  window.scrollTo({ top: 0 });
}
document.querySelectorAll('#safe-tabs .chip').forEach(c =>
  c.addEventListener('click', () => showTab(c.dataset.tab))
);
showTab('precheck');

/* ---------- ① 계약 전 체크 ---------- */
const PRECHECK = [
  { t: '등기부등본 열람 (계약 직전 + 잔금일 재열람)', m: '인터넷등기소에서 소유자·근저당·압류·신탁등기 확인. 잔금일에 한 번 더!' },
  { t: '건축물대장 확인', m: '위반건축물 여부, 실제 용도(주거용) 확인 — 정부24 무료 발급' },
  { t: '집주인 신분 · 대리권 확인', m: '신분증과 등기부 소유자 일치 확인. 대리인이면 위임장+인감증명서 필수' },
  { t: '근저당·압류·신탁등기 확인', m: '근저당이 많으면 경매 시 보증금을 못 받을 수 있어요. 신탁등기는 신탁사 동의 필요' },
  { t: '시세·실거래가 확인', m: '국토부 실거래가·부동산 플랫폼에서 확인. 보증금이 매매가의 70% 넘으면 위험 신호' },
  { t: '선순위 보증금 확인 (다가구)', m: '나보다 먼저 들어온 세입자들의 보증금 합계 확인 — 임대인 동의로 확정일자 부여 현황 열람' },
  { t: '국세·지방세 체납 확인', m: '임대인 동의로 미납국세 열람 가능. 세금 체납은 보증금보다 우선 변제돼요' },
  { t: '전세보증 가입 가능 여부 확인', m: '계약 전 HUG·HF 보증 가입 가능한 조건인지 확인 — 불가능한 집은 위험 신호' },
  { t: '공인중개사 등록 · 공제증서 확인', m: '국가공간정보포털에서 등록 조회, 공제증서(1억 이상) 사본 받기' }
];
const preDone = store.get('preDone', {});
function renderPrecheck() {
  document.getElementById('precheck-list').innerHTML = PRECHECK.map((p, i) =>
    '<label class="check-row task-item' + (preDone[i] ? ' done' : '') + '">' +
    '<input type="checkbox" data-i="' + i + '"' + (preDone[i] ? ' checked' : '') + '>' +
    '<div class="grow"><div class="title">' + p.t + '</div><div class="meta">' + p.m + '</div></div></label>'
  ).join('');
  const cnt = PRECHECK.filter((_, i) => preDone[i]).length;
  const pct = Math.round(cnt / PRECHECK.length * 100);
  document.getElementById('pre-pct').textContent = pct + '%';
  document.getElementById('pre-bar').style.width = pct + '%';
  document.querySelectorAll('#precheck-list input').forEach(cb =>
    cb.addEventListener('change', function () {
      preDone[this.dataset.i] = this.checked; store.set('preDone', preDone); renderPrecheck();
    })
  );
}
renderPrecheck();

/* ---------- ② 특약 예시 ---------- */
const CLAUSES = [
  { t: '대출 미승인 시 계약금 반환', c: '임차인의 전세자금대출이 금융기관 사정으로 승인되지 않을 경우, 본 계약은 무효로 하며 임대인은 수령한 계약금을 즉시 전액 반환한다.' },
  { t: '보증보험 가입 불가 시 계약 해제', c: '본 주택이 전세보증금 반환보증(HUG·HF) 가입이 불가능한 것으로 확인될 경우, 임차인은 계약을 해제할 수 있으며 임대인은 계약금을 전액 반환한다.' },
  { t: '근저당 등 권리변동 금지', c: '임대인은 잔금 지급일 익일까지 본 주택에 근저당권 등 새로운 권리를 설정하지 않는다. 위반 시 임차인은 계약을 해제하고 계약금의 배액을 청구할 수 있다.' },
  { t: '세금 체납 고지 의무', c: '임대인은 계약일 현재 국세·지방세 체납이 없음을 확인하며, 체납 사실이 확인될 경우 임차인은 계약을 해제할 수 있다.' },
  { t: '입주 전 수리 완료', c: '임대인은 입주일 전까지 [보일러·누수·곰팡이 등 구체 항목]을 수리 완료한다. 미이행 시 임차인은 수리비를 보증금 또는 월세에서 공제할 수 있다.' },
  { t: '보증금 반환 지연 배상', c: '임대차 종료 후 임대인이 보증금 반환을 지연하는 경우 연 [○]%의 지연이자를 지급한다.' }
];
document.getElementById('clause-list').innerHTML = CLAUSES.map((c, i) =>
  '<div class="task-item"><div class="grow"><div class="title">' + c.t + '</div>' +
  '<div class="meta" style="margin-top:4px;padding:10px;background:var(--bg);border-radius:8px;font-size:13px;color:var(--text)">"' + c.c + '"</div></div>' +
  '<button class="btn btn-sm btn-outline" data-ci="' + i + '">복사</button></div>'
).join('');
document.querySelectorAll('[data-ci]').forEach(b =>
  b.addEventListener('click', function () {
    navigator.clipboard.writeText(CLAUSES[this.dataset.ci].c).then(() => {
      this.textContent = '복사됨!'; setTimeout(() => this.textContent = '복사', 1500);
    }).catch(() => alert('복사에 실패했어요. 문구를 직접 선택해 복사해 주세요.'));
  })
);

/* ---------- ③ 입주점검 (상태 + 메모 저장) ---------- */
const INSPECT = ['누수(천장·벽 얼룩)', '곰팡이·결로', '수압(샤워기·주방 동시)', '배수(세면대·바닥 배수구)', '보일러 작동·온수', '콘센트·스위치 전체', '창문 개폐·잠금', '방충망 상태', '도어락·현관문', '소음(창 닫고/열고)', '주차 공간 확인', '관리비 포함 항목 확인'];
const inspectData = store.get('inspectData', {});
function renderInspect() {
  document.getElementById('inspect-list').innerHTML = INSPECT.map((name, i) => {
    const d = inspectData[i] || { s: '', memo: '' };
    return '<div class="task-item" style="flex-wrap:wrap"><div class="grow" style="min-width:160px"><div class="title">' + name + '</div></div>' +
      '<select data-si="' + i + '" style="width:110px;padding:8px">' +
        '<option value=""' + (d.s === '' ? ' selected' : '') + '>선택</option>' +
        '<option value="good"' + (d.s === 'good' ? ' selected' : '') + '>양호</option>' +
        '<option value="soso"' + (d.s === 'soso' ? ' selected' : '') + '>보통</option>' +
        '<option value="bad"' + (d.s === 'bad' ? ' selected' : '') + '>하자!</option></select>' +
      '<input type="text" data-mi="' + i + '" placeholder="메모 (위치·상태)" value="' + (d.memo || '').replace(/"/g, '&quot;') + '" style="flex:1;min-width:140px;padding:8px">' +
      '</div>';
  }).join('');
  document.querySelectorAll('[data-si]').forEach(s =>
    s.addEventListener('change', function () {
      const i = this.dataset.si;
      inspectData[i] = inspectData[i] || {}; inspectData[i].s = this.value;
      store.set('inspectData', inspectData);
      this.style.borderColor = this.value === 'bad' ? 'var(--danger)' : 'var(--border)';
    })
  );
  document.querySelectorAll('[data-mi]').forEach(m =>
    m.addEventListener('input', function () {
      const i = this.dataset.mi;
      inspectData[i] = inspectData[i] || {}; inspectData[i].memo = this.value;
      store.set('inspectData', inspectData);
    })
  );
}
renderInspect();

/* ---------- ④ 전체비용 예산장 ---------- */
const BUDGET_ITEMS = {
  rent: ['보증금·잔금', '월세(첫 달)', '관리비(예치·첫 달)', '중개보수', '보증보험료', '이사비', '입주청소비', '가전 이전·설치비'],
  buy: ['계약금', '중도금', '잔금', '취득세', '중개보수', '등기·법무 비용', '대출 부대비용(인지세 등)', '수리·인테리어', '가구·가전 구입', '이사비']
};
const budgetData = store.get('budgetData', { rent: {}, buy: {} });
function renderBudget() {
  const type = document.getElementById('budget-type').value;
  const items = BUDGET_ITEMS[type];
  const data = budgetData[type];
  document.querySelector('#budget-table tbody').innerHTML = items.map((name, i) => {
    const d = data[i] || { est: '', act: '' };
    return '<tr><td>' + name + '</td>' +
      '<td><input type="number" data-be="' + i + '" value="' + (d.est || '') + '" placeholder="0" style="padding:8px"></td>' +
      '<td><input type="number" data-ba="' + i + '" value="' + (d.act || '') + '" placeholder="0" style="padding:8px"></td></tr>';
  }).join('');
  bindBudget(type, items.length);
  updateBudgetTotals(type, items.length);
}
function bindBudget(type) {
  document.querySelectorAll('[data-be],[data-ba]').forEach(inp =>
    inp.addEventListener('input', function () {
      const isEst = this.hasAttribute('data-be');
      const i = isEst ? this.dataset.be : this.dataset.ba;
      budgetData[type][i] = budgetData[type][i] || {};
      budgetData[type][i][isEst ? 'est' : 'act'] = this.value;
      store.set('budgetData', budgetData);
      updateBudgetTotals(type);
    })
  );
}
function updateBudgetTotals(type) {
  const data = budgetData[type];
  let est = 0, act = 0;
  Object.values(data).forEach(d => { est += +d.est || 0; act += +d.act || 0; });
  document.getElementById('budget-est-total').textContent = est.toLocaleString() + '만원';
  document.getElementById('budget-act-total').textContent = act.toLocaleString() + '만원';
  const diff = act - est;
  const diffEl = document.getElementById('budget-diff');
  diffEl.textContent = (diff > 0 ? '+' : '') + diff.toLocaleString() + '만원';
  diffEl.style.color = diff > 0 ? 'var(--danger)' : 'var(--success)';
  document.getElementById('budget-reserve').textContent = Math.round(est * 0.125).toLocaleString() + '만원';
  // 홈 '사용한 비용' 연동 (만원 → 원)
  store.set('budgetActual', act * 10000);
}
document.getElementById('budget-type').addEventListener('change', renderBudget);
renderBudget();
