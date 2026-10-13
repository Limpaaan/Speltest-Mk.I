import { test, expect } from '@playwright/test';
async function capture(page) {
  if (!(await page.evaluate(() => Boolean(document.pointerLockElement))))
    await page.locator('#capture-mouse').click();
  await expect.poll(() => page.evaluate(() => document.pointerLockElement?.id)).toBe('scene');
}
test('trade, craft, mount and class talent choices survive an offline restart', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.evaluate(() =>
    localStorage.setItem(
      'avesta-save-v1-stalvakt',
      JSON.stringify({
        version: 1,
        classId: 'stalvakt',
        level: 8,
        points: 7,
        credits: 500,
        materials: { electronics: 2, plastic: 3, glass: 1 },
        attachments: { scope_4: 1, extended_mag: 1 },
      }),
    ),
  );
  await page.locator('#player-name').fill('Vapensmeden');
  await page.locator('#play-offline').click();
  await capture(page);
  await page.keyboard.press('e');
  const market = page.locator('#camp-market');
  await market.getByText('Vapendelar', { exact: true }).click();
  await market
    .locator('.equipment-row')
    .filter({ hasText: 'Brukslampa' })
    .getByRole('button', { name: 'TILLVERKA', exact: true })
    .click();
  await expect(page.locator('#camp-message')).toContainText('Brukslampa: tillverkad');
  await market.getByText('Råmaterial', { exact: true }).click();
  await market
    .locator('.equipment-row')
    .filter({ hasText: /^Järn ·/ })
    .getByRole('button', { name: 'KÖP', exact: true })
    .click();
  await expect(market.locator('h3')).toContainText('492 brukskronor');
  await page.locator('#camp-dialog .close-dialog').click();
  await page.keyboard.press('i');
  const panel = page.locator('#equipment-panel');
  for (const name of ['Brukslampa', 'Större magasin', 'Kikarsikte 4×'])
    await panel
      .locator('.equipment-row')
      .filter({ hasText: name })
      .getByRole('button', { name: 'MONTERA', exact: true })
      .click();
  for (const name of ['Fältvana', 'Bastion', 'Dalarnas mästare'])
    await panel
      .locator('.equipment-row')
      .filter({ has: page.locator('p', { hasText: new RegExp('^' + name + ' ·') }) })
      .getByRole('button', { name: 'LÅS UPP', exact: true })
      .click();
  await expect(
    panel
      .locator('.equipment-row')
      .filter({ hasText: /^Stålsalva ·/ })
      .getByRole('button'),
  ).toBeDisabled();
  await page.screenshot({ path: '.local/equipment-talents.png' });
  await page.locator('#inventory-dialog .close-dialog').click();
  await capture(page);
  await page.keyboard.press('r');
  await expect(page.locator('#ammo-max')).toHaveText('/ 36', { timeout: 10000 });
  await page.keyboard.press('l');
  await page.keyboard.press('z');
  await expect(page.locator('#ability-cooldown')).toContainText('Bastion');
  await page.mouse.down({ button: 'right' });
  await expect(page.locator('#scope-overlay')).toHaveClass(/visible/);
  await page.screenshot({ path: '.local/attachment-scope.png' });
  await page.mouse.up({ button: 'right' });
  await page.keyboard.press('Escape');
  await page.locator('#leave').click();
  const save = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('avesta-save-v1-stalvakt')),
  );
  expect(save.credits).toBe(492);
  expect(save.materials.iron).toBe(1);
  expect(save.inventory[0].mods).toEqual({
    utility: 'flashlight',
    magazine: 'extended_mag',
    optic: 'scope_4',
  });
  expect(save.skills).toEqual(['fieldcraft', 'support_ability', 'mastery']);
  await page.reload();
  await page.locator('#player-name').fill('Vapensmeden');
  await page.locator('#play-offline').click();
  await page.keyboard.press('i');
  await expect(page.locator('#inventory-wallet [data-resource=credits] strong')).toHaveText('492');
  await expect(
    panel.getByRole('button', { name: 'Optik: Kikarsikte 4× · DEMONTERA' }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('a multiplayer player walks through Aalto entrance and retrieves the archive', async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // Observe the public network messages, while all movement and interaction use real controls.
  await page.addInitScript(() => {
    window.WebSocket = new Proxy(window.WebSocket, {
      construct(Target, args) {
        const ws = new Target(...args);
        ws.addEventListener('message', (e) => {
          try {
            const m = JSON.parse(e.data);
            if (m.type === 'welcome') window.observedPlayerId = m.id;
            if (m.type === 'state') window.observedState = m.state;
          } catch {}
        });
        return ws;
      },
    });
  });
  await page.goto('/');
  await page.locator('#player-name').fill('Arkivletaren');
  await page.locator('#room-code').fill('ARKIVTEST');
  await page.locator('#play-online').click();
  await expect(page.locator('#hud')).toBeVisible();
  await capture(page);
  const pos = () => page.evaluate(() => window.observedState?.players[window.observedPlayerId]);
  await expect.poll(async () => Boolean(await pos())).toBe(true);
  const start = await pos(),
    cx = start.x - 22,
    cz = start.z - 10;
  async function walk(axis, target) {
    const p = await pos(),
      direction = target > p[axis] ? 1 : -1,
      key = axis === 'x' ? (direction > 0 ? 'd' : 'a') : direction > 0 ? 's' : 'w';
    await page.keyboard.down(key);
    await page.waitForFunction(
      ({ axis, target, direction }) => {
        const p = window.observedState?.players[window.observedPlayerId];
        return p && (p[axis] - target) * direction >= -0.2;
      },
      { axis, target, direction },
      { timeout: 30000, polling: 50 },
    );
    await page.keyboard.up(key);
  }
  await walk('z', cz + 3.5);
  await walk('x', cx + 4);
  await walk('z', cz + 1);
  await walk('x', cx - 9);
  await walk('z', cz - 3.5);
  await expect(page.locator('#interact')).toContainText('Arkivskåp');
  await page.screenshot({ path: '.local/aalto-interior.png' });
  await page.keyboard.press('e');
  await expect(page.locator('#notification')).toContainText('Evakueringsplan hittad');
  await expect.poll(async () => (await pos()).archiveQuest).toBe(1);
  expect(errors).toEqual([]);
});

test('paint controls choose a colour and motif, render a spray and preserve it offline', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.evaluate(() =>
    localStorage.setItem(
      'avesta-save-v1-stalvakt',
      JSON.stringify({ version: 1, classId: 'stalvakt', paint: { blue: 2 } }),
    ),
  );
  await page.locator('#player-name').fill('Färgsättaren');
  await page.locator('#play-offline').click();
  await page.keyboard.press('i');
  await page
    .locator('#equipment-panel')
    .getByRole('button', { name: 'Dalablå ×2', exact: true })
    .click();
  await page
    .locator('#equipment-panel')
    .getByRole('button', { name: 'Glass', exact: true })
    .click();
  await page.locator('#inventory-dialog .close-dialog').click();
  await capture(page);
  await page.keyboard.press('b');
  await expect(page.locator('#notification')).toContainText('Glass i dalablå');
  await page.mouse.move(720, 850);
  await page.screenshot({ path: '.local/spray-art.png' });
  await page.keyboard.press('Escape');
  await page.locator('#leave').click();
  const save = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('avesta-save-v1-stalvakt')),
  );
  expect(save.paint.blue).toBe(1);
  expect(save.paintings).toHaveLength(1);
  expect(save.paintings[0].motif).toBe('icecream');
  await page.reload();
  await page.locator('#player-name').fill('Färgsättaren');
  await page.locator('#play-offline').click();
  await page.keyboard.press('i');
  await expect(
    page.locator('#equipment-panel').getByRole('button', { name: '✓ Dalablå ×1', exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
