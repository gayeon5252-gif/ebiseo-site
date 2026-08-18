/* ============================================================
   이사 길일 찾기 — 전통 택일 + 예약 수요(비용) 동시 계산
   - 음력 데이터는 gilil-data.js (KASI 기반 변환 결과)
   - 생년월일은 이 기기(localStorage)에만 저장되며 서버로 전송되지 않습니다.
   - 전통 항목은 민속 참고용이며 예측이 아닙니다.
   ============================================================ */
(function () {
  var D = window.GILIL_DATA;
  if (!D) return;

  var BRANCH = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
  var ZODIAC = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지'];
  var DIRS   = { E: '동쪽', S: '남쪽', W: '서쪽', N: '북쪽' };
  var WEEK   = ['일', '월', '화', '수', '목', '금', '토'];

  var START = new Date(D.start + 'T00:00:00');
  var END   = new Date(D.end + 'T00:00:00');

  function dayIndex(dt) {
    return Math.round((dt - START) / 86400000);
  }
  function inRange(dt) {
    return dt >= START && dt <= END;
  }

  /* ── 음력 일 ── */
  function lunarDay(dt) {
    var i = dayIndex(dt);
    if (i < 0 || i >= D.lunarDays.length) return null;
    return '0123456789ABCDEFGHIJKLMNOPQRSTU'.indexOf(D.lunarDays[i]);
  }

  /* ── 일진 지지·천간 (앵커 기반 주기 계산) ── */
  function dayBranch(dt) {
    var i = dayIndex(dt);
    return ((D.anchorBranch + i) % 12 + 12) % 12;
  }
  function dayStem(dt) {
    var i = dayIndex(dt);
    return ((D.anchorStem + i) % 10 + 10) % 10;
  }

  /* ============================================================
     생기복덕법(生氣福德法) — 전통 개인 맞춤 택일
     · 세는나이와 성별로 본괘(本卦)를 정하고,
       상·중·하 효를 정해진 순서로 바꿔 8가지 길흉을 팔괘에 배정합니다.
     · 그날 일진의 지지가 어느 괘에 해당하는지 보고 길흉을 판정합니다.
     ============================================================ */

  /* 팔괘: 아래(초효)→위(상효) 3비트, 1=양(⚊), 0=음(⚋) */
  var GUA = {
    '건': [1, 1, 1], '태': [1, 1, 0], '이': [1, 0, 1], '진': [1, 0, 0],
    '손': [0, 1, 1], '감': [0, 1, 0], '간': [0, 0, 1], '곤': [0, 0, 0]
  };
  function guaName(bits) {
    for (var k in GUA) {
      if (GUA[k][0] === bits[0] && GUA[k][1] === bits[1] && GUA[k][2] === bits[2]) return k;
    }
    return null;
  }

  /* 구궁 나이 배정: 男 이궁 순행(곤 제외), 女 감궁 역행(간 제외) — 각 7궁 순환 */
  var CYCLE_M = ['이', '태', '건', '감', '간', '진', '손'];
  var CYCLE_F = ['감', '건', '태', '곤', '이', '손', '진'];

  /* 8변 순서와 변효 위치 (0=초효/하, 1=중효, 2=상효) */
  var TRANS = [
    { name: '생기', yao: 2, luck: 2, desc: '기운이 살아나는 날. 이사·개업에 가장 좋다고 봅니다.' },
    { name: '천의', yao: 1, luck: 2, desc: '하늘이 돕는 날. 건강·안정에 이롭다고 봅니다.' },
    { name: '절체', yao: 0, luck: 1, desc: '무난한 날. 크게 좋지도 나쁘지도 않다고 봅니다.' },
    { name: '유혼', yao: 1, luck: 1, desc: '마음이 뜨는 날. 평범하게 봅니다.' },
    { name: '화해', yao: 2, luck: 0, desc: '다툼과 손실을 조심하는 날로 봅니다.' },
    { name: '복덕', yao: 1, luck: 2, desc: '복이 드는 날. 재물·경사에 좋다고 봅니다.' },
    { name: '절명', yao: 0, luck: 0, desc: '기운이 끊긴다 하여 큰일을 피하는 날로 봅니다.' },
    { name: '귀혼', yao: 1, luck: 1, desc: '제자리로 돌아오는 날. 평범하게 봅니다.' }
  ];

  /* 후천팔괘–지지 대응 */
  var BRANCH_GUA = ['감', '간', '간', '진', '손', '손', '이', '곤', '곤', '태', '건', '건'];
  /*                자    축    인    묘    진    사    오    미    신    유    술    해 */

  /* 세는나이 (해당 연도 - 출생연도 + 1) */
  function koreanAge(birthYear, targetYear) {
    return targetYear - birthYear + 1;
  }

  /* 본괘 → 8가지 길흉이 배정된 괘 지도 반환 */
  function saenggiMap(age, gender) {
    if (!age || age < 1) return null;
    var cycle = (gender === 'F') ? CYCLE_F : CYCLE_M;
    var base = cycle[(age - 1) % 7];
    var bits = GUA[base].slice();
    var map = {};                      // 괘이름 → 길흉정보
    for (var i = 0; i < TRANS.length; i++) {
      bits[TRANS[i].yao] = bits[TRANS[i].yao] ? 0 : 1;   // 해당 효를 뒤집음
      var g = guaName(bits);
      if (g) map[g] = TRANS[i];
    }
    return { base: base, map: map };
  }

  /* 그날의 생기복덕 판정 */
  function saenggiOf(dt, age, gender) {
    var sm = saenggiMap(age, gender);
    if (!sm) return null;
    var g = BRANCH_GUA[dayBranch(dt)];
    var t = sm.map[g];
    if (!t) return null;
    return { base: sm.base, gua: g, name: t.name, luck: t.luck, desc: t.desc };
  }

  /* ── 이사 시간대(12시진) 추천 ── */
  var SIJIN = [
    { n: '자시', h: '23:30~01:30' }, { n: '축시', h: '01:30~03:30' },
    { n: '인시', h: '03:30~05:30' }, { n: '묘시', h: '05:30~07:30' },
    { n: '진시', h: '07:30~09:30' }, { n: '사시', h: '09:30~11:30' },
    { n: '오시', h: '11:30~13:30' }, { n: '미시', h: '13:30~15:30' },
    { n: '신시', h: '15:30~17:30' }, { n: '유시', h: '17:30~19:30' },
    { n: '술시', h: '19:30~21:30' }, { n: '해시', h: '21:30~23:30' }
  ];
  /* 실제 이사가 이뤄지는 낮 시간대(묘시~신시)만 추천 대상으로 봅니다 */
  var DAY_SIJIN = [3, 4, 5, 6, 7, 8];

  function goodHours(dt, zodiac) {
    var db = dayBranch(dt);
    var out = [];
    DAY_SIJIN.forEach(function (i) {
      var clashDay = ((i - db) % 12 + 12) % 12 === 6;
      var clashMe = (zodiac !== null && zodiac !== undefined) &&
                    (((i - zodiac) % 12 + 12) % 12 === 6);
      out.push({
        idx: i, name: SIJIN[i].n, hours: SIJIN[i].h,
        clashDay: clashDay, clashMe: clashMe,
        ok: !clashDay && !clashMe
      });
    });
    return out;
  }

  /* 태어난 시각 → 시지 */
  function hourBranch(h) {
    if (h === null || h === undefined || h === '') return null;
    h = +h;
    if (h >= 23 || h < 1) return 0;                 // 자시
    return Math.floor((h + 1) / 2) % 12;
  }

  /* ── 손방(損方): 음력 일 끝자리 기준 ── */
  function sonDirection(ld) {
    var d = ld % 10;
    if (d === 1 || d === 2) return 'E';
    if (d === 3 || d === 4) return 'S';
    if (d === 5 || d === 6) return 'W';
    if (d === 7 || d === 8) return 'N';
    return null;                       // 9, 0 → 손 없는 날
  }

  /* ── 삼살방(三殺方): 그 해 년지 기준 ── */
  function samsal(yb) {
    if ([8, 0, 4].indexOf(yb) >= 0) return 'S';   // 신자진
    if ([2, 6, 10].indexOf(yb) >= 0) return 'N';  // 인오술
    if ([5, 9, 1].indexOf(yb) >= 0) return 'E';   // 사유축
    return 'W';                                   // 해묘미
  }

  /* ── 대장군방(大將軍方): 그 해 년지 기준 ── */
  function daejang(yb) {
    if ([11, 0, 1].indexOf(yb) >= 0) return 'W';  // 해자축
    if ([2, 3, 4].indexOf(yb) >= 0) return 'N';   // 인묘진
    if ([5, 6, 7].indexOf(yb) >= 0) return 'E';   // 사오미
    return 'S';                                   // 신유술
  }

  /* ── 띠(년지): 설날 경계 적용 ── */
  function zodiacOf(birth) {
    var y = birth.getFullYear();
    var s = D.seollal[String(y)];
    if (s) {
      var sm = parseInt(s.slice(0, 2), 10), sd = parseInt(s.slice(2), 10);
      var seol = new Date(y, sm - 1, sd);
      if (birth < seol) y -= 1;        // 설 이전 출생 → 전년 띠
    }
    return ((y - 4) % 12 + 12) % 12;
  }

  /* ── 예약 수요(=비용) 요인 ── */
  function demandFactors(dt, isSonless) {
    var f = [], score = 60;
    var dow = dt.getDay();
    var dom = dt.getDate();
    var mon = dt.getMonth() + 1;
    var last = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();

    if (isSonless) { f.push({ t: '손 없는 날', up: true, why: '예약이 몰려 견적이 올라갑니다' }); score -= 20; }
    if (dow === 6 || dow === 0) { f.push({ t: '주말', up: true, why: '직장인 수요가 몰립니다' }); score -= 15; }
    else { score += 10; }
    if (dom >= last - 5) { f.push({ t: '월말', up: true, why: '계약 만기가 몰리는 시기입니다' }); score -= 10; }
    if ([3, 4, 9, 10].indexOf(mon) >= 0) { f.push({ t: '이사 성수기', up: true, why: '봄·가을은 연중 가장 비쌉니다' }); score -= 10; }
    if ([12, 1, 2, 7, 8].indexOf(mon) >= 0) { f.push({ t: '비수기', up: false, why: '협상 여지가 큽니다' }); score += 8; }

    return { score: Math.max(0, Math.min(100, score)), factors: f };
  }

  /* ── 하루 종합 계산 ── */
  function evaluate(dt, opt) {
    opt = opt || {};
    if (!inRange(dt)) return null;

    var ld = lunarDay(dt);
    var son = sonDirection(ld);
    var isSonless = son === null;
    var db = dayBranch(dt);

    var yb = D.yearBranch[String(dt.getFullYear())];
    var ss = (yb === undefined) ? null : samsal(yb);
    var dj = (yb === undefined) ? null : daejang(yb);

    /* 전통 점수 */
    var tScore = 60, tNotes = [];
    if (isSonless) { tScore += 25; tNotes.push({ good: true, t: '손 없는 날', d: '어느 방향에도 손이 없다고 보는 날입니다.' }); }
    else { tNotes.push({ good: null, t: '손 방향: ' + DIRS[son], d: '전통적으로 이 방향으로의 이동을 피하는 날로 봅니다.' }); }

    var clash = false;
    if (opt.zodiac !== null && opt.zodiac !== undefined) {
      clash = ((db - opt.zodiac) % 12 + 12) % 12 === 6;
      if (clash) {
        tScore -= 40;
        tNotes.push({ good: false, t: '띠와 충(沖)하는 날', d: BRANCH[opt.zodiac] + '띠와 ' + BRANCH[db] + '일이 정면으로 부딪히는 날로 봅니다.' });
      } else {
        tNotes.push({ good: true, t: '띠와 충하지 않음', d: '일진 ' + BRANCH[db] + '일은 내 띠와 부딪히지 않습니다.' });
      }
    }

    /* 방향 판정 */
    var dirWarn = [];
    if (opt.dir) {
      if (son === opt.dir) { tScore -= 12; dirWarn.push('손 방향'); }
      if (ss === opt.dir)  { tScore -= 12; dirWarn.push('삼살방'); }
      if (dj === opt.dir)  { tScore -= 8;  dirWarn.push('대장군방'); }
    }
    tScore = Math.max(0, Math.min(100, tScore));

    /* 생기복덕 (나이·성별이 있을 때만) */
    var sg = null;
    if (opt.age && opt.gender) {
      sg = saenggiOf(dt, opt.age, opt.gender);
      if (sg) {
        if (sg.luck === 2) { tScore += 22; tNotes.push({ good: true, t: '생기복덕: ' + sg.name + '일', d: sg.desc }); }
        else if (sg.luck === 0) { tScore -= 30; tNotes.push({ good: false, t: '생기복덕: ' + sg.name + '일', d: sg.desc }); }
        else { tNotes.push({ good: null, t: '생기복덕: ' + sg.name + '일', d: sg.desc }); }
      }
    }
    tScore = Math.max(0, Math.min(100, tScore));

    var dem = demandFactors(dt, isSonless);

    /* 숨은 길일: 전통상 무난하거나 좋은데 수요가 낮은 날 */
    var traditionOk = !clash && dirWarn.length === 0 && (!sg || sg.luck >= 1);
    var hidden = (traditionOk && !isSonless && dem.score >= 68 && tScore >= 55);

    return {
      date: dt, lunarDay: ld, son: son, isSonless: isSonless,
      dayBranch: db, dayStem: dayStem(dt), clash: clash, dirWarn: dirWarn,
      samsal: ss, daejang: dj, saenggi: sg,
      tScore: tScore, tNotes: tNotes,
      dScore: dem.score, dFactors: dem.factors,
      total: Math.round(tScore * 0.5 + dem.score * 0.5),
      hidden: hidden
    };
  }

  var STEM = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];

  window.Gilil = {
    BRANCH: BRANCH, STEM: STEM, ZODIAC: ZODIAC, DIRS: DIRS, WEEK: WEEK,
    START: START, END: END, SIJIN: SIJIN,
    evaluate: evaluate, zodiacOf: zodiacOf,
    samsal: samsal, daejang: daejang,
    koreanAge: koreanAge, saenggiMap: saenggiMap, saenggiOf: saenggiOf,
    goodHours: goodHours, hourBranch: hourBranch,
    yearBranch: function (y) { return D.yearBranch[String(y)]; }
  };
})();
