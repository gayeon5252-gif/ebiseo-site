/**
 * GA4 한 번 작업용 — 디스크에 아무것도 저장하지 않습니다.
 *
 * 실패에서 배운 것 (2026-09-13)
 *  1. 보고서 주소를 지어내면 홈으로 되돌린다.
 *  2. 새 창은 왼쪽 메뉴가 접혀 있다. 보고서 아이콘(레일 2번째)을 눌러 펼쳐야 글자가 생긴다.
 *  3. 이벤트 표는 <tr>이 아니다. 이름 좌표 기준 왼쪽 82px이 별표다.
 *  4. getByPlaceholder('검색')은 표가 아니라 GA4 전체 검색창을 잡는다.
 *     드롭다운이 별표를 덮어 클릭이 먹지 않는다 → 검색창은 아예 건드리지 않는다.
 */
import { chromium } from 'playwright-core'
import path from 'node:path'

const OUT = process.argv[2] || '.'
const P = 'a404028026p549196553'
const GA = 'https://analytics.google.com/analytics/web/'

const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--disable-blink-features=AutomationControlled'] })
const context = await browser.newContext({ viewport: { width: 1600, height: 1100 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul' })
const page = await context.newPage()

console.log('창을 열었습니다. 구글 계정으로 로그인해 주세요 (최대 10분).')
await page.goto(GA, { waitUntil: 'domcontentloaded' }).catch(() => {})
const deadline = Date.now() + 10 * 60 * 1000
let ok = false
while (Date.now() < deadline) {
  await page.waitForTimeout(3000)
  const u = page.url()
  if (/analytics\.google\.com/.test(u) && !/accounts\.google\.com/.test(u)) {
    await page.waitForTimeout(5000)
    if (!/accounts\.google\.com/.test(page.url())) { ok = true; break }
  }
}
if (!ok) { console.log('TIMEOUT'); await browser.close(); process.exit(2) }
console.log('LOGGED_IN')

const shot = async (n) => { await page.screenshot({ path: path.join(OUT, n) }); console.log('SHOT ' + n) }
const settle = async (ms) => { await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {}); await page.waitForTimeout(ms || 10000) }

/* ── 1) planner_started 별표 ─────────────────────────────── */
try {
  await page.goto(GA + '#/' + P + '/admin/events/overview', { waitUntil: 'domcontentloaded', timeout: 90000 })
  await settle(13000)
  await page.getByText('최근 활동', { exact: true }).first().click({ timeout: 20000 })
  await page.waitForTimeout(7000)

  const name = page.getByText('planner_started', { exact: true }).first()
  await name.waitFor({ timeout: 25000 })
  await name.scrollIntoViewIfNeeded().catch(() => {})
  await page.waitForTimeout(1500)
  const b = await name.boundingBox()
  if (!b) throw new Error('좌표 없음')
  const sx = b.x - 82, sy = b.y + b.height / 2
  console.log('이름 x=' + Math.round(b.x) + ' y=' + Math.round(b.y) + ' → 별표 (' + Math.round(sx) + ',' + Math.round(sy) + ')')
  await shot('t-01-before-star.png')
  await page.mouse.click(sx, sy)
  await page.waitForTimeout(8000)
  await shot('t-02-after-star.png')
  console.log('STAR_CLICKED')
} catch (e) {
  console.log('STAR_FAILED: ' + String(e).slice(0, 140))
  await shot('t-02-star-failed.png')
}

/* ── 2) 주요 이벤트 탭에서 확인 ──────────────────────────── */
try {
  await page.getByText('주요 이벤트', { exact: true }).first().click({ timeout: 15000 })
  await page.waitForTimeout(8000)
  await shot('t-03-key-events.png')
  const has = await page.getByText('planner_started', { exact: true }).count()
  console.log(has > 0 ? 'VERIFIED_ON — 주요 이벤트에 planner_started 있음' : 'VERIFY_EMPTY — 목록에 없음')
} catch (e) { console.log('VERIFY_SKIP: ' + String(e).slice(0, 80)) }

/* ── 3) 검색어 보고서: 레일에서 '보고서'를 눌러 메뉴부터 펼친다 ── */
try {
  await page.goto(GA + '#/' + P + '/reports/intelligenthome', { waitUntil: 'domcontentloaded', timeout: 90000 })
  await settle(13000)
  /* 왼쪽 레일 2번째 아이콘 = 보고서. aria-label 우선, 실패하면 좌표. */
  let opened = false
  for (const name of ['보고서', 'Reports']) {
    try { await page.getByRole('button', { name }).first().click({ timeout: 6000 }); opened = true; console.log('레일 클릭: ' + name); break } catch {}
  }
  if (!opened) { await page.mouse.click(28, 145); console.log('레일 좌표 클릭 (28,145)') }
  await page.waitForTimeout(6000)
  await shot('t-04-nav.png')

  try { await page.getByText('Search Console', { exact: true }).last().click({ timeout: 15000 }); console.log('Search Console 펼침'); await page.waitForTimeout(3500) } catch (e) { console.log('SC_CLICK_SKIP') }
  await page.getByText('쿼리', { exact: true }).first().click({ timeout: 15000 })
  console.log('쿼리 클릭')
  await settle(15000)
  console.log('최종 제목: ' + (await page.title()))
  await shot('t-05-queries.png')
} catch (e) {
  console.log('QUERIES_FAILED: ' + String(e).slice(0, 140))
  await shot('t-05-queries-failed.png')
}

console.log('DONE')
await browser.close()
