// Issue #345 段階2 QA: QAスイッチの組み合わせごとに同一offsetで撮り比べる。
//
// qa-shots.mjs との違いは**収束判定**。固定 waitTimeout ではなく
// 「連続2枚のスクリーンショットがピクセル一致するまで待つ」方式にしてある。
// ScrollControls の damping 0.25 は scrollTop のポーリングだけでは追い切れず、
// 固定待ちだとカメラが動いている途中の絵を撮ってしまい比較条件が崩れる。
//
// usage:
//   node scripts/qa-npr-shots.mjs <outDir> '<JSON: [["label", "?query", offset], ...]>'
import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [outDir, plansJson] = process.argv.slice(2)
const plans = JSON.parse(plansJson)
mkdirSync(outDir, { recursive: true })

const BASE = 'http://localhost:5173/scroll-poc'
// 収束ポーリングの間隔と上限。damping 0.25 は実測で2〜3秒あれば収まるが、
// 雲のアニメーションが止まらない構成だと永久に一致しないため上限を切る
const POLL_MS = 700
const MAX_POLLS = 18

const browser = await chromium.launch({ headless: false })

/** 連続2枚が完全一致するまで撮り続け、一致した最後の1枚を返す */
async function screenshotWhenStable(page, label) {
  let previous = null
  for (let i = 0; i < MAX_POLLS; i++) {
    const shot = await page.screenshot()
    if (previous && previous.equals(shot)) {
      console.log(`  [${label}] 収束 (${i + 1}回目)`)
      return shot
    }
    previous = shot
    await page.waitForTimeout(POLL_MS)
  }
  console.log(`  [${label}] 収束せず (${MAX_POLLS}回で打ち切り。雲アニメの可能性)`)
  return previous
}

for (const [label, query, offset] of plans) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => {
    const text = m.text()
    // シェーダーのコンパイルエラーとスイッチの適用件数だけ拾う
    if (m.type() === 'error' || /^\[(toon|hull)\]/.test(text)) errors.push(text)
  })

  await page.goto(`${BASE}${query}`, { waitUntil: 'load', timeout: 60000 })
  await page.waitForSelector('canvas', { timeout: 30000 })
  // コールドロード(3Dシーン+雲+Environment+フォント)。ここは収束判定の前提が整うまでの固定待ち
  await page.waitForTimeout(9000)

  await page.evaluate((off) => {
    const sc = [...document.querySelectorAll('div')].find((d) => d.scrollHeight > d.clientHeight * 2)
    if (!sc) throw new Error('scroll container not found')
    sc.scrollTop = off * (sc.scrollHeight - sc.clientHeight)
  }, offset)

  const shot = await screenshotWhenStable(page, label)
  writeFileSync(join(outDir, `${label}.png`), shot)
  console.log(`captured ${label} @offset=${offset} query=${query || '(none)'}`)
  for (const e of errors.slice(0, 8)) console.log(`  ! ${e}`)

  await page.close()
}

await browser.close()
