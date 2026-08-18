/* ============================================================
   업체 고르기 · 신혼부부 도우미
   - 제휴/광고/가짜 업체표/리뷰/포인트는 제거(정식 시스템 준비 전).
     관련 코드는 config.js FEATURES 플래그로 추후 재도입 가능.
   - 모든 사용자 입력은 escapeHtml 로 이스케이프하여 XSS 방지.
   ============================================================ */

/* ---------- 탭 ---------- */
function showTab(name) {
  document.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');
  const panel = document.getElementById('panel-' + name);
  if (panel) panel.style.display = 'block';
  document.querySelectorAll('#co-tabs .chip').forEach(c => {
    const on = c.dataset.tab === name;
    c.style.borderColor = on ? 'var(--primary)' : 'var(--border)';
    c.style.color = on ? 'var(--primary)' : 'var(--text)';
    c.style.fontWeight = on ? '700' : '400';
  });
  window.scrollTo({ top: 0 });
}
document.querySelectorAll('#co-tabs .chip').forEach(c =>
  c.addEventListener('click', () => showTab(c.dataset.tab))
);
showTab('choose');

/* ---------- 계약서 기록 항목 (고정 문구 — 안전) ---------- */
const CONTRACT = ['이사 날짜와 시작·종료 시간', '짐 목록 (대형가구·가전 개별 기재)', '작업 인원 수', '차량 톤수·대수', '사다리차 등 장비 사용 여부', '총액과 포함 항목', '추가요금이 발생하는 조건 (구체적으로)', '파손·분실 시 배상 방법과 한도'];
const contractDone = store.get('contractDone', {});
function renderContract() {
  document.getElementById('contract-list').innerHTML = CONTRACT.map((t, i) =>
    '<label class="check-row"><input type="checkbox" data-i="' + i + '"' + (contractDone[i] ? ' checked' : '') + '>' +
    '<div class="grow" style="font-size:14px">' + t + '</div></label>'
  ).join('');
  document.querySelectorAll('#contract-list input').forEach(cb =>
    cb.addEventListener('change', function () { contractDone[this.dataset.i] = this.checked; store.set('contractDone', contractDone); })
  );
}
renderContract();

/* ---------- 신혼부부: 예식·이사 일정 ---------- */
const wdWedding = document.getElementById('wd-wedding');
const wdMove = document.getElementById('wd-move');
wdWedding.value = store.get('weddingDate', '') || '';
wdMove.value = store.get('moveDate', '') || '';
function renderWdTimeline() {
  const w = wdWedding.value, m = wdMove.value;
  const el = document.getElementById('wd-timeline');
  if (!w && !m) { el.innerHTML = '<div class="state">' + icon('empty') + '<p>예식일과 이사일을 입력하면<br>두 일정을 함께 관리할 수 있어요.</p></div>'; return; }
  let html = '<div class="stat-grid" style="margin-top:8px">';
  if (w) html += '<div class="card" style="padding:14px;text-align:center"><b style="font-size:18px;color:var(--primary)">' + (daysUntil(w) >= 0 ? 'D-' + daysUntil(w) : '+' + (-daysUntil(w))) + '</b><div style="font-size:12px;color:var(--sub)">예식일</div></div>';
  if (m) html += '<div class="card" style="padding:14px;text-align:center"><b style="font-size:18px;color:var(--primary)">' + (daysUntil(m) >= 0 ? 'D-' + daysUntil(m) : '+' + (-daysUntil(m))) + '</b><div style="font-size:12px;color:var(--sub)">이사일</div></div>';
  html += '</div>';
  if (w && m) {
    const gap = Math.abs(daysUntil(w) - daysUntil(m));
    html += '<p class="sub" style="font-size:13px;margin-top:8px">💡 예식일과 이사일 간격: <b>' + gap + '일</b>. ' +
      (gap < 14 ? '간격이 짧아요! 이사·청소·혼수 배송 일정이 겹치지 않게 주의하세요.' : '여유가 있어 순차 진행이 가능해요.') + '</p>';
  }
  el.innerHTML = html;
}
wdWedding.addEventListener('change', function () { store.set('weddingDate', this.value); renderWdTimeline(); });
wdMove.addEventListener('change', function () { store.set('moveDate', this.value); renderWdTimeline(); });
renderWdTimeline();

