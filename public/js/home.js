/* ============================================================
   홈 화면 로직
   - 이사 날짜 → D-day / 준비율 / 오늘 할 일 / 임박 업무 / 비용 요약
   - '이비서에게 물어보기' 규칙 기반 챗봇
   ============================================================ */

/* 날짜 오프셋 기반 기본 체크리스트 (체크리스트 페이지와 공유되는 요약본) */
const HOME_TASKS = [
  { id: 't1',  d: -60, title: '이사업체 3곳 이상 견적 받기', important: true },
  { id: 't2',  d: -45, title: '계약 안전확인 (등기부등본·건축물대장)', important: true },
  { id: 't3',  d: -30, title: '불용품 판매·기부·폐기 시작', important: false },
  { id: 't4',  d: -21, title: '엘리베이터·사다리차·주차 예약', important: true },
  { id: 't5',  d: -14, title: '인터넷·도시가스·에어컨 이전 신청', important: true },
  { id: 't6',  d: -7,  title: '우체국 주소변경(주거이전 우편물 전송) 신청', important: false },
  { id: 't7',  d: -5,  title: '냉장고 비우기 시작', important: false },
  { id: 't8',  d: -3,  title: '세탁기 물빼기·귀중품 분리', important: false },
  { id: 't9',  d: -2,  title: '박스별 방 이름 라벨 붙이기', important: false },
  { id: 't10', d: -1,  title: '신분증·계약서·잔금·열쇠 최종 확인', important: true },
  { id: 't11', d: 0,   title: '계량기 촬영·공과금 정산·빈집 사진', important: true },
  { id: 't12', d: 0,   title: '새집 하자 사진·도어락 비밀번호 변경', important: true },
  { id: 't13', d: 3,   title: '전입신고 (이사 후 14일 이내)', important: true },
  { id: 't14', d: 3,   title: '확정일자 받기', important: true },
  { id: 't15', d: 7,   title: '금융·보험·쇼핑몰 주소 변경', important: false }
];

function getMoveDate() { return store.get('moveDate', null); }
function getDoneMap() { return store.get('homeDone', {}); }

function renderDashboard() {
  const moveDate = getMoveDate();
  const empty = document.getElementById('hero-empty');
  const dash = document.getElementById('hero-dash');
  const todaySec = document.getElementById('today-section');
  const urgentSec = document.getElementById('urgent-section');

  const affSec = document.getElementById('aff-section');

  if (!moveDate) {
    empty.style.display = 'block'; dash.style.display = 'none';
    todaySec.style.display = 'none'; urgentSec.style.display = 'none';
    if (affSec) affSec.style.display = 'none';
    return;
  }
  empty.style.display = 'none'; dash.style.display = 'block';
  todaySec.style.display = 'block'; urgentSec.style.display = 'block';

  const dd = daysUntil(moveDate);

  /* 준비물은 실제로 사야 하는 시기(D-21 ~ 이사 직후)에만 노출 */
  if (affSec) affSec.style.display = (dd <= 21 && dd >= -3) ? 'block' : 'none';
  const ddayEl = document.getElementById('dday');
  ddayEl.textContent = dd > 0 ? 'D-' + dd : dd === 0 ? 'D-Day 🚚' : '이사 후 ' + (-dd) + '일';
  document.getElementById('dash-date-label').textContent = '이사 예정일 · ' + moveDate;

  // 준비율: 이사일 이전(과거~오늘) 기준으로 해야 했던 일 중 완료 비율
  const done = getDoneMap();
  const dueTasks = HOME_TASKS.filter(t => t.d <= -dd || dd <= 0);
  const doneCount = HOME_TASKS.filter(t => done[t.id]).length;
  const pct = Math.round((doneCount / HOME_TASKS.length) * 100);
  document.getElementById('progress-pct').textContent = pct + '%';
  document.getElementById('progress-bar').style.width = pct + '%';

  // 오늘 할 일: 오늘 시점(D-오프셋 ±2일)에 해당하는 미완료 작업
  const todayTasks = HOME_TASKS.filter(t => !done[t.id] && Math.abs((-dd) - t.d) <= 2 && (dd > 0 ? t.d <= 0 : true));
  // 임박: 미완료 + 중요 + 마감(t.d + dd)이 -3일(살짝 지남)~5일 이내
  const urgentTasks = HOME_TASKS.filter(t => {
    const remain = t.d + dd; // 해당 업무 기한까지 남은 일수
    return !done[t.id] && t.important && remain >= -3 && remain <= 5;
  });

  document.getElementById('stat-today').textContent = todayTasks.length + '개';
  document.getElementById('stat-urgent').textContent = urgentTasks.length + '개';

  // 비용 요약 (비용계산기 결과 연동, 없으면 안내)
  const est = store.get('costEstimate', null);
  document.getElementById('stat-est').textContent = est ? fmtMan(est.avg) : '계산 전';
  // 사용한 비용: 예산장 '실제 합계' 우선, 없으면 추가비용 선택 합계
  const budgetActual = store.get('budgetActual', null);
  const spent = budgetActual !== null && budgetActual > 0 ? budgetActual : store.get('spentTotal', 0);
  document.getElementById('stat-spent').textContent = fmtMan(spent);

  renderTaskList('today-list', todayTasks, done, '오늘은 예정된 할 일이 없어요. 잠시 쉬어가세요 ☕');
  renderTaskList('urgent-list', urgentTasks, done, '임박한 중요 업무가 없습니다. 잘 하고 계세요!');
}

