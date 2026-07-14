// Phase 5-1 QA: offset直指定スクリーンショット撮影(使い捨て・コミットしない)
// usage: node qa-shots.mjs <outDir> '<JSON: [["label", offset], ...]>'
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const [outDir, pointsJson] = process.argv.slice(2)
const points = JSON.parse(pointsJson)
mkdirSync(outDir, { recursive: true })

// headless+WebGLはスクリーンショットが固まるため、e2e設定と同じくヘッドドで実行する
const browser = await chromium.launch({ headless: false })
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await page.goto('http://localhost:5173/scroll-poc', { waitUntil: 'load', timeout: 60000 })
await page.waitForSelector('canvas', { timeout: 30000 })
await page.waitForTimeout(9000) // コールドロード(3Dシーン+雲+Environment)

for (const [label, offset] of points) {
  await page.evaluate((off) => {
    const sc = [...document.querySelectorAll('div')].find(
      (d) => d.scrollHeight > d.clientHeight * 2
    )
    if (!sc) throw new Error('scroll container not found')
    sc.scrollTop = off * (sc.scrollHeight - sc.clientHeight)
  }, offset)
  await page.waitForTimeout(2800) // damping 0.25の収束待ち
  await page.screenshot({ path: join(outDir, `${label}.png`) })
  console.log(`captured ${label} @offset=${offset}`)
}

await browser.close()
