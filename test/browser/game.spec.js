import { test, expect } from '@playwright/test';
async function capture(page) {
  if (!(await page.evaluate(() => Boolean(document.pointerLockElement))))
    await page.locator('#capture-mouse').click();
  await expect.poll(() => page.evaluate(() => document.pointerLockElement?.id)).toBe('scene');
}
test('FPS mouse capture, look, sprint, crouch, ADS shooting, inventory and pause work', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.screenshot({ path: '.local/menu.png' });
  await page.getByRole('button', { name: 'Kopparslagare' }).click();
  await page.locator('#player-name').fill('Dalkulla');
  await page.locator('#play-offline').click();
  await capture(page);
  await expect(page.locator('#player-class')).toHaveText('KOPPARSLAGARE');
  const heading = await page.locator('#compass').textContent();
  await page.mouse.move(800, 480);
  await page.mouse.move(820, 480);
  await expect(page.locator('#compass')).not.toHaveText(heading);
  await page.keyboard.press('c');
  await expect(page.locator('#stance')).toHaveText('HUKANDE');
  await page.keyboard.press('c');
  await page.keyboard.down('Shift');
  await page.keyboard.down('s');
  await expect(page.locator('#zone')).not.toContainText('SKYDDAD', { timeout: 20000 });
  await page.keyboard.up('s');
  await page.keyboard.up('Shift');
  await page.keyboard.press('q');
  await expect(page.locator('#ability-cooldown')).not.toHaveText('REDO');
  await page.mouse.down({ button: 'right' });
  await expect(page.locator('body')).toHaveClass(/aiming/);
  await page.mouse.down();
  await expect(page.locator('#ammo')).not.toHaveText('24');
  await page.mouse.up();
  await page.mouse.up({ button: 'right' });
  await page.keyboard.press('r');
  await expect(page.locator('#ammo')).toHaveText('↻');
  await page.keyboard.press('i');
  await expect(page.locator('#inventory-dialog')).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.pointerLockElement)).toBeNull();
  await page.keyboard.press('i');
  await capture(page);
  await page.keyboard.press('m');
  await expect(page.locator('.map-panel')).toHaveClass(/expanded/);
  await page.keyboard.press('m');
  await page.screenshot({ path: '.local/fps.png' });
  await page.keyboard.press('Escape');
  await expect(page.locator('#pause-dialog')).toBeVisible();
  await page.locator('#leave').click();
  const save = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('avesta-save-v1-kopparslagare')),
  );
  expect(save.classId).toBe('kopparslagare');
  expect(errors).toEqual([]);
});
test('two browser clients join the same room and see the shared player count', async ({
  browser,
}) => {
  const context = await browser.newContext();
  const a = await context.newPage(),
    b = await context.newPage();
  for (const [page, name] of [
    [a, 'AdminL'],
    [b, 'Andre'],
  ]) {
    await page.goto('/');
    await page.locator('#player-name').fill(name);
    await page.locator('#room-code').fill('BROWSER');
    await page.locator('#play-online').click();
  }
  await expect(a.locator('#session')).toContainText('2 AV 8');
  await expect(b.locator('#session')).toContainText('2 AV 8');
  await a.keyboard.press('F2');
  await expect(a.locator('#admin-dialog')).toBeVisible();
  await a.locator('#admin-target').selectOption({ label: 'Andre' });
  await a.locator('#admin-level').fill('5');
  await a.locator('#admin-stats-form button').click();
  await expect(a.locator('#admin-status')).toContainText('uppdaterats');
  await expect(b.locator('#level')).toHaveText('NIVÅ 5');
  await expect(a.locator('#level')).toHaveText('NIVÅ 1');
  await a.locator('#admin-dialog .close-dialog').click();
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
  await page.locator('#player-name').fill('Dalkulla');
  await page.locator('#play-offline').click();
  await expect(page.locator('#session')).toContainText('OFFLINE');
  await capture(page);
  await page.keyboard.press('q');
  await expect(page.locator('#ability-cooldown')).not.toHaveText('REDO');
});

test('mandatory username and AdminL tools create loot and edit level offline', async ({ page }) => {
  await page.goto('/');
  await page.locator('#play-offline').click();
  await expect(page.locator('#player-name')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#menu')).toBeVisible();
  await page.locator('#player-name').fill('AdminL');
  await page.locator('#play-offline').click();
  await page.keyboard.press('F2');
  await expect(page.locator('#admin-dialog')).toBeVisible();
  await page.locator('#admin-level').fill('10');
  await page.locator('#admin-stats-form button').click();
  await expect(page.locator('#level')).toHaveText('NIVÅ 10');
  await page.locator('#admin-item-kind').selectOption('scout');
  await page.locator('#admin-item-rarity').selectOption('3');
  await page.locator('#admin-item-form button').click();
  await expect(page.locator('#admin-status')).toContainText('Legendarisk');
  await page.locator('#admin-dialog .close-dialog').click();
  await page.keyboard.press('i');
  await expect(page.locator('#inventory-items')).toContainText('Dalälvens öga');
});