/* ---------- 커플 공동 체크리스트 (고정 문구 — 안전) ---------- */
const COUPLE = ['신혼집 예산 합의 (보증금·대출 한도)', '혼인신고 날짜 결정 (대출 조건과 연관!)', '신혼집 계약 — 계약 안전센터 체크', '전세대출 신청 (신혼부부 전용 확인)', '이사업체 견적·예약', '혼수·가전 리스트 확정', '입주청소 예약', '웨딩 스드메 일정과 이사일 조율', '양가 부모님 새집 초대 일정'];
const coupleData = store.get('coupleData', {});
function renderCouple() {
  document.getElementById('couple-list').innerHTML = COUPLE.map((t, i) => {
    const d = coupleData[i] || { done: false, who: '같이' };
    return '<div class="check-row"><input type="checkbox" data-ci="' + i + '"' + (d.done ? ' checked' : '') + '>' +
      '<div class="grow" style="font-size:14px' + (d.done ? ';text-decoration:line-through;color:var(--sub)' : '') + '">' + t + '</div>' +
      '<select data-cw="' + i + '" aria-label="담당" style="width:110px;padding:6px;font-size:12px">' +
      ['예비신랑', '예비신부', '같이'].map(w => '<option' + (d.who === w ? ' selected' : '') + '>' + w + '</option>').join('') +
      '</select></div>';
  }).join('');
  document.querySelectorAll('[data-ci]').forEach(cb =>
    cb.addEventListener('change', function () {
      const i = this.dataset.ci;
      coupleData[i] = coupleData[i] || {}; coupleData[i].done = this.checked;
      store.set('coupleData', coupleData); renderCouple();
    })
  );
  document.querySelectorAll('[data-cw]').forEach(s =>
    s.addEventListener('change', function () {
      const i = this.dataset.cw;
      coupleData[i] = coupleData[i] || {}; coupleData[i].who = this.value;
      store.set('coupleData', coupleData);
    })
  );
}
renderCouple();

/* ---------- 혼수 목록 (중복 방지) — 사용자 입력 이스케이프 ---------- */
let dowry = store.get('dowry', []);
function renderDowry() {
  const el = document.getElementById('dowry-list');
  if (!dowry.length) { el.innerHTML = '<div class="state">' + icon('empty') + '<p>아직 등록된 품목이 없어요.</p></div>'; return; }
  el.innerHTML = dowry.map((d, i) =>
    '<div class="task-item"><div class="grow"><div class="title">' + escapeHtml(d.name) +
    (d.dup ? ' <span class="badge badge-red">중복!</span>' : '') + '</div><div class="meta">담당: ' + escapeHtml(d.who) + '</div></div>' +
    '<button class="chip" data-del="' + i + '">삭제</button></div>'
  ).join('');
  el.querySelectorAll('[data-del]').forEach(b =>
    b.addEventListener('click', function () { dowry.splice(this.dataset.del, 1); markDups(); store.set('dowry', dowry); renderDowry(); })
  );
}
function markDups() {
  const seen = {};
  dowry.forEach(d => { const k = d.name.replace(/\s/g, ''); d.dup = !!seen[k]; seen[k] = true; });
}
document.getElementById('dowry-add').addEventListener('click', function () {
  const name = document.getElementById('dowry-name').value.trim();
  if (!name) return;
  dowry.push({ name: name.slice(0, 40), who: document.getElementById('dowry-who').value });
  markDups();
  if (dowry[dowry.length - 1].dup) alert('⚠ "' + name + '"은(는) 이미 목록에 있어요! 중복 구매 주의하세요.');
  store.set('dowry', dowry);
  document.getElementById('dowry-name').value = '';
  renderDowry();
});
renderDowry();