function renderTaskList(elId, tasks, done, emptyMsg) {
  const el = document.getElementById(elId);
  if (!tasks.length) {
    el.innerHTML = '<div class="state">' + icon('empty') + '<p>' + emptyMsg + '</p></div>';
    return;
  }
  el.innerHTML = tasks.map(t =>
    '<label class="check-row task-item' + (done[t.id] ? ' done' : '') + '">' +
      '<input type="checkbox" data-tid="' + t.id + '"' + (done[t.id] ? ' checked' : '') + '>' +
      '<div class="grow"><div class="title">' + t.title + '</div>' +
      '<div class="meta">' + (t.d < 0 ? 'D' + t.d : t.d === 0 ? '이사 당일' : '이사 후 ' + t.d + '일') +
      (t.important ? ' · <span style="color:var(--warn);font-weight:700">중요</span>' : '') + '</div></div>' +
    '</label>'
  ).join('');
  el.querySelectorAll('input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', function () {
      const d = getDoneMap(); d[this.dataset.tid] = this.checked; store.set('homeDone', d);
      renderDashboard();
    });
  });
}

/* ---------- 날짜 입력 ---------- */
document.getElementById('btn-set-date').addEventListener('click', function () {
  const v = document.getElementById('move-date-input').value;
  const err = document.getElementById('date-error');
  if (!v) { err.style.display = 'block'; return; } // 오류 상태
  err.style.display = 'none';
  store.set('moveDate', v);
  renderDashboard();
  if (window.track) window.track('planner_started', {}); // 이벤트 발생만 기록 (날짜값 미전송)
});
document.getElementById('btn-change-date').addEventListener('click', function () {
  store.set('moveDate', null);
  renderDashboard();
});

/* ---------- 주요 일정 ICS 캘린더 내보내기 ---------- */
const ICS_TASKS = [ // 캘린더에 담을 핵심 일정 (오프셋, 제목)
  { d: -30, title: '[이사] 이사업체 견적·불용품 정리 시작', desc: '업체 3곳 방문견적, 안 쓰는 물건 판매·기부' },
  { d: -14, title: '[이사] 인터넷·도시가스·에어컨 이전 신청', desc: '이전 설치 예약, 엘리베이터·사다리차 예약' },
  { d: -7,  title: '[이사] 주소변경·짐 정리', desc: '우체국 주거이전 우편물 전송 신청, 박스 방 이름 라벨' },
  { d: 0,   title: '[이사] 이사 당일 — 계량기 촬영·정산·하자 점검', desc: '공과금 정산, 빈집/새집 사진, 도어락 변경' },
  { d: 3,   title: '[이사] 전입신고·확정일자 (이사 후 14일 이내)', desc: '정부24 또는 주민센터. 임대차 신고 대상이면 계약 후 30일 이내' }
];
const btnIcs = document.getElementById('btn-export-ics');
if (btnIcs) btnIcs.addEventListener('click', function () {
  const moveDate = getMoveDate();
  if (!moveDate) { alert('먼저 이사 날짜를 입력해 주세요.'); return; }
  const base = new Date(moveDate);
  const events = ICS_TASKS.map(function (t) {
    const dt = new Date(base.getTime() + t.d * 86400000);
    return { title: t.title, date: dt.toISOString().slice(0, 10), desc: t.desc };
  });
  window.downloadICS(events, 'ebiseo-이사일정.ics');
});

