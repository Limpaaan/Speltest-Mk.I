import { test, expect } from '@playwright/test';
import { aaltoWorld, INTERIOR_CACHES } from '../../shared/interiors.js';
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
  test.setTimeout(360000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 960, height: 640 });
  // Observe public traffic and DOM input; movement still uses real controls.
  await page.addInitScript(() => {
    window.observedInputs = [];
    window.observedKeys = [];
    for (const type of ['keydown', 'keyup'])
      window.addEventListener(type, (e) => {
        window.observedKeys.push({ type, key: e.key, target: e.target.tagName });
        window.observedKeys = window.observedKeys.slice(-20);
      });
    window.WebSocket = new Proxy(window.WebSocket, {
      construct(Target, args) {
        const ws = new Target(...args),
          send = ws.send.bind(ws);
        ws.send = function (data) {
          try {
            const m = JSON.parse(data);
            if (m.type === 'input') {
              const previous = window.observedInputs.at(-1);
              if (
                !previous ||
                previous.x !== m.input.x ||
                previous.z !== m.input.z ||
                previous.aim !== m.input.aim
              )
                window.observedInputs.push({ ...m.input, t: performance.now() });
              window.observedInputs = window.observedInputs.slice(-12);
            }
          } catch {}
          return send(data);
        };
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
  async function walkTo(target) {
    const deadline = Date.now() + 120000,
      history = [];
    for (;;) {
      const p = await pos(),
        dx = target.x - p.x,
        dz = target.z - p.z,
        distance = Math.hypot(dx, dz);
      if (distance < 0.9) return;
      if (Date.now() > deadline) {
        const observed = await page.evaluate(() => ({
          inputs: window.observedInputs,
          keys: window.observedKeys,
          locked: document.pointerLockElement?.id,
          dialogs: [...document.querySelectorAll('dialog[open]')].map((d) => d.id),
          hidden: document.hidden,
        }));
        throw Error(
          JSON.stringify({
            target,
            position: { x: p.x, z: p.z, aim: p.aim, hp: p.hp },
            history,
            observed,
          }),
        );
      }
      // WASD is camera-relative. Observe authoritative aim instead of assuming
      // that pointer-lock acquisition preserves an identical heading on every OS.
      const forward = dx * Math.sin(p.aim) + dz * Math.cos(p.aim),
        right = -dx * Math.cos(p.aim) + dz * Math.sin(p.aim),
        keys = [];
      if (Math.abs(forward) > distance * 0.38) keys.push(forward > 0 ? 'w' : 's');
      if (Math.abs(right) > distance * 0.38) keys.push(right > 0 ? 'd' : 'a');
      history.push({ keys: [...keys], x: p.x, z: p.z, aim: p.aim, dx, dz });
      if (history.length > 6) history.shift();
      try {
        for (const key of keys) await page.keyboard.down(key);
        await page.waitForTimeout(500);
      } finally {
        for (const key of keys) await page.keyboard.up(key);
      }
      const releasedAt = await page.evaluate(() => window.observedState.time);
      await page.waitForFunction((time) => window.observedState?.time > time + 0.4, releasedAt, {
        timeout: 10000,
        polling: 50,
      });
    }
  }
  const route = [aaltoWorld(14, 3.5), aaltoWorld(4, 3.5), aaltoWorld(4, 1), aaltoWorld(-9, 1)];
  for (const point of route) await walkTo(point);
  const archive = INTERIOR_CACHES.find((c) => c.id === 'aalto-archive');
  await walkTo({ x: route.at(-1).x, z: archive.z + 0.5 });
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
