/* ============================================================
   날짜별 체크리스트
   - 홈 화면과 같은 저장소('homeDone')를 공유 → 준비율 자동 동기화
   - 홈 요약(t1~t15) + 상세 항목(c*) 전체 목록
   ============================================================ */

const CL_GROUPS = [
  { label: 'D-60 ~ D-30', desc: '계약·견적의 골든타임', tasks: [
    { id: 't2',  title: '계약 안전확인', meta: '등기부등본·건축물대장·근저당 확인 → 계약 안전센터 이용' },
    { id: 'c1',  title: '대출 사전심사', meta: '버팀목·디딤돌 등 자격 확인 → 대출·지원 페이지' },
    { id: 't1',  title: '이사업체 3곳 이상 견적', meta: '방문견적 권장, 총액·포함항목 비교' },
    { id: 'c2',  title: '이사 계약서 확인', meta: '짐 목록·인원·차량·추가요금 조건·파손 배상 명시' }
  ]},
  { label: 'D-30 ~ D-14', desc: '정리와 예약', tasks: [
    { id: 't3',  title: '불용품 판매·기부·폐기', meta: '중고거래·기부단체·대형폐기물 스티커' },
    { id: 'c3',  title: '입주청소 예약', meta: '빈집 상태에서 이사 전날~당일 오전 권장' },
    { id: 't4',  title: '엘리베이터·사다리차·주차 예약', meta: '양쪽 관리사무소에 모두 확인' },
    { id: 't5',  title: '인터넷·도시가스·에어컨 이전 신청', meta: '이전 설치는 최소 1~2주 전 예약' }
  ]},
  { label: 'D-7 ~ D-3', desc: '이사 준비 마무리', tasks: [
    { id: 't6',  title: '주소변경 신청', meta: '우체국 주거이전 우편물 전송서비스' },
    { id: 't7',  title: '냉장고 비우기', meta: '식재료 소진, 냉동식품 정리' },
    { id: 't8',  title: '귀중품 분리 · 세탁기 물빼기', meta: '귀중품·서류는 직접 운반' },
    { id: 't9',  title: '박스별 방 이름 표시', meta: '색상 라벨로 방별 구분하면 정리가 빨라요' }
  ]},
  { label: 'D-1', desc: '전날 최종 점검', tasks: [
    { id: 't10', title: '신분증·계약서·잔금·열쇠 확인', meta: '잔금 이체 한도 미리 상향' },
    { id: 'c4',  title: '냉장고 전원 분리', meta: '성에 제거를 위해 전날 밤 전원 차단' },
    { id: 'c5',  title: '가스·수도 일정 확인', meta: '도시가스 철거·설치 방문시간 재확인' }
  ]},
  { label: '이사 당일', desc: '꼼꼼하게 기록이 무기', tasks: [
    { id: 't11', title: '계량기 촬영 · 관리비·공과금 정산', meta: '전기·가스·수도 계량기 사진 필수' },
    { id: 'c6',  title: '빈집 사진 촬영', meta: '원상복구 분쟁 대비' },
    { id: 'c7',  title: '보증금·잔금 확인', meta: '입금 확인 후 열쇠 인도' },
    { id: 'c8',  title: '짐 파손 확인', meta: '업체 떠나기 전 가구·가전 상태 확인' },
    { id: 't12', title: '새집 하자 사진 · 도어락 비밀번호 변경', meta: '입주 직후 바로' }
  ]},
  { label: '이사 후', desc: '기한 있는 행정 업무', tasks: [
    { id: 't13', title: '전입신고', meta: '이사 후 14일 이내 · 정부24', warn: true },
    { id: 't14', title: '확정일자 받기', meta: '전입신고와 함께 처리 권장', warn: true },
    { id: 'c9',  title: '임대차 신고', meta: '계약 체결 후 30일 이내(대상 계약)', warn: true },
    { id: 't15', title: '우편물·금융·보험·쇼핑 주소변경', meta: '카드사·은행·보험·쇼핑몰' },
    { id: 'c10', title: '하자 접수', meta: '새집 하자 사진 첨부해 임대인·관리실에' },
    { id: 'c11', title: '전세보증보험 가입', meta: 'HUG·HF 보증 가입 가능 여부 확인' },
    { id: 'c12', title: '이사업체 계약서·기록 정리', meta: '업체 고르기 페이지의 계약서 기록 항목으로 정리' }
  ]}
];