/* ---------- 이비서 챗봇 (규칙 기반) ---------- */
const BOT_RULES = [
  { k: ['과태료', '안하면', '안 하면', '늦게'], a: '전입신고를 정당한 사유 없이 14일 안에 하지 않으면 5만원 이하의 과태료가 부과될 수 있어요. 지연 기간에 따라 차등 적용되고 자진납부 감경도 있습니다.\n\n하지만 진짜 위험은 따로 있어요. 전입신고를 해야 대항력이 생기고, 확정일자까지 갖춰야 우선변제권이 생깁니다. 이게 없으면 집이 경매로 넘어갔을 때 보증금을 지킬 근거가 없어요. 자세히는 가이드 글을 참고하세요.' },
  { k: ['보증금', '안 돌려', '안돌려', '임차권'], a: '계약이 끝났는데 보증금을 못 받았다면, 이사부터 가시면 안 됩니다. 나가면서 전입신고를 옮기는 순간 대항력과 우선변제권이 사라져요.\n\n먼저 임차권등기명령을 신청하세요. 등기가 완료되면 이사를 가도 권리가 유지됩니다. 법원 전자소송으로 접수 가능하고 직접 하면 몇 만원 선이며, 그 비용은 집주인에게 청구할 수 있어요. 반드시 등기부에 기재된 것을 확인한 뒤 이사하세요.' },
  { k: ['보증보험', '반환보증', 'hug', '전세보증'], a: '전세보증금 반환보증은 집주인이 보증금을 못 돌려줄 때 기관이 대신 돌려주는 제도예요. HUG, HF, SGI 세 곳에서 취급하고 기관마다 한도·보증료·심사 기준이 다릅니다.\n\n보증금과 선순위 채권의 합이 집값에 비해 높으면 거절될 수 있으니, 계약 전에 등기부의 근저당을 먼저 확인하세요. 계약서에 "보증보험 가입 불가 시 계약 해제" 특약을 넣어두면 안전합니다.' },
  { k: ['입주청소', '청소'], a: '가구가 들어오기 전 빈 집일 때가 구석구석 청소할 유일한 기회예요.\n\n신축이거나 평수가 크거나 일정이 빡빡하면 업체가 낫고, 원룸·소형이고 이전 세입자가 관리를 잘했다면 직접 해도 충분합니다. 화장실·주방만 부분 의뢰하는 절충안도 있어요. 업체를 쓸 땐 창문 외부·베란다·붙박이장 내부가 작업 범위에 포함되는지 문서로 확인하세요.' },
  { k: ['주소변경', '주소 변경', '우편물'], a: '전입신고를 해도 은행·카드사는 자동으로 알지 못해요. 순서대로 정리하세요.\n\n① 우체국 주거이전 우편물 전송서비스(안전망)\n② 은행·카드사·보험사\n③ 인터넷·TV 이전 설치(2주 전 예약), 가스·전기·수도\n④ 쇼핑몰 기본 배송지, 정기구독\n⑤ 운전면허증(자동차등록은 전입신고 시 자동)' },
  { k: ['준비물', '박스', '뽁뽁이', '몇 개'], a: '포장이사면 박스·포장재는 업체가 가져오니 거의 필요 없어요. 반포장·용달이면 직접 준비해야 합니다.\n\n박스는 무거운 것용 소형과 가벼운 것용 대형을 나눠 준비하세요. 책·그릇을 큰 박스에 담으면 못 들고 바닥이 터집니다. 테이프는 생각보다 훨씬 많이 쓰이고, 박스마다 "어느 방·무엇"을 적으면 짐 푸는 시간이 절반으로 줄어요. 비용계산 페이지의 준비물 계산기에서 인원별 수량을 확인할 수 있어요.' },
  { k: ['길일', '좋은 날', '이사 날짜', '택일'], a: '손 없는 날은 모두에게 똑같지만, 개인 사주로 보는 길일은 사람마다 달라요. 그래서 손 없는 날이 아닌데도 나에게 좋은 날이 있고, 그런 날은 예약이 덜 몰려 견적도 쌉니다.\n\n이비서 "이사 길일 찾기"에서 월을 고르면 손 없는 날이 달력에 표시되고, 생년월일·성별을 넣으면 생기복덕법으로 개인 맞춤 길일까지 계산해 드려요. 전통 민속 기준이라 참고용입니다.' },
  { k: ['방향', '삼살방', '대장군'], a: '전통적으로 그해에 꺼리는 방위가 있어요. 삼살방과 대장군방은 해마다 바뀌고, 여기에 날짜별 손 방향이 더해져 그날 피하는 방향이 달라집니다.\n\n2026년 병오년은 삼살방이 북쪽, 대장군방이 동쪽입니다. 이사 길일 찾기에서 방향을 선택하면 날짜별로 겹치는지 표시해 드려요. 다만 계약 조건이 우선이고, 이건 참고용 민속입니다.' },
  { k: ['용달', '원룸'], a: '원룸·1.5룸 정도면 1톤 용달로 충분한 경우가 많아요. 차량과 기사만 오는 방식이라 가장 저렴하지만, 짐 싸기와 운반 보조는 직접 해야 합니다.\n\n예약 전에 짐 양(특히 큰 가구), 엘리베이터 유무, 주차 공간 세 가지를 꼭 알려주세요. 현장에서 조건이 다르면 추가금이 붙습니다.' },
  { k: ['4인', '가족', '몇 톤'], a: '같은 4인 가족이라도 견적이 두 배 차이 나기도 해요. 짐의 양, 건물 조건, 날짜 때문입니다.\n\n짐 부피가 트럭 크기와 인원을 결정하니, 이사 전에 버리는 게 가장 확실한 절약입니다. 엘리베이터가 없거나 사다리차를 못 세우면 인력이 늘어나고요. 주말·월말·손 없는 날·봄가을 성수기가 겹치면 더 오릅니다. 방문 견적은 최소 3곳 받으세요.' },
  { k: ['에어컨', '이전설치'], a: '에어컨 이전설치는 보통 이사 견적에 포함되지 않고 별도예요. 벽걸이·스탠드·시스템에 따라 금액이 다르고, 배관 연장이나 실외기 이설이 생기면 추가됩니다.\n\n견적서에 포함 여부를 반드시 확인하고, 가능하면 이사 당일이 아닌 별도 날짜로 잡는 편이 설치 품질에 좋습니다.' },
  { k: ['견적', '비교', '업체'], a: '견적은 최소 3곳 이상 방문 견적으로 받으세요. 전화 견적은 현장에서 추가금이 붙기 쉽습니다.\n\n비교할 때 총액만 보지 말고 사다리차, 에어컨 이전설치, 폐기물 처리, 보관 여부가 포함인지 항목별로 확인하세요. 계약서에 날짜·시간·차량 크기·인원·총액·추가금 조건을 적어두면 분쟁이 줄어듭니다.' },
  { k: ['7일', '일주일'], a: '이사 7일 전 체크리스트예요 📋\n· 주소변경(우편물 전송) 신청\n· 냉장고 음식 비우기 시작\n· 귀중품·중요서류 따로 보관\n· 세탁기 물빼기 예약\n· 박스마다 들어갈 방 이름 표시\n체크리스트 페이지에서 하나씩 완료 표시할 수 있어요!' },
  { k: ['사다리차'], a: '사다리차는 보통 2층 이상 + 엘리베이터가 없거나 좁을 때 사용해요. 층수에 따라 회당 15~40만원 수준이고, 골목 진입 가능 여부를 미리 확인해야 해요. 아파트는 관리사무소에 사다리차·엘리베이터 예약이 필요합니다.' },
  { k: ['보관이사'], a: '보관이사는 입주일이 안 맞을 때 짐을 창고에 보관했다가 옮기는 방식이에요. 보관료(월 10~30만원 수준)와 상하차 비용이 추가되고, 습기·파손 보상 조건을 꼭 확인하세요.' },
  { k: ['확정일자'], a: '확정일자는 보증금을 지키는 핵심 장치예요. 전입신고 + 확정일자 + 실제 거주, 3가지가 갖춰져야 우선변제권이 생겨요. 계약서를 첨부한 임대차 신고로도 확정일자가 부여될 수 있습니다.' },
  { k: ['전입신고'], a: '전입신고는 이사한 날부터 14일 이내에 해야 해요.\n정부24 온라인 또는 새 주소지 주민센터에서 가능합니다. 전세·월세라면 확정일자도 같이 챙기세요. 자세한 절차는 체크리스트의 행정업무 안내에 있어요.' },
  { k: ['체크리스트', '뭐부터', '뭘 해야'], a: '이사 준비 순서는 이렇게 잡으면 좋아요.\n① D-60~30 계약 확인·업체 견적\n② D-30~14 불용품 정리·각종 예약\n③ D-7~3 주소변경·짐 정리\n④ D-1 서류·잔금 확인\n⑤ 당일 계량기·정산·사진\n⑥ 이후 전입신고·확정일자\n체크리스트 페이지에서 전체를 볼 수 있어요.' },
  { k: ['대출', '버팀목', '디딤돌'], a: '전월세는 버팀목(청년·일반·신혼), 구입은 디딤돌·보금자리론이 대표적이에요. 나이·소득·무주택 여부에 따라 달라지니 대출·지원 페이지에서 조건을 입력해 맞춤 진단을 받아보세요. (사전진단이며 실제 승인과 달라요)' },
  { k: ['손 없는 날'], a: "'손 없는 날'은 음력으로 끝자리 9·0일로, 악귀(손)가 없다고 여겨져 이사 수요가 몰리는 날이에요. 이 날은 이사비가 10~20% 이상 비싸질 수 있어요. 비용을 아끼려면 평일·월중을 노려보세요!" },
  { k: ['포장이사', '비용', '얼마'], a: '동일 지역 일반 조건 참고 범위예요 (실제 견적 아님) 💰\n· 1인: 50~70만원 (15~25박스, 1톤)\n· 2인: 60~120만원 (1~2.5톤)\n· 3인: 100~160만원 (2.5~5톤)\n· 4인: 130~190만원 (5톤)\n비용계산 페이지에서 조건별 상세 계산이 가능해요.' },
  { k: ['안녕', '하이', '고마워'], a: '안녕하세요! 이사 준비 중 궁금한 건 뭐든 물어보세요 😊 비용, 체크리스트, 전입신고, 대출까지 도와드릴게요.' },
];

