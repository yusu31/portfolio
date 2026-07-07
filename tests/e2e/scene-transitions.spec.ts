import { test, expect } from '@playwright/test'

// dev サーバー (pnpm dev) が http://localhost:5173 で起動済みであること

const COLD_LOAD = 6000   // 初回コールドロード待ち
const SCENE_WAIT = 3500  // シーン遷移後の安定待ち
const BALL_MOVE  = 4500  // ボールがホットスポットに到達するまでの余裕

// ---------- helpers ----------

async function goHome(page: Parameters<typeof test.fn>[0]['page']) {
  await page.locator('a[href="/"]').first().click()
  await page.waitForTimeout(SCENE_WAIT)
}

async function goScene(
  page: Parameters<typeof test.fn>[0]['page'],
  href: '/soccer' | '/basketball' | '/volleyball' | '/contact'
) {
  await page.locator(`a[href="${href}"]`).first().click()
  await page.waitForTimeout(SCENE_WAIT)
}

/** canvas 上の 3D フロアをクリックしてボールを移動させる */
async function clickCanvas(
  page: Parameters<typeof test.fn>[0]['page'],
  x: number,
  y: number
) {
  await page.locator('canvas').click({ position: { x, y }, force: true })
  await page.waitForTimeout(BALL_MOVE)
}

/** DEV 環境の window.__e2eSetHotspot でホットスポットを直接起動する（座標推定が困難なシーン用） */
async function activateHotspot(
  page: Parameters<typeof test.fn>[0]['page'],
  id: string
) {
  await page.evaluate((hotspotId) => {
    const fn = (window as Record<string, unknown>).__e2eSetHotspot as ((id: string) => void) | undefined
    if (fn) fn(hotspotId)
  }, id)
  await page.waitForTimeout(500)
}

async function waitSceneCard(page: Parameters<typeof test.fn>[0]['page']) {
  await page.waitForSelector('[data-testid="scene-card"][data-visible="true"]', {
    timeout: 12_000,
  })
}

// ---------- テスト 1: 全シーン遷移 ----------

test.describe('全シーン遷移', () => {
  test('Home→Soccer→Basketball→Volleyball→Contact→Home の順で遷移できる', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(COLD_LOAD)

    await expect(page).toHaveURL('/')
    await expect(page.locator('text=HEY')).toBeVisible()

    await goScene(page, '/soccer')
    await expect(page).toHaveURL('/soccer')
    await expect(page.locator('[data-scene-ui]')).toBeVisible()

    await goScene(page, '/basketball')
    await expect(page).toHaveURL('/basketball')
    await expect(page.locator('[data-scene-ui]')).toBeVisible()

    await goScene(page, '/volleyball')
    await expect(page).toHaveURL('/volleyball')
    await expect(page.locator('[data-scene-ui]')).toBeVisible()

    await goScene(page, '/contact')
    await expect(page).toHaveURL('/contact')
    await expect(page.locator('text=Email')).toBeVisible()

    await goHome(page)
    await expect(page).toHaveURL('/')
    await expect(page.locator('text=HEY')).toBeVisible()
  })
})

// ---------- テスト 2: Soccer ホットスポット → SceneCard ----------
// Soccer カメラ: position[0,2,6] fov52 lookAt[0,-0.2,-20]
// 座標は透視投影で計算した実測値（球体直下 +15px）

test.describe('Soccer ホットスポット', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(COLD_LOAD)
    await goScene(page, '/soccer')
  })

  test('webapp ホットスポットをクリックすると SceneCard が表示される', async ({ page }) => {
    // webapp [-3.5, -1.2, -5.0] → canvas 座標 (390, 575)
    await clickCanvas(page, 390, 575)
    await waitSceneCard(page)
    await expect(page.locator('[data-testid="scene-card"]')).toHaveAttribute('data-visible', 'true')
  })

  test('game ホットスポットをクリックすると SceneCard が表示される', async ({ page }) => {
    // game [3.5, -1.2, -7.0] → canvas 座標 (845, 520)
    await clickCanvas(page, 845, 520)
    await waitSceneCard(page)
    await expect(page.locator('[data-testid="scene-card"]')).toHaveAttribute('data-visible', 'true')
  })
})

// ---------- テスト 3: Basketball ホットスポット → SceneCard ----------
// Basketball カメラ: position[0,3.2,8] fov55 lookAt[0,0.6,-7.5]
// canvas 座標クリックが安定しないため __e2eSetHotspot ヘルパーを使用

