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
  await expect(page.locator('#ammo')).toHaveText('5');
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

test('Maja offers a contract and workshop purchases survive offline reload', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.evaluate(() =>
    localStorage.setItem(
      'avesta-save-v1-stalvakt',
      JSON.stringify({ version: 1, classId: 'stalvakt', level: 2, scrap: 200 }),
    ),
  );
  await page.locator('#player-name').fill('Verkstadsbesökare');
  await page.locator('#play-offline').click();
  await capture(page);
  await page.keyboard.press('e');
  await expect(page.locator('#camp-dialog')).toBeVisible();
  await expect(page.locator('#contract-title')).toHaveText('Bud till Koppardalen');
  await page.locator('#contract-action').click();
  await expect(page.locator('#contract-action')).toHaveText('UPPDRAGET PÅGÅR');
  await page.locator('#craft-rifle').click();
  await expect(page.locator('#camp-message')).toContainText('tillverkad');
  await page.locator('#upgrade-armor').click();
  await expect(page.locator('#workshop-stats')).toContainText('100 skrot · Rustning 1/3');
  await page.screenshot({ path: '.local/workshop.png' });
  await page.locator('#camp-dialog .close-dialog').click();
  await page.keyboard.press('Escape');
  await page.locator('#leave').click();
  await page.reload();
  await page.locator('#player-name').fill('Verkstadsbesökare');
  await page.locator('#play-offline').click();
  await capture(page);
  await page.keyboard.press('e');
  await expect(page.locator('#workshop-stats')).toContainText('100 skrot · Rustning 1/3');
  await expect(page.locator('#contract-action')).toHaveText('UPPDRAGET PÅGÅR');
  expect(errors).toEqual([]);
});

test('settings persist, six classes are selectable and the scoped rifle opens its reticle', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('.class-card')).toHaveCount(6);
  await page.locator('#settings-menu').click();
  await page.locator('#setting-sensitivity').fill('1.7');
  await page.locator('#setting-crosshair').selectOption('dot');
  await page.locator('#setting-weaponBob').uncheck();
  await page.locator('#settings-dialog .close-dialog').click();
  await page.reload();
  await page.locator('#settings-menu').click();
  await expect(page.locator('#setting-sensitivity')).toHaveValue('1.7');
  await expect(page.locator('#setting-weaponBob')).not.toBeChecked();
  await page.locator('#settings-dialog .close-dialog').click();
  await page.locator('[data-class-id=skogsvandrare]').click();
  await page.locator('#player-name').fill('Optikprov');
  await page.locator('#play-offline').click();
  await capture(page);
  await expect(page.locator('#weapon-name')).toContainText('m/96');
  await expect(page.locator('#crosshair')).toHaveText('•');
  await page.mouse.down({ button: 'right' });
  await expect(page.locator('#scope-overlay')).toHaveClass('visible');
  await page.screenshot({ path: '.local/scope.png' });
  await page.mouse.up({ button: 'right' });
  await expect(page.locator('#scope-overlay')).not.toHaveClass('visible');
  await page.keyboard.press('Escape');
  await page.locator('#settings-pause').click();
  await expect(page.locator('#settings-dialog')).toBeVisible();
  await page.locator('#settings-reset').click();
  await expect(page.locator('#setting-sensitivity')).toHaveValue('1');
  expect(errors).toEqual([]);
});

test('all firearm models equip and aim without client errors', async ({ page }) => {
  test.setTimeout(120000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.evaluate(() =>
    localStorage.setItem(
      'avesta-save-v1-stalvakt',
      JSON.stringify({
        version: 1,
        classId: 'stalvakt',
        inventory: ['rifle', 'pistol', 'smg', 'lmg', 'shotgun'].map((kind) => ({
          id: kind,
          kind,
          rarity: 0,
          level: 1,
        })),
        equipped: 'rifle',
      }),
    ),
  );
  await page.locator('#player-name').fill('Vapenprov');
  await page.locator('#play-offline').click();
  for (const name of ['Bergslagspistolen', 'Kopparsprutan', 'Stålregnet', 'Slaggkastaren']) {
    await page.keyboard.press('i');
    await page
      .locator('.inventory-item')
      .filter({ hasText: name })
      .getByRole('button', { name: 'UTRUSTA', exact: true })
      .click();
    await page.locator('#inventory-dialog .close-dialog').click();
    await capture(page);
    await expect(page.locator('#weapon-name')).toContainText(name);
    await expect(page.locator('#ammo')).not.toHaveText('↻', { timeout: 10000 });
    await page.mouse.down({ button: 'right' });
    await expect(page.locator('body')).toHaveClass(/aiming/);
    await page.screenshot({ path: `.local/weapon-${name}.png` });
    await page.mouse.up({ button: 'right' });
  }
  expect(errors).toEqual([]);
});

test('Torsten can be reached on foot and supplies grenades through his dialogue', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() =>
    localStorage.setItem(
      'avesta-save-v1-stalvakt',
      JSON.stringify({ version: 1, classId: 'stalvakt', scrap: 40, grenades: 0 }),
    ),
  );
  await page.locator('#player-name').fill('Bruksbesökare');
  await page.locator('#play-offline').click();
  await capture(page);
  await page.keyboard.down('d');
  await expect(page.locator('#interact')).toContainText('Torsten', { timeout: 20000 });
  await page.keyboard.up('d');
  await page.keyboard.press('e');
  await expect(page.locator('#npc-dialog')).toBeVisible();
  await expect(page.locator('#npc-name')).toContainText('Torsten');
  await page.locator('#npc-service').click();
  await expect(page.locator('#npc-message')).toContainText('påfyllda');
  await expect(page.locator('#grenade-count')).toContainText('× 3');
  await page.screenshot({ path: '.local/npc.png' });
});
