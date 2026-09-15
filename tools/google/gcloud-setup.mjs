/**
 * GA4 서비스 계정 만들기 — 구글 클라우드 콘솔을 대신 눌러 줍니다.
 *
 *   node gcloud-setup.mjs <저장폴더>
 *
 * 실패에서 배운 것 (2026-09-15)
 *  1. `locator('input').first()` 는 폼이 아니라 **상단 전역 검색창**을 잡는다.
 *     검색 드롭다운이 폼 버튼을 덮어 클릭이 전부 실패한다. (GA4 별표 때와 같은 함정)
 *     → 콘솔은 Angular라 `input[formcontrolname=...]` 로 정확히 짚는다.
 *  2. 글자로 버튼을 못 잡는 경우가 있다 → 좌표 클릭을 예비로 둔다.
 *  3. 하단 쿠키 배너가 버튼을 가린다 → 먼저 '확인'.
 */
import { chromium } from 'playwright-core'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'

const OUT = process.argv[2] || '.'
const PROJECT = 'gen-lang-client-0747185192'
const SA = 'ebiseo-ga4-reader'
const HOME = process.env.USERPROFILE || os.homedir()
const KEY_PATH = path.join(HOME, '.ebiseo', 'ga4-key.json')
fs.mkdirSync(path.dirname(KEY_PATH), { recursive: true })

const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--disable-blink-features=AutomationControlled'] })
const context = await browser.newContext({ viewport: { width: 1600, height: 1100 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul', acceptDownloads: true })
const page = await context.newPage()
const shot = async (n) => { await page.screenshot({ path: path.join(OUT, n) }); console.log('SHOT ' + n) }
const settle = async (ms) => { await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {}); await page.waitForTimeout(ms || 9000) }
const go = async (u, ms) => { await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {}); await settle(ms) }

/* 글자로 먼저, 안 되면 좌표로 */
async function press(label, xy) {
  for (const fn of [
    () => page.getByRole('button', { name: label, exact: true }).first().click({ timeout: 8000 }),
    () => page.getByRole('link', { name: label, exact: true }).first().click({ timeout: 5000 }),
    () => page.getByText(label, { exact: true }).first().click({ timeout: 5000 }),
  ]) {
    try { await fn(); console.log('  ✓ ' + label); return true } catch {}
  }
  if (xy) { await page.mouse.click(xy[0], xy[1]); console.log('  ✓ ' + label + ' (좌표 ' + xy + ')'); return true }
  console.log('  ✗ ' + label); return false
}

console.log('창을 열었습니다. 구글 계정으로 로그인해 주세요 (최대 10분).')
await page.goto('https://console.cloud.google.com/', { waitUntil: 'domcontentloaded' }).catch(() => {})
const dl0 = Date.now() + 10 * 60 * 1000
let ok = false
while (Date.now() < dl0) {
  await page.waitForTimeout(3000)
  const u = page.url()
  if (/console\.cloud\.google\.com/.test(u) && !/accounts\.google\.com/.test(u)) {
    await page.waitForTimeout(6000)
    if (!/accounts\.google\.com/.test(page.url())) { ok = true; break }
  }
}
if (!ok) { console.log('TIMEOUT'); await browser.close(); process.exit(2) }
console.log('LOGGED_IN')
await settle(8000)
await press('확인')                       // 쿠키 배너
await page.keyboard.press('Escape').catch(() => {})
await page.waitForTimeout(2500)

/* 1) API 켜기 — 파란 '사용' 버튼은 (232,288) 부근 */
await go('https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com?project=' + PROJECT, 13000)
if (await page.getByText('관리', { exact: true }).count()) {
  console.log('API 이미 켜져 있음')
} else {
  await press('사용', [232, 288])
  await page.waitForTimeout(28000)
}
await shot('k-01-api.png')

/* 2) 서비스 계정 만들기 — Angular 폼 필드를 직접 짚는다 */
await go('https://console.cloud.google.com/iam-admin/serviceaccounts/create?project=' + PROJECT, 14000)
await page.keyboard.press('Escape').catch(() => {})
await page.waitForTimeout(1500)
let filled = false
for (const sel of ['input[formcontrolname="displayName"]', 'input[formcontrolname="accountId"]', 'input[aria-label*="서비스 계정 이름"]']) {
  try {
    const box = page.locator(sel).first()
    if (await box.count()) { await box.click({ timeout: 8000 }); await box.fill(SA); console.log('  이름 입력: ' + sel); filled = true; break }
  } catch {}
}
if (!filled) console.log('  ✗ 이름 칸을 못 찾음')
await page.waitForTimeout(3000)
await shot('k-02-form.png')
await press('만들고 닫기', [342, 656])
await page.waitForTimeout(12000)
await shot('k-03-created.png')

/* 3) 목록에서 계정 찾아 열기 */
await go('https://console.cloud.google.com/iam-admin/serviceaccounts?project=' + PROJECT, 13000)
await shot('k-04-list.png')
let saEmail = ''
try {
  const el = page.getByText(new RegExp(SA + '@'), { exact: false }).first()
  saEmail = (await el.innerText({ timeout: 15000 })).trim()
  console.log('서비스 계정: ' + saEmail)
  await el.click({ timeout: 10000 })
  await settle(10000)
} catch (e) {
  console.log('SA_NOT_FOUND — 목록에서 못 찾았습니다')
  await shot('k-05-notfound.png')
  console.log('DONE'); await browser.close(); process.exit(1)
}

/* 4) 키 만들기 → JSON 내려받아 안전한 곳에 저장 */
try {
  await press('키') || await press('KEYS')
  await page.waitForTimeout(6000)
  await shot('k-06-keys.png')
  await press('키 추가') || await press('ADD KEY')
  await page.waitForTimeout(3500)
  await press('새 키 만들기') || await press('Create new key')
  await page.waitForTimeout(4500)
  await shot('k-07-dialog.png')
  const dl = page.waitForEvent('download', { timeout: 60000 })
  await press('만들기') || await press('CREATE')
  const f = await dl
  await f.saveAs(KEY_PATH)
  console.log('KEY_SAVED ' + KEY_PATH)
  console.log('SA_EMAIL ' + saEmail)
  await page.waitForTimeout(4000)
  await shot('k-08-done.png')
} catch (e) {
  console.log('KEY_FAILED: ' + String(e).slice(0, 140))
  await shot('k-08-key-failed.png')
}
console.log('DONE')
await browser.close()
