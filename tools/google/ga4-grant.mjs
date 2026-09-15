/**
 * GA4 속성에 서비스 계정을 뷰어로 추가한다.
 *
 *   node ga4-grant.mjs <저장폴더> <서비스계정이메일>
 *
 * 화면에서 확인한 좌표 (2026-09-15, 1600x1100)
 *  - 속성 액세스 관리 패널의 파란 + 버튼: (1516, 32)
 *  - 패널 자체 검색창이 (1040, 31)에 있으니 input을 넓게 찾으면 그걸 잡는다.
 *    입력은 반드시 대화상자 안으로 범위를 좁힌다.
 */
import { chromium } from 'playwright-core'
import path from 'node:path'

const OUT = process.argv[2] || '.'
const EMAIL = process.argv[3]
if (!EMAIL) { console.error('서비스 계정 이메일이 필요합니다'); process.exit(1) }
const ADMIN = 'https://analytics.google.com/analytics/web/#/a404028026p549196553/admin/suiteusermanagement/property'

const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--disable-blink-features=AutomationControlled'] })
const context = await browser.newContext({ viewport: { width: 1600, height: 1100 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul' })
const page = await context.newPage()
const shot = async (n) => { await page.screenshot({ path: path.join(OUT, n) }); console.log('SHOT ' + n) }
const settle = async (ms) => { await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {}); await page.waitForTimeout(ms || 10000) }
async function press(label) {
  for (const fn of [
    () => page.getByRole('button', { name: label, exact: true }).first().click({ timeout: 6000 }),
    () => page.getByRole('menuitem', { name: label, exact: true }).first().click({ timeout: 5000 }),
    () => page.getByText(label, { exact: true }).first().click({ timeout: 5000 }),
  ]) { try { await fn(); console.log('  ✓ ' + label); return true } catch {} }
  console.log('  ✗ ' + label); return false
}

console.log('창을 열었습니다. 구글 계정으로 로그인해 주세요 (최대 10분).')
await page.goto('https://analytics.google.com/analytics/web/', { waitUntil: 'domcontentloaded' }).catch(() => {})
const dl = Date.now() + 10 * 60 * 1000
let ok = false
while (Date.now() < dl) {
  await page.waitForTimeout(3000)
  const u = page.url()
  if (/analytics\.google\.com/.test(u) && !/accounts\.google\.com/.test(u)) {
    await page.waitForTimeout(5000)
    if (!/accounts\.google\.com/.test(page.url())) { ok = true; break }
  }
}
if (!ok) { console.log('TIMEOUT'); await browser.close(); process.exit(2) }
console.log('LOGGED_IN')

await page.goto(ADMIN, { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {})
await settle(15000)
if (await page.getByText(EMAIL, { exact: false }).count()) {
  console.log('ALREADY_GRANTED'); await shot('n-99-already.png'); console.log('DONE'); await browser.close(); process.exit(0)
}

/* 파란 + — 화면에서 확인한 좌표 */
await page.mouse.click(1516, 32)
console.log('  + 클릭 (1516,32)')
await page.waitForTimeout(3500)
await shot('n-01-menu.png')
await press('사용자 추가')
await settle(9000)
await shot('n-02-dialog.png')

/* 대화상자 안에서만 입력칸을 찾는다 */
let typed = false
const scopes = [page.getByRole('dialog'), page.locator('[role="dialog"]'), page.locator('mat-dialog-container')]
for (const sc of scopes) {
  try {
    if (!(await sc.count())) continue
    const box = sc.locator('input').first()
    if (await box.count()) { await box.click({ timeout: 8000 }); await box.fill(EMAIL); typed = true; console.log('  이메일 입력 (대화상자 안)'); break }
  } catch {}
}
if (!typed) {
  /* 대화상자를 못 잡으면, 화면에 보이는 입력칸 중 상단 전역/패널 검색창을 뺀 것 */
  const all = page.locator('input:visible')
  const n = await all.count()
  console.log('  보이는 input ' + n + '개 — 위에서 세 번째부터 시도')
  for (let i = 0; i < n; i++) {
    const b = all.nth(i)
    const box = await b.boundingBox().catch(() => null)
    if (!box || box.y < 80) continue          // 상단 검색줄 제외
    try { await b.click({ timeout: 4000 }); await b.fill(EMAIL); typed = true; console.log('  이메일 입력 (y=' + Math.round(box.y) + ')'); break } catch {}
  }
}
await page.waitForTimeout(2500)
await shot('n-03-email.png')

await press('뷰어')
await page.waitForTimeout(2000)
await shot('n-04-role.png')
await press('추가')
await settle(10000)
await shot('n-05-after.png')

await page.goto(ADMIN, { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {})
await settle(12000)
const granted = await page.getByText(EMAIL, { exact: false }).count()
await shot('n-06-verify.png')
console.log(granted ? 'GRANTED — 목록에서 확인됨' : 'NOT_CONFIRMED')
console.log('DONE')
await browser.close()
