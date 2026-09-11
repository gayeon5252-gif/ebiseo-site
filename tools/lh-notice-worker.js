/**
 * 이비서 — LH 임대 공고 프록시 (Cloudflare Worker)
 *
 * 하는 일: 공공데이터포털 "한국토지주택공사_분양임대공고문 조회 서비스"를 대신 호출해서
 *          인증키를 숨기고, 결과를 1시간 캐시한 뒤, isabiseo.com에만 응답한다.
 *
 * 설치 (한 번만):
 *   1. https://www.data.go.kr/data/15058530/openapi.do → 활용신청 (자동승인, 무료, 하루 10,000건)
 *      마이페이지 > 인증키 발급현황에서 "일반 인증키(Decoding)"를 복사
 *   2. https://dash.cloudflare.com → Workers & Pages → Create → Worker → 이름 lh-notice
 *      Edit code → 이 파일 내용을 통째로 붙여넣기 → Deploy
 *   3. Worker > Settings > Variables and Secrets → Add → 이름 DATA_GO_KR_KEY, 값 = 1번 키 → Encrypt → Save
 *   4. Worker 주소(https://lh-notice.<계정>.workers.dev)를 public/js/config.js의 LH_NOTICE_API에 넣고 배포
 *
 * 키는 여기(Worker 비밀값)에만 있고 사이트 코드에는 들어가지 않는다.
 */

const LH_API = 'https://apis.data.go.kr/B552555/lhLeaseNoticeInfo1/lhLeaseNoticeInfo1';
const ALLOW = ['https://isabiseo.com', 'https://www.isabiseo.com', 'https://ebiseo.pages.dev', 'http://127.0.0.1:5500', 'http://localhost:5500'];
const CACHE_SEC = 3600;

function ymd(d) {
  return d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0');
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': ALLOW.includes(origin) ? origin : ALLOW[0],
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Vary': 'Origin',
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=' + CACHE_SEC,
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (!env.DATA_GO_KR_KEY) return new Response(JSON.stringify({ error: 'DATA_GO_KR_KEY not set' }), { status: 500, headers: cors });

    // 최근 60일 공고 중 임대주택(06) + 주거복지(13). 접수 상태 필터는 클라이언트에서.
    const now = new Date();
    const from = new Date(now.getTime() - 60 * 86400000);
    const cacheKey = new Request('https://cache.local/lh?v3-' + ymd(now));
    const cache = caches.default;
    let hit = await cache.match(cacheKey);
    if (hit) {
      const body = await hit.text();
      return new Response(body, { headers: cors });
    }

    const results = [];
    for (const tp of ['06', '13']) {
      const u = new URL(LH_API);
      u.searchParams.set('serviceKey', env.DATA_GO_KR_KEY);
      u.searchParams.set('PG_SZ', '100');
      u.searchParams.set('PAGE', '1');
      u.searchParams.set('UPP_AIS_TP_CD', tp);
      u.searchParams.set('PAN_NT_ST_DT', ymd(from));
      u.searchParams.set('CLSG_DT', ymd(now));
      try {
        const r = await fetch(u.toString(), { headers: { Accept: 'application/json' } });
        const j = await r.json();
        results.push(j);
      } catch (e) {
        results.push({ error: String(e), type: tp });
      }
    }

    /* 화면에 쓰는 필드만 남긴다 — 원본 그대로 넘기면 150KB가 넘어 방문자 데이터를 낭비한다.
       페이지(youth-housing.html)는 PAN_NM을 가진 객체 배열을 그대로 읽을 수 있다. */
    const FIELDS = ['PAN_NM', 'UPP_AIS_TP_NM', 'AIS_TP_CD_NM', 'CNP_CD_NM', 'PAN_SS', 'DTL_URL', 'PAN_NT_ST_DT', 'CLSG_DT'];
    const rows = [];
    (function walk(o) {
      if (!o) return;
      if (Array.isArray(o)) { o.forEach(walk); return; }
      if (o.dsList) { walk(o.dsList); return; }
      if (o.PAN_NM) {
        const t = {};
        for (const f of FIELDS) if (o[f] != null) t[f] = o[f];
        rows.push(t);
      }
    })(results);

    const out = JSON.stringify(rows);
    /* 실패 응답은 캐시하지 않는다 — 키 오류나 일시 장애를 한 시간 붙잡고 있으면 안 된다 */
    if (rows.length) ctx.waitUntil(cache.put(cacheKey, new Response(out, { headers: { 'Cache-Control': 'public, max-age=' + CACHE_SEC } })));
    return new Response(out, { headers: cors });
  },
};
