import { chromium } from 'playwright-core'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
for (const [name, w, h, mobile] of [['desktop', 1920, 1080, false], ['mobile', 430, 900, true]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, locale: 'ko-KR' })
  const page = await ctx.newPage()
  await page.goto('https://isabiseo.com/?nc=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForLoadState('networkidle', { timeout: 45000 }).catch(() => {})
  await page.waitForTimeout(11000)
  const info = await page.evaluate(() => {
    const out = []
    document.querySelectorAll('iframe').forEach(f => {
      const r = f.getBoundingClientRect()
      const parent = f.closest('.cp-rail') ? 'rail' : (f.closest('.cp-bottom') ? 'bottom' : 'other')
      out.push({ parent, w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), visible: r.width > 0 && r.height > 0, src: (f.src || '').slice(0, 45) })
    })
    const rail = document.querySelector('.cp-rail')
    const bottom = document.querySelector('.cp-bottom')
    return {
      iframes: out,
      railBox: rail ? (({ x, width, height }) => ({ x: Math.round(x), w: Math.round(width), h: Math.round(height) }))(rail.getBoundingClientRect()) : null,
      railDisplay: rail ? getComputedStyle(rail).display : null,
      bottomBox: bottom ? (({ x, width, height }) => ({ x: Math.round(x), w: Math.round(width), h: Math.round(height) }))(bottom.getBoundingClientRect()) : null,
      viewportW: document.documentElement.clientWidth,
    }
  })
  console.log('=== ' + name + ' (' + w + 'px) ===')
  console.log('  rail:', JSON.stringify(info.railBox), 'display=' + info.railDisplay)
  console.log('  bottom:', JSON.stringify(info.bottomBox))
  info.iframes.forEach(f => console.log('  iframe[' + f.parent + '] ' + f.w + 'x' + f.h + ' @x=' + f.x + ' ' + (f.x + f.w > info.viewportW ? '⚠️화면밖' : '')))
  await ctx.close()
}
await browser.close()