function getDone() { return store.get('homeDone', {}); }

function renderChecklist() {
  const done = getDone();
  const all = CL_GROUPS.flatMap(g => g.tasks);
  const doneCount = all.filter(t => done[t.id]).length;
  const pct = Math.round(doneCount / all.length * 100);
  document.getElementById('cl-pct').textContent = pct + '% (' + doneCount + '/' + all.length + ')';
  document.getElementById('cl-bar').style.width = pct + '%';

  // D-day 문구
  const moveDate = store.get('moveDate', null);
  document.getElementById('cl-dday-note').textContent = moveDate
    ? '이사 예정일: ' + moveDate + ' (' + (daysUntil(moveDate) >= 0 ? 'D-' + daysUntil(moveDate) : '이사 후 ' + (-daysUntil(moveDate)) + '일') + ')'
    : '홈 화면에서 이사 날짜를 입력하면 지금 시기가 강조돼요.';

  // 현재 시기 계산
  let currentIdx = -1;
  if (moveDate) {
    const dd = daysUntil(moveDate);
    currentIdx = dd > 30 ? 0 : dd > 14 ? 1 : dd > 2 ? 2 : dd > 0 ? 3 : dd === 0 ? 4 : 5;
  }

  document.getElementById('cl-groups').innerHTML = CL_GROUPS.map((g, gi) => {
    const gDone = g.tasks.filter(t => done[t.id]).length;
    return '<div class="card"' + (gi === currentIdx ? ' style="border-color:var(--primary);border-width:2px"' : '') + '>' +
      '<div class="section-head" style="margin-bottom:4px"><h3>' + g.label +
      (gi === currentIdx ? ' <span class="badge badge-blue">지금 시기</span>' : '') +
      '</h3><small class="sub">' + gDone + '/' + g.tasks.length + '</small></div>' +
      '<small class="sub">' + g.desc + '</small>' +
      g.tasks.map(t =>
        '<label class="check-row task-item' + (done[t.id] ? ' done' : '') + '">' +
        '<input type="checkbox" data-tid="' + t.id + '"' + (done[t.id] ? ' checked' : '') + '>' +
        '<div class="grow"><div class="title">' + t.title +
        (t.warn ? ' <span class="badge badge-warn">기한 주의</span>' : '') + '</div>' +
        '<div class="meta">' + t.meta + '</div></div></label>'
      ).join('') + '</div>';
  }).join('');

  document.querySelectorAll('#cl-groups input[type=checkbox]').forEach(cb =>
    cb.addEventListener('change', function () {
      const d = getDone(); d[this.dataset.tid] = this.checked; store.set('homeDone', d);
      if (this.checked && window.track) window.track('checklist_item_completed', {});
      renderChecklist();
    })
  );

  // 행정업무 알림 (이사일 기준 기한 표시)
  if (moveDate) {
    const dd = daysUntil(moveDate);
    if (dd <= 0) {
      const left = 14 + dd; // 이사 후 경과일 반영
      document.getElementById('jeonip-alert').innerHTML = left >= 0
        ? '<div class="notice"><span></span><span>⏰ 전입신고 기한까지 <b>' + left + '일</b> 남았어요.</span></div>'
        : '<div class="notice"><span></span><span>⚠ 전입신고 기한(14일)이 지났을 수 있어요. 바로 신고하세요.</span></div>';
    }
  }
}
renderChecklist();
