import { chromium } from 'playwright-core'
const b = await chromium.launch({ channel: 'chrome', headless: true })
for (const [name,w,h,mob] of [['모바일',430,900,true],['데스크탑',1920,1080,false]]) {
  const p = await b.newContext({ viewport:{width:w,height:h}, isMobile:mob, hasTouch:mob, locale:'ko-KR' }).then(c=>c.newPage())
  for (const u of ['/', '/guide/studio-maintenance-fee']) {
    await p.goto('https://isabiseo.com'+u+'?nc='+Date.now(), { waitUntil:'domcontentloaded', timeout:60000 })
    await p.waitForLoadState('networkidle',{timeout:40000}).catch(()=>{})
    await p.waitForTimeout(9000)
    const r = await p.evaluate(() => {
      const el = document.querySelector('.cp-inline')
      if (!el) return null
      const rect = el.getBoundingClientRect()
      const top = rect.top + window.scrollY
      const prev = el.previousElementSibling
      return { top: Math.round(top), docH: Math.round(document.body.scrollHeight),
               pct: Math.round((top/document.body.scrollHeight)*100),
               after: prev ? (prev.id || prev.className || prev.tagName) : '?',
               iframe: !!el.querySelector('iframe') }
    })
    console.log(name+' '+u+'  →  '+(r? '문서의 '+r.pct+'% 지점 (위에서 '+r.top+'px) / 바로 앞: '+r.after+' / 배너 '+(r.iframe?'있음':'없음') : '없음'))
  }
  await p.context().close()
}
await b.close()