test.describe('Basketball ホットスポット', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(COLD_LOAD)
    await goScene(page, '/basketball')
  })

  test('frontend ホットスポットを起動すると SceneCard が表示される', async ({ page }) => {
    await activateHotspot(page, 'frontend')
    await waitSceneCard(page)
    await expect(page.locator('[data-testid="scene-card"]')).toHaveAttribute('data-visible', 'true')
  })

  test('backend ホットスポットを起動すると SceneCard が表示される', async ({ page }) => {
    await activateHotspot(page, 'backend')
    await waitSceneCard(page)
    await expect(page.locator('[data-testid="scene-card"]')).toHaveAttribute('data-visible', 'true')
  })
})

// ---------- テスト 4: Volleyball ホットスポット → SceneCard ----------
// Volleyball カメラ: position[0,2.0,4.4] fov58 lookAt[0,0.3,-3]
// 座標は透視投影で計算（球体直下 +12px）

test.describe('Volleyball ホットスポット', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(COLD_LOAD)
    await goScene(page, '/volleyball')
  })

  test('background ホットスポットをクリックすると SceneCard が表示される', async ({ page }) => {
    // background [2.5, -1.2, -0.5] → canvas 座標 (968, 678)
    await clickCanvas(page, 968, 678)
    await waitSceneCard(page)
    await expect(page.locator('[data-testid="scene-card"]')).toHaveAttribute('data-visible', 'true')
  })

  test('style ホットスポットをクリックすると SceneCard が表示される', async ({ page }) => {
    // style [-2.5, -1.2, -0.5] → canvas 座標 (312, 678)
    await clickCanvas(page, 312, 678)
    await waitSceneCard(page)
    await expect(page.locator('[data-testid="scene-card"]')).toHaveAttribute('data-visible', 'true')
  })
})

// ---------- テスト 5: finale 動線（Soccer） ----------
// 全 4 ホットスポット訪問後に finale を踏んで /basketball へ自動遷移

test.describe('finale 動線', () => {
  test('Soccer の全ホットスポット訪問後に finale が出現し Basketball へ遷移する', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(COLD_LOAD)
    await goScene(page, '/soccer')

    // 4 ホットスポットをヘルパーで確実に訪問済みにする（showFinale=true になる）
    await activateHotspot(page, 'webapp')
    await activateHotspot(page, 'game')
    await activateHotspot(page, 'website')
    await activateHotspot(page, 'tool')

    // finale ホットスポットを直接起動 → showFinale=true & activeHotspotId='finale' → useEffect が warpNavigate を呼ぶ
    await activateHotspot(page, 'finale')

    // warpNavigate が発火（1600ms 後）→ React Router で /basketball へ遷移
    await page.waitForURL('/basketball', { timeout: 15_000 })
    await expect(page).toHaveURL('/basketball')
  })
})

// ---------- テスト 6: 375px モバイル viewport ----------

test.describe('375px モバイル — 全シーン確認', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')
    await page.waitForTimeout(COLD_LOAD)
  })

  test('Home が表示される', async ({ page }) => {
    await expect(page.locator('text=HEY')).toBeVisible()
    await expect(page).toHaveURL('/')
  })

  test('Soccer シーンへ遷移できる', async ({ page }) => {
    await page.locator('a[href="/soccer"]').first().click({ force: true })
    await page.waitForTimeout(SCENE_WAIT)
    await expect(page).toHaveURL('/soccer')
    await expect(page.locator('[data-scene-ui]')).toBeVisible()
  })

  test('Basketball シーンへ遷移できる', async ({ page }) => {
    await page.locator('a[href="/basketball"]').first().click({ force: true })
    await page.waitForTimeout(SCENE_WAIT)
    await expect(page).toHaveURL('/basketball')
    await expect(page.locator('[data-scene-ui]')).toBeVisible()
  })

  test('Volleyball シーンへ遷移できる', async ({ page }) => {
    await page.locator('a[href="/volleyball"]').first().click({ force: true })
    await page.waitForTimeout(SCENE_WAIT)
    await expect(page).toHaveURL('/volleyball')
    await expect(page.locator('[data-scene-ui]')).toBeVisible()
  })

  test('Contact シーンへ遷移できる', async ({ page }) => {
    await page.locator('a[href="/contact"]').first().click({ force: true })
    await page.waitForTimeout(SCENE_WAIT)
    await expect(page).toHaveURL('/contact')
    await expect(page.locator('text=Email')).toBeVisible()
  })
})
