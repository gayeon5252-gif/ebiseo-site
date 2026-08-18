/* ============================================================
   문의 게시판 — Supabase inquiries 테이블
   - 읽기: 공개 글은 누구나 / 비공개 글은 작성자·운영자만 (RLS가 서버에서 강제)
   - 쓰기: 로그인 회원만
   ============================================================ */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var esc = window.escapeHtml || function (s) { return String(s == null ? '' : s); };

  if (!window.ebAuth || !window.ebAuth.enabled) {
    var d = $('bd-disabled'); if (d) d.style.display = 'block';
    return;
  }
  $('bd-main').style.display = 'block';

  var sb = null, me = null, isAdmin = false;

  function msg(text, ok) {
    var el = $('bd-msg');
    if (!text) { el.style.display = 'none'; return; }
    el.style.display = 'block';
    el.style.color = ok ? 'var(--success)' : 'var(--danger)';
    el.textContent = text;
  }

  function fmtDate(iso) {
    try {
      var dt = new Date(iso);
      return dt.getFullYear() + '.' + String(dt.getMonth() + 1).padStart(2, '0') + '.' +
             String(dt.getDate()).padStart(2, '0');
    } catch (e) { return ''; }
  }

  /* 닉네임 가리기 — 공개 목록에 실명·아이디가 그대로 드러나지 않게 */
  function maskName(n) {
    var s = String(n || '회원');
    if (s.length <= 1) return s + '**';
    if (s.length === 2) return s.charAt(0) + '*';
    return s.charAt(0) + new Array(s.length - 1).join('*') + s.charAt(s.length - 1);
  }

  function rowHtml(r) {
    var mine = me && r.user_id === me.id;
    var badges = '';
    if (r.is_private) badges += '<span class="badge badge-gray" style="font-size:11px">🔒 비공개</span> ';
    badges += r.answer
      ? '<span class="badge" style="font-size:11px;background:#E7F8EF;color:#0F8A50">답변 완료</span> '
      : '<span class="badge badge-gray" style="font-size:11px">답변 대기</span> ';
    if (mine) badges += '<span class="badge" style="font-size:11px;background:#E8F3FF;color:#1B64DA">내 글</span> ';

    return '<div class="bd-row" data-id="' + r.id + '" style="cursor:pointer">' +
             '<div class="bd-title">' + esc(r.title) + '</div>' +
             '<div class="bd-meta">' + badges +
               '<span>' + esc(r.type || '문의') + '</span><span>·</span>' +
               '<span>' + esc(maskName(r.nickname)) + '</span><span>·</span>' +
               '<span>' + fmtDate(r.created_at) + '</span>' +
             '</div>' +
             '<div class="bd-detail" id="bd-d-' + r.id + '" style="display:none;margin-top:12px"></div>' +
           '</div>';
  }

  function detailHtml(r) {
    var mine = me && r.user_id === me.id;
    var h = '<div class="card" style="background:var(--bg);box-shadow:none">' +
              '<div class="bd-body">' + esc(r.body) + '</div>';
    if (r.answer) {
      h += '<div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border)">' +
             '<div style="font-weight:700;font-size:14px;color:var(--primary);margin-bottom:6px">이비서 답변 ' +
             (r.answered_at ? '<span class="sub" style="font-weight:400;font-size:12px">· ' + fmtDate(r.answered_at) + '</span>' : '') +
             '</div><div class="bd-body">' + esc(r.answer) + '</div></div>';
    } else {
      h += '<p class="sub" style="font-size:13px;margin-top:12px">아직 답변이 등록되지 않았습니다.</p>';
    }
    h += '</div>';

    if (mine || isAdmin) {
      h += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">' +
             '<button class="btn btn-outline btn-sm" data-del="' + r.id + '">글 삭제</button>';
      if (isAdmin) h += '<button class="btn btn-sm" data-ans="' + r.id + '">답변 쓰기</button>';
      h += '</div>';
    }
    return h;
  }

  var cache = {};

  function render(rows) {
    var box = $('bd-list');
    if (!rows.length) {
      box.innerHTML = '<p class="sub" style="font-size:14px;padding:8px 4px">아직 등록된 문의가 없습니다. 첫 문의를 남겨보세요.</p>';
      return;
    }
    cache = {};
    rows.forEach(function (r) { cache[r.id] = r; });
    box.innerHTML = rows.map(rowHtml).join('');
  }

  function load() {
    sb.from('inquiries')
      .select('id,user_id,nickname,type,title,body,is_private,answer,answered_at,created_at')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(function (res) {
        if (res.error) {
          $('bd-list').innerHTML = '<p class="sub" style="font-size:14px;padding:8px 4px">목록을 불러오지 못했습니다. 잠시 후 새로고침해 주세요.</p>';
          return;
        }
        render(res.data || []);
      });
  }

  /* ── 목록 클릭: 펼치기 / 삭제 / 답변 ── */
  $('bd-list').addEventListener('click', function (e) {
    var delBtn = e.target.closest('[data-del]');
    if (delBtn) {
      e.stopPropagation();
      if (!window.confirm('이 글을 삭제할까요? 되돌릴 수 없습니다.')) return;
      sb.from('inquiries').delete().eq('id', delBtn.getAttribute('data-del')).then(function (res) {
        if (res.error) { window.alert('삭제하지 못했습니다: ' + res.error.message); return; }
        load();
      });
      return;
    }

    var ansBtn = e.target.closest('[data-ans]');
    if (ansBtn) {
      e.stopPropagation();
      var id = ansBtn.getAttribute('data-ans');
      var cur = (cache[id] && cache[id].answer) || '';
      var text = window.prompt('답변 내용을 입력하세요.', cur);
      if (text === null) return;
      sb.from('inquiries')
        .update({ answer: text.trim() || null, answered_at: text.trim() ? new Date().toISOString() : null })
        .eq('id', id)
        .then(function (res) {
          if (res.error) { window.alert('저장하지 못했습니다: ' + res.error.message); return; }
          load();
        });
      return;
    }

    var row = e.target.closest('.bd-row');
    if (!row) return;
    var rid = row.getAttribute('data-id');
    var box = $('bd-d-' + rid);
    if (!box) return;
    if (box.style.display === 'none') {
      box.innerHTML = detailHtml(cache[rid]);
      box.style.display = 'block';
      if (typeof window.track === 'function') window.track('board_post_opened', {});
    } else {
      box.style.display = 'none';
    }
  });

  /* ── 등록 ── */
  function bindSubmit() {
    $('bd-submit').addEventListener('click', function () {
      var title = $('bd-title').value.trim();
      var body = $('bd-body').value.trim();
      if (!title || !body) { msg('제목과 내용을 모두 입력해 주세요.'); return; }
      if (body.length < 10) { msg('내용을 조금 더 자세히 적어주세요. (10자 이상)'); return; }

      var btn = this;
      btn.disabled = true; btn.textContent = '등록 중…';

      var nickname = '회원';
      var meta = me.user_metadata || {};
      nickname = meta.nickname || meta.name || meta.full_name ||
                 (me.email ? me.email.split('@')[0] : '회원');

      sb.from('inquiries').insert({
        user_id: me.id,
        nickname: nickname,
        type: $('bd-type').value,
        title: title,
        body: body,
        is_private: $('bd-private').checked
      }).then(function (res) {
        btn.disabled = false; btn.textContent = '문의 등록하기';
        if (res.error) { msg('등록하지 못했습니다: ' + res.error.message); return; }
        $('bd-title').value = ''; $('bd-body').value = ''; $('bd-private').checked = false;
        msg('문의가 등록되었어요. 답변이 달리면 이 게시판에서 확인하실 수 있습니다.', true);
        if (typeof window.track === 'function') window.track('board_post_created', {});
        load();
      });
    });
  }

  window.ebAuth.onReady(async function () {
    sb = window.ebAuth.client();
    me = await window.ebAuth.getUser();

    if (me) {
      $('bd-form').style.display = 'block';
      bindSubmit();
      var a = await sb.from('admins').select('user_id').eq('user_id', me.id).maybeSingle();
      isAdmin = !!(a && a.data);
    } else {
      $('bd-need-login').style.display = 'block';
    }
    load();
  });
})();
