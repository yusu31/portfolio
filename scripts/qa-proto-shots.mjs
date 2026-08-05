// プロトタイプ(方向A/B/C)の撮り比べ用QA。qa-npr-shots.mjs のプロト版。
//
// 現行シーン用の qa-npr-shots.mjs との違いは2つ:
//   ① ルートを引数で受ける(/proto/a・/proto/b …を同じスクリプトで撮る)
//   ② スクロールを動かさない。プロトタイプ側に「章を直接指定するクエリ」を持たせてあるので
//      (`/proto/a?ch=2`)、ScrollControls の damping の収束を待つ必要がそもそも無い
//
// 収束判定は「連続2枚がピクセル一致するまで待つ」。ただし**必ず上限で打ち切る**。
// 現行シーンでは雲が常時アニメーションするため一致が永久に成立せず、
// 上限が無いとスクリプトが返ってこない(この失敗を実際に踏んでいる)。
// プロトタイプ側にアニメーションが入った瞬間に同じ状況になるので、最初から入れておく。
//
// usage:
//   node scripts/qa-proto-shots.mjs <route> <outDir> '<JSON: [["label","?query"], ...]>'
// 例:
//   node scripts/qa-proto-shots.mjs /proto/a shots '[["cut1","?ch=0"],["cut2","?ch=1"]]'
import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [route, outDir, plansJson] = process.argv.slice(2)
if (!route || !outDir || !plansJson) {
  console.error('usage: node scripts/qa-proto-shots.mjs <route> <outDir> <plansJson>')
  process.exit(1)
}

const plans = JSON.parse(plansJson)
mkdirSync(outDir, { recursive: true })

const BASE = `http://localhost:5173${route}`
const POLL_MS = 600
// 打ち切り上限。カメラ静止 + アニメーション無しなら2〜3回で収束する
const MAX_POLLS = 12
// 3Dシーンのコールドロード(テクスチャ生成・シェーダーコンパイル)を待つ固定待ち
const COLD_LOAD_MS = 6000

// ヘッデッド必須。この開発機ではヘッドレスだと誤った絵が出る
const browser = await chromium.launch({ headless: false })

/** 連続2枚が完全一致するまで撮り続ける。一致しなければ上限で打ち切って最後の1枚を返す */
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
  console.log(`  [${label}] 収束せず (${MAX_POLLS}回で打ち切り)`)
  return previous
}

for (const [label, query] of plans) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })

  await page.goto(`${BASE}${query || ''}`, { waitUntil: 'load', timeout: 60000 })
  await page.waitForSelector('canvas', { timeout: 30000 })
  await page.waitForTimeout(COLD_LOAD_MS)

  const shot = await screenshotWhenStable(page, label)
  writeFileSync(join(outDir, `${label}.png`), shot)
  console.log(`captured ${label} query=${query || '(none)'}`)
  for (const e of errors.slice(0, 8)) console.log(`  ! ${e}`)

  await page.close()
}

await browser.close()
