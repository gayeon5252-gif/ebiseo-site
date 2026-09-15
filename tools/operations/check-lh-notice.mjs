#!/usr/bin/env node
/**
 * LH 실시간 공고 워커 점검 — AI를 부르지 않습니다. 토큰이 들지 않습니다.
 *
 *   node tools/operations/check-lh-notice.mjs
 *
 * 왜 필요한가: /youth-housing 과 홈의 LH 공고 블록은 **실패하면 스스로 숨습니다.**
 * (빈 블록을 방문자에게 보이지 않기 위한 의도된 설계) 그래서 워커가 죽거나
 * 공공데이터포털 인증키가 만료돼도 화면만 봐서는 알 수 없습니다. 이 스크립트가
 * 그 침묵을 깨는 역할입니다.
 *
 * 종료코드 1 = 손봐야 함. GitHub Actions에서 실패로 잡히면 메일이 옵니다.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const KEY = /청년|행복주택|매입임대|전세임대|신혼|대학생/
const OPEN = /접수중|공고중|정정/

const cfg = await fs.readFile(path.join(ROOT, 'public/js/config.js'), 'utf8')
const api = (cfg.match(/LH_NOTICE_API:\s*'([^']*)'/) || [])[1]

if (!api) {
  console.log('SKIP — config.js의 LH_NOTICE_API가 비어 있습니다. 위젯은 링크 안내만 보여줍니다.')
  process.exit(0)
}

let res
try {
  res = await fetch(api, { headers: { Origin: 'https://isabiseo.com' }, signal: AbortSignal.timeout(45000) })
} catch (e) {
  console.error('FAIL — 워커에 연결하지 못했습니다: ' + String(e).slice(0, 120))
  process.exit(1)
}

if (!res.ok) {
  console.error('FAIL — 워커 HTTP ' + res.status)
  process.exit(1)
}

const text = await res.text()
let rows
try {
  rows = JSON.parse(text)
} catch {
  console.error('FAIL — JSON이 아닙니다: ' + text.slice(0, 160))
  process.exit(1)
}

/* 인증키 문제는 200 안에 담겨 오므로 본문을 봐야 잡힙니다 */
if (!Array.isArray(rows)) {
  console.error('FAIL — 배열이 아닙니다. 인증키 오류일 수 있습니다: ' + text.slice(0, 200))
  process.exit(1)
}

const total = rows.length
const shown = rows.filter((x) => KEY.test(x.PAN_NM || '') && OPEN.test(x.PAN_SS || '')).length

if (total === 0) {
  console.error('FAIL — 공고가 0건입니다. 인증키 만료나 LH API 변경을 의심하세요.')
  process.exit(1)
}

console.log('OK — 공고 ' + total + '건 수신, 홈에 표시될 것 ' + shown + '건 (gzip 약 ' + Math.round(text.length / 1024) + 'KB 원문)')

/* 0건은 고장이 아니라 그날 접수중이 없는 것일 수 있습니다. 경고만 남기고 통과시킵니다. */
if (shown === 0) console.log('WARN — 청년 관련 접수중이 0건이라 오늘은 홈 섹션이 숨겨집니다. 고장은 아닙니다.')