function botAnswer(q) {
  /* BOT_RULES는 '구체적인 주제 → 일반적인 주제' 순으로 정렬되어 있습니다.
     먼저 일치하는 규칙을 채택하므로, 새 규칙을 넣을 때 순서에 주의하세요. */
  for (const r of BOT_RULES) {
    if (r.k.some(k => q.includes(k))) return r.a;
  }
  const moveDate = getMoveDate();
  if (moveDate) {
    const dd = daysUntil(moveDate);
    return '아직 그 질문은 학습 중이에요 🙏 지금은 이사 ' + (dd > 0 ? dd + '일 전' : '후') + '이니, 체크리스트 페이지에서 시기별 할 일을 확인해 보세요. 비용·전입신고·대출 관련 질문은 바로 답해드릴 수 있어요!' ;
  }
  return '아직 그 질문은 학습 중이에요 🙏 이사 비용, 체크리스트, 전입신고, 손 없는 날, 대출 등을 물어보시면 바로 답해드릴게요!';
}

function sendChat(q) {
  if (!q.trim()) return;
  const box = document.getElementById('chat-box');
  box.insertAdjacentHTML('beforeend', '<div class="chat-msg chat-user"></div>');
  box.lastElementChild.textContent = q;
  // 로딩 상태
  box.insertAdjacentHTML('beforeend', '<div class="chat-msg chat-bot" id="bot-typing">입력 중…</div>');
  box.scrollTop = box.scrollHeight;
  setTimeout(function () {
    const t = document.getElementById('bot-typing');
    t.removeAttribute('id');
    t.textContent = botAnswer(q);
    box.scrollTop = box.scrollHeight;
  }, 500);
}

document.getElementById('chat-send').addEventListener('click', function () {
  const inp = document.getElementById('chat-input');
  sendChat(inp.value); inp.value = '';
});
document.getElementById('chat-input').addEventListener('keydown', function (e) {
  if (e.key === 'Enter') { sendChat(this.value); this.value = ''; }
});
document.querySelectorAll('.chip[data-q]').forEach(c =>
  c.addEventListener('click', () => sendChat(c.dataset.q))
);

renderDashboard();
