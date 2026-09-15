#!/usr/bin/env node
/**
 * GA4 일일 수치 수집 — AI를 부르지 않습니다. 토큰이 들지 않습니다.
 *
 *   node tools/operations/ga4-daily.mjs
 *
 * 서비스 계정 키로 Google Analytics Data API를 직접 호출합니다.
 * 브라우저도 로그인도 필요 없습니다. 외부 라이브러리도 쓰지 않습니다(node 내장 crypto로 JWT 서명).
 *
 * 키 파일 위치 (이 저장소 바깥에 둡니다 — 저장소는 공개입니다):
 *   C:\Users\USER\.ebiseo\ga4-key.json
 *   환경변수 EBISEO_GA4_KEY 로 다른 경로를 지정할 수 있습니다.
 *
 * 결과: C:\Users\USER\.ebiseo\ga4\YYYY-MM-DD.json  +  같은 폴더의 latest.txt(사람이 읽는 요약)
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import os from 'node:os'

const PROPERTY = '549196553'                       // 이비서 웹사이트
const HOME = process.env.USERPROFILE || os.homedir()
const KEY_PATH = process.env.EBISEO_GA4_KEY || path.join(HOME, '.ebiseo', 'ga4-key.json')
const OUT_DIR = path.join(HOME, '.ebiseo', 'ga4')

if (!fs.existsSync(KEY_PATH)) {
  console.error('키 파일이 없습니다: ' + KEY_PATH)
  console.error('구글 클라우드에서 서비스 계정 키(JSON)를 받아 이 경로에 두세요.')
  process.exit(2)
}
const key = JSON.parse(fs.readFileSync(KEY_PATH, 'utf8'))

/* ── 서비스 계정 JWT로 액세스 토큰 받기 ───────────────────── */
const b64 = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url')
async function accessToken() {
  const iat = Math.floor(Date.now() / 1000)
  const claim = {
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat, exp: iat + 3600,
  }
  const unsigned = b64({ alg: 'RS256', typ: 'JWT' }) + '.' + b64(claim)
  const sig = crypto.createSign('RSA-SHA256').update(unsigned).sign(key.private_key, 'base64url')
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: unsigned + '.' + sig,
    }),
  })
  const j = await res.json()
  if (!j.access_token) throw new Error('토큰 실패: ' + JSON.stringify(j).slice(0, 200))
  return j.access_token
}

async function runReport(token, body) {
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY}:runReport`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const j = await res.json()
  if (j.error) throw new Error('보고서 실패: ' + j.error.message)
  return j
}
const rows = (r) => (r.rows || []).map((x) => ({
  key: (x.dimensionValues || []).map((d) => d.value).join(' / '),
  v: (x.metricValues || []).map((m) => Number(m.value)),
}))

const token = await accessToken()
const RANGES = [{ startDate: '7daysAgo', endDate: 'yesterday' }, { startDate: '14daysAgo', endDate: '8daysAgo' }]
const METRICS = ['activeUsers', 'sessions', 'screenPageViews', 'engagementRate'].map((name) => ({ name }))

const totals = await runReport(token, { dateRanges: RANGES, metrics: METRICS })
const events = await runReport(token, { dateRanges: [RANGES[0]], dimensions: [{ name: 'eventName' }], metrics: [{ name: 'eventCount' }, { name: 'activeUsers' }], limit: 25 })
const sources = await runReport(token, { dateRanges: [RANGES[0]], dimensions: [{ name: 'sessionDefaultChannelGroup' }], metrics: [{ name: 'sessions' }, { name: 'engagementRate' }], limit: 10 })
const pages = await runReport(token, { dateRanges: [RANGES[0]], dimensions: [{ name: 'pagePath' }], metrics: [{ name: 'screenPageViews' }, { name: 'userEngagementDuration' }], limit: 12 })
const countries = await runReport(token, { dateRanges: [RANGES[0]], dimensions: [{ name: 'country' }], metrics: [{ name: 'activeUsers' }], limit: 8 })

const t = rows(totals)
const cur = t[0] ? t[0].v : [0, 0, 0, 0]
const prev = t[1] ? t[1].v : [0, 0, 0, 0]
const pct = (a, b) => (b ? Math.round(((a - b) / b) * 1000) / 10 + '%' : '—')

const now = new Date()
const kst = new Date(now.getTime() + (9 * 60 + now.getTimezoneOffset()) * 60000)
const today = kst.toISOString().slice(0, 10)
fs.mkdirSync(OUT_DIR, { recursive: true })

const out = {
  collectedAt: kst.toISOString().slice(0, 19) + '+09:00',
  property: PROPERTY,
  range: '최근 7일(어제까지) vs 직전 7일',
  totals: { activeUsers: cur[0], sessions: cur[1], views: cur[2], engagementRate: cur[3], previous: prev },
  events: rows(events), channels: rows(sources), pages: rows(pages), countries: rows(countries),
}
fs.writeFileSync(path.join(OUT_DIR, today + '.json'), JSON.stringify(out, null, 2))

const L = []
L.push('이비서 GA4  ' + out.collectedAt + '   (최근 7일, 어제까지)')
L.push('='.repeat(52))
L.push(`활성 사용자 ${cur[0]} (${pct(cur[0], prev[0])})   세션 ${cur[1]} (${pct(cur[1], prev[1])})`)
L.push(`조회수 ${cur[2]} (${pct(cur[2], prev[2])})   참여율 ${(cur[3] * 100).toFixed(1)}%`)
L.push('')
L.push('[유입]  ' + out.channels.map((c) => `${c.key} ${c.v[0]}회(참여 ${(c.v[1] * 100).toFixed(0)}%)`).join(' · '))
L.push('[국가]  ' + out.countries.map((c) => `${c.key} ${c.v[0]}`).join(' · '))
L.push('')
L.push('[주요 행동]')
for (const e of out.events.filter((e) => !/page_view|session_start|first_visit|user_engagement|scroll|click/.test(e.key))) {
  L.push(`  ${e.key.padEnd(30)} ${e.v[0]}회 / ${e.v[1]}명`)
}
L.push('')
L.push('[많이 본 페이지]')
for (const p of out.pages.slice(0, 8)) L.push(`  ${p.key.padEnd(34)} ${p.v[0]}회`)
const txt = L.join('\n') + '\n'
fs.writeFileSync(path.join(OUT_DIR, 'latest.txt'), txt)
console.log(txt)
console.log('저장: ' + path.join(OUT_DIR, today + '.json'))
