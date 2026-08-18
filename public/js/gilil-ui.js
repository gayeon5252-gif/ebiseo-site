/* ============================================================
   이사 길일 찾기 — 화면 로직
   ============================================================ */
(function () {
  var G = window.Gilil;
  if (!G) return;
  var esc = window.escapeHtml || function (s) { return String(s == null ? '' : s); };
  var $ = function (id) { return document.getElementById(id); };

  /* 구형 브라우저에서도 안전하게 스크롤 */
  function scrollTo(el) {
    if (!el) return;
    try {
      if (typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (e) { /* 무시 */ }
  }

  var state = {
    ym: null,          // 'YYYY-MM'
    birth: '',         // 'YYYY-MM-DD'
    zodiac: null,
    sex: '',           // '', 'M', 'F'
    hour: '',          // '' 또는 0~23
    age: null,         // 세는나이 (이사 연도 기준)
    dir: '',           // '', 'N','E','S','W'
    sel: null          // 선택한 날짜 key
  };

  /* 현재 조건 묶음 */
  function opts() {
    return { zodiac: state.zodiac, dir: state.dir || null, age: state.age, gender: state.sex || null };
  }

  var store = window.store || {
    get: function (k, d) { try { var v = localStorage.getItem('eb_' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('eb_' + k, JSON.stringify(v)); } catch (e) {} }
  };

  /* ── 월 선택지 채우기 ── */
  function fillMonths() {
    var sel = $('g-month'), html = '';
    var s = new Date(G.START), e = new Date(G.END);
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var cur = new Date(Math.max(s.getTime(), new Date(today.getFullYear(), today.getMonth(), 1).getTime()));
    while (cur <= e) {
      var key = cur.getFullYear() + '-' + String(cur.getMonth() + 1).padStart(2, '0');
      html += '<option value="' + key + '">' + cur.getFullYear() + '년 ' + (cur.getMonth() + 1) + '월</option>';
      cur.setMonth(cur.getMonth() + 1);
    }
    sel.innerHTML = html;
  }

  /* ── 그 해 방위 안내 ── */
  function renderYearDir(year) {
    var yb = G.yearBranch(year);
    var box = $('g-year-dir');
    if (yb === undefined) { box.style.display = 'none'; return; }
    var ss = G.DIRS[G.samsal(yb)], dj = G.DIRS[G.daejang(yb)];
    box.style.display = '';
    box.innerHTML =
      '<div class="card-title"><span data-icon="info"></span><h2>' + year + '년(' + esc(G.BRANCH[yb]) + '년) 방위</h2></div>' +
      '<p style="font-size:14px;margin-bottom:8px">전통적으로 이 해에는 <b>' + esc(ss) + '(삼살방)</b>과 <b>' + esc(dj) + '(대장군방)</b> 방향으로의 이동을 꺼립니다. ' +
      '여기에 <b>날짜별 손 방향</b>이 더해져 그날그날 피하는 방향이 달라집니다.</p>' +
      '<p class="sub" style="font-size:12px">방향을 선택하시면 달력에 반영됩니다. 다만 방향은 선택 사항이며, 계약 조건이 우선입니다.</p>';
  }

  /* ── 달력 ── */
  function renderCalendar() {
    var parts = state.ym.split('-');
    var y = +parts[0], m = +parts[1];
    var first = new Date(y, m - 1, 1);
    var lastDay = new Date(y, m, 0).getDate();
    var today = new Date(); today.setHours(0, 0, 0, 0);

    $('g-cal-title').textContent = y + '년 ' + m + '월';

    var html = '';
    for (var i = 0; i < first.getDay(); i++) html += '<div class="cal-cell empty"></div>';

    var results = [];
    for (var d = 1; d <= lastDay; d++) {
      var dt = new Date(y, m - 1, d);
      var r = G.evaluate(dt, opts());
      var key = y + '-' + m + '-' + d;
      var past = dt < today;
      if (r && !past) results.push({ d: d, r: r });

      var cls = 'cal-cell';
      if (dt.getDay() === 6) cls += ' cal-sat';
      if (dt.getDay() === 0) cls += ' cal-sun';
      if (past) cls += ' past';
      if (state.sel === key) cls += ' sel';

      var tag = '';
      if (r && !past) {
        if (r.saenggi && r.saenggi.luck === 0) tag = '<span class="cal-tag t-bad">' + r.saenggi.name + '</span>';
        else if (r.clash) tag = '<span class="cal-tag t-bad">충일</span>';
        else if (r.hidden) tag = '<span class="cal-tag t-hid">숨은 길일</span>';
        else if (r.saenggi && r.saenggi.luck === 2) tag = '<span class="cal-tag t-good">' + r.saenggi.name + '</span>';
        else if (r.isSonless) tag = '<span class="cal-tag t-son">손없음</span>';
      }

      html += '<div class="' + cls + '"' + (past || !r ? '' : ' data-k="' + key + '" data-d="' + d + '"') + '>' +
                '<div class="cal-d">' + d + '</div>' +
                (r ? '<div class="cal-lu">음 ' + r.lunarDay + '</div>' : '') +
                tag +
              '</div>';
    }
    $('g-cal').innerHTML = html;

    renderTop(results, y, m);
  }

  /* ── 추천 TOP ── */
  function renderTop(results, y, m) {
    var box = $('g-top');
    if (!results.length) {
      box.innerHTML = '<p class="sub" style="font-size:14px">이 달에는 남은 날짜가 없습니다. 다른 달을 선택해 주세요.</p>';
      return;
    }
    var sorted = results.slice().sort(function (a, b) {
      if (b.r.total !== a.r.total) return b.r.total - a.r.total;
      return b.r.dScore - a.r.dScore;
    }).slice(0, 3);

    var cheapest = results.slice().filter(function (x) { return !x.r.clash; })
      .sort(function (a, b) { return b.r.dScore - a.r.dScore; })[0];

    var html = '<div class="card-title"><span data-icon="check"></span><h2>' + m + '월 추천 날짜</h2></div>';
    html += '<p class="sub" style="font-size:13px;margin-bottom:10px">전통 택일 점수와 예약 여유(비용) 점수를 반반씩 합산한 결과입니다.' +
      (state.zodiac === null ? ' <b>생년월일을 넣으면</b> 내 띠에 맞춰 더 정확해집니다.' : '') + '</p>';
    html += '<div class="stat-grid">';
    sorted.forEach(function (x, i) {
      var dt = new Date(y, m - 1, x.d);
      html += '<div class="card" style="padding:12px 8px;text-align:center">' +
        '<div style="font-size:11px;color:var(--sub)">' + (i === 0 ? '1순위' : (i + 1) + '순위') + '</div>' +
        '<b style="font-size:17px;color:var(--primary)">' + m + '/' + x.d + '</b>' +
        '<div style="font-size:11px;color:var(--sub)">' + G.WEEK[dt.getDay()] + '요일 · 종합 ' + x.r.total + '점</div>' +
        (x.r.hidden ? '<div class="cal-tag t-hid" style="margin-top:4px">숨은 길일</div>' :
          (x.r.isSonless ? '<div class="cal-tag t-son" style="margin-top:4px">손없음</div>' : '')) +
        '</div>';
    });
    html += '</div>';

    if (cheapest) {
      html += '<p style="font-size:14px;margin-top:12px">💡 <b>비용만 놓고 보면 ' + m + '월 ' + cheapest.d + '일</b>이 가장 유리합니다' +
        (cheapest.r.isSonless ? '' : ' (손 없는 날이 아니라 예약이 덜 몰립니다)') + '.</p>';
    }
    box.innerHTML = html;
  }

  /* ── 상세 ── */
  function renderDetail(y, m, d) {
    var dt = new Date(y, m - 1, d);
    var r = G.evaluate(dt, opts());
    var box = $('g-detail');
    if (!r) { box.style.display = 'none'; return; }

    function bar(v, color) {
      return '<div class="bar"><i style="width:' + v + '%;background:' + color + '"></i></div>';
    }

    var html = '<div class="card-title"><span data-icon="cal"></span><h2>' +
      y + '년 ' + m + '월 ' + d + '일 (' + G.WEEK[dt.getDay()] + ') · 음력 ' + r.lunarDay + '일</h2></div>';

    html += '<div class="grid-2" style="margin-bottom:12px">' +
      '<div><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px"><span>전통 택일</span><b>' + r.tScore + '점</b></div>' +
      bar(r.tScore, r.tScore >= 70 ? '#3182F6' : (r.tScore >= 45 ? '#F5A623' : '#E5484D')) + '</div>' +
      '<div><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px"><span>예약 여유(비용)</span><b>' + r.dScore + '점</b></div>' +
      bar(r.dScore, r.dScore >= 70 ? '#3182F6' : (r.dScore >= 45 ? '#F5A623' : '#E5484D')) + '</div>' +
      '</div>';

    if (r.hidden) {
      html += '<div class="notice" style="margin-bottom:12px"><span data-icon="check"></span><span><b>숨은 길일입니다.</b> 전통 기준으로 특별히 꺼릴 것이 없으면서 예약이 덜 몰리는 날이라, 견적 협상에 유리합니다.</span></div>';
    }

    html += '<h3 style="margin:6px 0 6px;font-size:14px">전통 택일</h3>';
    r.tNotes.forEach(function (n) {
      var mark = n.good === true ? '○' : (n.good === false ? '✕' : '·');
      html += '<div class="task-item"><div class="grow"><div class="title" style="font-size:14px">' + mark + ' ' + esc(n.t) + '</div>' +
        '<div class="meta">' + esc(n.d) + '</div></div></div>';
    });

    if (state.dir) {
      var dirName = G.DIRS[state.dir];
      if (r.dirWarn.length) {
        html += '<div class="task-item"><div class="grow"><div class="title" style="font-size:14px;color:#E5484D">✕ ' + esc(dirName) + ' 이동 — ' + esc(r.dirWarn.join(', ')) + ' 해당</div>' +
          '<div class="meta">전통적으로 이 날 이 방향으로의 이동을 꺼립니다.</div></div></div>';
      } else {
        html += '<div class="task-item"><div class="grow"><div class="title" style="font-size:14px">○ ' + esc(dirName) + ' 이동 — 꺼리는 방위 아님</div>' +
          '<div class="meta">이 날 손 방향·삼살방·대장군방 어디에도 해당하지 않습니다.</div></div></div>';
      }
    }

    html += '<h3 style="margin:14px 0 6px;font-size:14px">예약 수요(비용에 영향)</h3>';
    if (!r.dFactors.length) {
      html += '<p class="sub" style="font-size:13px">특별히 수요가 몰리는 요인이 없습니다.</p>';
    } else {
      r.dFactors.forEach(function (f) {
        html += '<div class="task-item"><div class="grow"><div class="title" style="font-size:14px">' +
          (f.up ? '▲ ' : '▼ ') + esc(f.t) + '</div><div class="meta">' + esc(f.why) + '</div></div></div>';
      });
    }

    /* 이사 시간대 추천 */
    var hrs = G.goodHours(dt, state.zodiac);
    html += '<h3 style="margin:14px 0 6px;font-size:14px">이사 시작 시간대 <span class="sub" style="font-weight:400">— 전통 시진 기준</span></h3>';
    html += '<div style="display:flex;gap:6px;flex-wrap:wrap">';
    hrs.forEach(function (h) {
      var cls = h.ok ? 't-good' : 't-bad';
      var why = h.ok ? '' : (h.clashDay ? ' 일진충' : '') + (h.clashMe ? ' 내띠충' : '');
      html += '<span class="cal-tag ' + cls + '" style="font-size:12px;padding:4px 8px">' +
        esc(h.name) + ' ' + esc(h.hours) + esc(why) + '</span>';
    });
    html += '</div>';
    html += '<p class="sub" style="font-size:12px;margin-top:6px">실제 이사가 이뤄지는 낮 시간대만 표시합니다. 업체 예약 시간과 조율하세요.</p>';

    html += '<div style="margin-top:14px;display:flex;gap:6px;flex-wrap:wrap">' +
      '<button class="btn btn-sm" id="g-use">이 날짜로 이사 계획 시작</button>' +
      '<button class="btn btn-outline btn-sm" onclick="shareLink(this)">🔗 공유</button></div>';

    box.style.display = '';
    box.innerHTML = html;

    var use = $('g-use');
    if (use) use.addEventListener('click', function () {
      var iso = y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      store.set('moveDate', iso);
      if (typeof window.track === 'function') window.track('gilil_date_selected', { month: m });
      location.href = '/checklist';
    });
  }

  /* ── 생년월일 드롭다운 ── */
  function fillBirthSelects() {
    var now = new Date().getFullYear();
    var y = '<option value="">연도</option>';
    for (var i = now; i >= 1930; i--) y += '<option value="' + i + '">' + i + '년</option>';
    $('g-by').innerHTML = y;

    var m = '<option value="">월</option>';
    for (var j = 1; j <= 12; j++) m += '<option value="' + j + '">' + j + '월</option>';
    $('g-bm').innerHTML = m;

    fillDays();
  }

  function fillDays() {
    var yv = +$('g-by').value, mv = +$('g-bm').value;
    var keep = $('g-bd').value;
    var last = (yv && mv) ? new Date(yv, mv, 0).getDate() : 31;
    var d = '<option value="">일</option>';
    for (var i = 1; i <= last; i++) d += '<option value="' + i + '">' + i + '일</option>';
    $('g-bd').innerHTML = d;
    if (keep && +keep <= last) $('g-bd').value = keep;
  }

  function birthValue() {
    var y = $('g-by').value, m = $('g-bm').value, d = $('g-bd').value;
    if (!y || !m || !d) return '';
    return y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  }

  /* ── 시각 선택지 ── */
  function fillHours() {
    var h = '<option value="">모름</option>';
    for (var i = 0; i < 24; i++) {
      h += '<option value="' + i + '">' + String(i).padStart(2, '0') + '시대</option>';
    }
    $('g-bh').innerHTML = h;
  }

  /* ── 내 정보 요약 ── */
  function syncZodiac() {
    var v = birthValue();
    var box = $('g-saju');
    state.sex = $('g-sex').value || '';
    state.hour = $('g-bh').value;

    if (!v) {
      state.zodiac = null; state.age = null;
      box.style.display = 'none';
      syncClearBtn();
      return;
    }
    var b = new Date(v + 'T00:00:00');
    if (isNaN(b.getTime())) {
      state.zodiac = null; state.age = null;
      box.style.display = 'none';
      syncClearBtn();
      return;
    }

    state.zodiac = G.zodiacOf(b);
    var moveYear = +String(state.ym || '').split('-')[0] || new Date().getFullYear();
    state.age = G.koreanAge(b.getFullYear(), moveYear);

    if ($('g-remember') && $('g-remember').checked) {
      store.set('gililBirth', v);
      store.set('gililSex', state.sex);
      store.set('gililHour', state.hour);
    }

    var lines = '<b>' + esc(G.BRANCH[state.zodiac]) + '(' + esc(G.ZODIAC[state.zodiac]) + ')띠</b>' +
      ' · ' + moveYear + '년 기준 <b>세는나이 ' + state.age + '세</b>';

    if (state.sex) {
      var sm = G.saenggiMap(state.age, state.sex);
      if (sm) lines += '<br>생기복덕 <b>본괘: ' + esc(sm.base) + '괘</b> — 이 괘를 기준으로 날짜별 길흉을 계산합니다.';
    } else {
      lines += '<br><span class="sub">성별을 고르면 <b>생기복덕법</b>으로 개인 맞춤 길일을 계산합니다.</span>';
    }
    if (state.hour !== '') {
      var hb = G.hourBranch(state.hour);
      if (hb !== null) lines += '<br>태어난 시각: <b>' + esc(G.BRANCH[hb]) + '시</b>';
    }

    box.style.display = '';
    box.innerHTML = '<span data-icon="info"></span><span>' + lines + '</span>';
    syncClearBtn();
  }

  /* ── 기본 월(선택지 첫 항목 = 이번 달) ── */
  function defaultMonth() {
    var sel = $('g-month');
    return (sel && sel.options.length) ? sel.options[0].value : '';
  }

  /* ── 방향 버튼 표시 갱신 ── */
  function syncDirButtons() {
    var pad = $('g-dir');
    if (!pad) return;
    Array.prototype.forEach.call(pad.querySelectorAll('button'), function (b) {
      if (b.classList.contains('sp')) return;
      b.classList.toggle('on', (b.getAttribute('data-d') || '') === state.dir);
    });
  }

  /* ── '입력 지우기' 버튼 노출 여부 (월·방향 포함) ── */
  function syncClearBtn() {
    var clr = $('g-clear-birth');
    if (!clr) return;
    var dirty = !!birthValue() || !!state.sex || state.hour !== '' ||
                !!state.dir || (!!state.ym && state.ym !== defaultMonth());
    clr.style.display = dirty ? '' : 'none';
  }

  function init() {
    fillMonths();
    fillBirthSelects();
    fillHours();

    var remember = store.get('gililRemember', false);
    if ($('g-remember')) $('g-remember').checked = !!remember;

    if (remember) {
      var savedBirth = store.get('gililBirth', '');
      if (savedBirth) {
        var p = savedBirth.split('-');
        $('g-by').value = +p[0];
        $('g-bm').value = +p[1];
        fillDays();
        $('g-bd').value = +p[2];
      }
      $('g-sex').value = store.get('gililSex', '') || '';
      $('g-bh').value = store.get('gililHour', '') === '' ? '' : store.get('gililHour', '');
    } else {
      /* 기억하지 않기로 한 경우 남아 있을 수 있는 값을 정리 */
      store.set('gililBirth', ''); store.set('gililSex', ''); store.set('gililHour', ''); store.set('gililDir', '');
    }
    var savedDir = remember ? store.get('gililDir', '') : '';

    state.ym = $('g-month').value;
    state.dir = savedDir || '';
    syncZodiac();

    // 방향 버튼 초기화
    var pad = $('g-dir');
    syncDirButtons();

    renderYearDir(+state.ym.split('-')[0]);
    renderCalendar();

    $('g-month').addEventListener('change', function () {
      state.ym = this.value; state.sel = null;
      $('g-detail').style.display = 'none';
      syncZodiac();
      renderYearDir(+state.ym.split('-')[0]);
      renderCalendar();
    });

    $('g-remember').addEventListener('change', function () {
      store.set('gililRemember', this.checked);
      if (!this.checked) {
        store.set('gililBirth', ''); store.set('gililSex', ''); store.set('gililHour', ''); store.set('gililDir', '');
      } else {
        store.set('gililDir', state.dir || '');
        syncZodiac();
      }
    });

    ['g-sex', 'g-bh'].forEach(function (id) {
      $(id).addEventListener('change', function () {
        syncZodiac(); renderCalendar();
        if (state.sel) { var p = state.sel.split('-'); renderDetail(+p[0], +p[1], +p[2]); }
      });
    });

    ['g-by', 'g-bm', 'g-bd'].forEach(function (id) {
      $(id).addEventListener('change', function () {
        if (id !== 'g-bd') fillDays();
        syncZodiac(); renderCalendar();
        if (state.sel) { var p = state.sel.split('-'); renderDetail(+p[0], +p[1], +p[2]); }
      });
    });

    $('g-clear-birth').addEventListener('click', function () {
      /* 생년월일·성별·시각 */
      $('g-by').value = ''; $('g-bm').value = ''; fillDays(); $('g-bd').value = '';
      $('g-sex').value = ''; $('g-bh').value = '';
      /* 이사 방향 → 모름 */
      state.dir = '';
      syncDirButtons();
      /* 이사 예정 월 → 이번 달 */
      var dm = defaultMonth();
      if (dm) { $('g-month').value = dm; state.ym = dm; }
      /* 선택한 날짜·상세 닫기 */
      state.sel = null;
      var det = $('g-detail'); if (det) det.style.display = 'none';
      /* 저장값 정리 */
      store.set('gililBirth', ''); store.set('gililSex', ''); store.set('gililHour', ''); store.set('gililDir', '');
      store.set('gililRemember', false);
      if ($('g-remember')) $('g-remember').checked = false;

      syncZodiac();
      renderYearDir(+state.ym.split('-')[0]);
      renderCalendar();
    });

    /* 확인 버튼 — 결과로 스크롤 (계산은 실시간이지만 명시적 행동을 제공) */
    $('g-go').addEventListener('click', function () {
      renderCalendar();
      var ho = $('g-howto');
      if (ho) ho.style.display = 'none';
      if (typeof window.track === 'function') window.track('gilil_search', { hasBirth: !!state.zodiac, dir: state.dir || 'none' });
      scrollTo($('g-top'));
    });

    pad.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b || b.classList.contains('sp')) return;
      state.dir = b.getAttribute('data-d') || '';
      store.set('gililDir', ($('g-remember') && $('g-remember').checked) ? state.dir : '');
      syncDirButtons();
      syncClearBtn();
      renderCalendar();
      if (state.sel) { var p = state.sel.split('-'); renderDetail(+p[0], +p[1], +p[2]); }
    });

    $('g-cal').addEventListener('click', function (e) {
      var cell = e.target.closest('[data-k]');
      if (!cell) return;
      state.sel = cell.getAttribute('data-k');
      var p = state.sel.split('-');
      renderCalendar();
      renderDetail(+p[0], +p[1], +p[2]);
      if (typeof window.track === 'function') window.track('gilil_day_opened', {});
      scrollTo($('g-detail'));
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
