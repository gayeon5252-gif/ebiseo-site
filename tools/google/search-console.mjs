/**
 * 구글 서치콘솔 색인 생성 요청 — 디스크에 아무것도 저장하지 않습니다.
 *
 *   node search-console.mjs <저장폴더> <주소1> <주소2> ...
 *
 * 배운 것 (2026-09-13)
 *  - 로그인 후 처음 닿는 곳은 /search-console/about 마케팅 페이지다.
 *    '시작하기'를 눌러야 실제 콘솔로 들어가고, 그래야 URL 검사창이 생긴다.
 */
import { chromium } from 'playwright-core'
import path from 'node:path'

const OUT = process.argv[2] || '.'
const URLS = process.argv.slice(3)
if (!URLS.length) { console.error('주소를 하나 이상 주세요'); process.exit(1) }
const SC = 'https://search.google.com/search-console'

const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--disable-blink-features=AutomationControlled'] })
const context = await browser.newContext({ viewport: { width: 1600, height: 1100 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul' })
const page = await context.newPage()

const shot = async (n) => { await page.screenshot({ path: path.join(OUT, n) }); console.log('SHOT ' + n) }

console.log('창을 열었습니다. 구글 계정으로 로그인해 주세요 (최대 10분).')
await page.goto(SC, { waitUntil: 'domcontentloaded' }).catch(() => {})
const deadline = Date.now() + 10 * 60 * 1000
let ok = false
while (Date.now() < deadline) {
  await page.waitForTimeout(3000)
  const u = page.url()
  if (/search\.google\.com/.test(u) && !/accounts\.google\.com/.test(u)) {
    await page.waitForTimeout(5000)
    if (!/accounts\.google\.com/.test(page.url())) { ok = true; break }
  }
}
if (!ok) { console.log('TIMEOUT'); await browser.close(); process.exit(2) }
console.log('LOGGED_IN — ' + page.url())

if (page.url().indexOf('/about') >= 0) {
  try {
    await page.getByText('시작하기', { exact: true }).first().click({ timeout: 15000 })
    console.log('시작하기 클릭')
  } catch (e) {
    console.log('시작하기 버튼 없음')
  }
  await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {})
  await page.waitForTimeout(12000)
  console.log('이동 후: ' + page.url())
}
await shot('sc-00-console.png')

let i = 0
for (const url of URLS) {
  i++
  console.log('--- [' + i + '] ' + url)
  try {
    let box = null
    for (const sel of ['input[aria-label*="검사"]', 'input[placeholder*="검사"]', 'input[aria-label*="URL"]', 'input[type="text"]']) {
      const c = page.locator(sel).first()
      if (await c.count() && await c.isVisible().catch(() => false)) { box = c; console.log('  검사창: ' + sel); break }
    }
    if (!box) throw new Error('검사창을 못 찾음')
    await box.click({ timeout: 15000 })
    await box.fill(url)
    await page.keyboard.press('Enter')
    await page.waitForTimeout(22000)
    await shot('sc-' + i + '-1-inspect.png')

    const req = page.getByText('색인 생성 요청', { exact: false }).first()
    if (await req.count()) {
      await req.click({ timeout: 15000 })
      console.log('  색인 생성 요청 클릭 — 결과까지 70초 대기')
      await page.waitForTimeout(70000)
      await shot('sc-' + i + '-2-requested.png')
    } else {
      console.log('  색인 생성 요청 버튼 없음')
      await shot('sc-' + i + '-2-nobutton.png')
    }
    /* 다음 주소를 넣기 전에 검사 패널을 닫는다 */
    await page.keyboard.press('Escape').catch(() => {})
    await page.waitForTimeout(4000)
  } catch (e) {
    console.log('  FAILED: ' + String(e).slice(0, 120))
    await shot('sc-' + i + '-err.png')
  }
}
console.log('DONE')
await browser.close()
