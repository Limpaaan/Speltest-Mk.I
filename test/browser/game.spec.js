import { test, expect } from '@playwright/test';
test('offline play, combat controls, inventory, save and pause work without errors', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('SKIFTET');
  await page.screenshot({ path: '.local/menu.png' });
  await page.getByRole('button', { name: 'Kopparslagare' }).click();
  await page.locator('#play-offline').click();
  await expect(page.locator('#hud')).toBeVisible();
  await expect(page.locator('#player-class')).toHaveText('KOPPARSLAGARE');
  await page.keyboard.press('q');
  await expect(page.locator('#ability-cooldown')).not.toHaveText('REDO');
  await page.keyboard.down('s');
  await expect(page.locator('#zone')).not.toContainText('SKYDDAD');
  await page.keyboard.up('s');
  await page.mouse.move(900, 600);
  await page.mouse.down();
  await page.waitForTimeout(500);
  await page.mouse.up();
  await expect(page.locator('#ammo')).not.toHaveText('24');
  await page.keyboard.press('r');
  await expect(page.locator('#ammo')).toHaveText('↻');
  await page.keyboard.press('i');
  await expect(page.locator('#inventory-dialog')).toBeVisible();
  await expect(page.getByRole('button', { name: 'UTRUSTAD', exact: true })).toBeDisabled();
  await page.keyboard.press('i');
  await expect(page.locator('#inventory-dialog')).not.toBeVisible();
  await page.keyboard.press('m');
  await expect(page.locator('.map-panel')).toHaveClass(/expanded/);
  await page.keyboard.press('m');
  await page.screenshot({ path: '.local/game.png' });
  await page.keyboard.press('Escape');
  await expect(page.locator('#pause-dialog')).toBeVisible();
  await page.locator('#leave').click();
  const save = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('avesta-save-v1-kopparslagare')),
  );
  expect(save.classId).toBe('kopparslagare');
  expect(save.inventory).toHaveLength(1);
  await page.reload();
  await page.getByRole('button', { name: 'Kopparslagare' }).click();
  await page.locator('#play-offline').click();
  await expect(page.locator('#player-class')).toHaveText('KOPPARSLAGARE');
  expect(errors).toEqual([]);
});
test('two browser clients join the same room and see the shared player count', async ({
  browser,
}) => {
  const context = await browser.newContext();
  const a = await context.newPage(),
    b = await context.newPage();
  for (const page of [a, b]) {
    await page.goto('/');
    await page.locator('#room-code').fill('BROWSER');
    await page.locator('#play-online').click();
  }
  await expect(a.locator('#session')).toContainText('2 AV 8');
  await expect(b.locator('#session')).toContainText('2 AV 8');
  await a.keyboard.press('Escape');
  await a.locator('#pvp-toggle').click();
  await expect(a.locator('#pvp-toggle')).toHaveText('AVAKTIVERA PVP');
  await a.locator('#leave').click();
  await expect(b.locator('#session')).toContainText('1 AV 8');
  await context.close();
});
test('production client reloads and plays with network disabled after caching', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise((resolve) =>
        navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }),
      );
  });
  await context.setOffline(true);
  await page.reload();
  await page.locator('#play-offline').click();
  await expect(page.locator('#session')).toContainText('OFFLINE');
  await page.keyboard.press('q');
  await expect(page.locator('#ability-cooldown')).not.toHaveText('REDO');
});
