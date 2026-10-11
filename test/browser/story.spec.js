import { test, expect } from '@playwright/test';

test('journal continues a legacy campaign, avoids future spoilers and class tactics work through real controls', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto('/');
  await page.evaluate(() =>
    localStorage.setItem(
      'avesta-save-v1-faltvardare',
      JSON.stringify({
        version: 1,
        classId: 'faltvardare',
        level: 10,
        points: 9,
        campaign: { step: 3, active: false },
      }),
    ),
  );
  await page.locator('[data-class-id="faltvardare"]').click();
  await page.locator('#player-name').fill('Skiftläsaren');
  await page.locator('#play-offline').click();
  await page.keyboard.press('j');
  await expect(page.locator('#journal-dialog')).toBeVisible();
  await expect(page.locator('#journal-content summary')).toHaveCount(4);
  await expect(page.locator('#journal-content')).toContainText('Det som aldrig digitaliserades');
  await expect(page.locator('#journal-content')).not.toContainText('Jag heter Signe');
  await page.screenshot({ path: '.local/story-journal.png' });
  await page.locator('#journal-dialog .close-dialog').click();
  if (!(await page.evaluate(() => Boolean(document.pointerLockElement))))
    await page.locator('#capture-mouse').click();
  await page.keyboard.press('e');
  await expect(page.locator('#contract-title')).toHaveText('Det som aldrig digitaliserades');
  await page.locator('#contract-action').click();
  await expect(page.locator('#contract-action')).toHaveText('UPPDRAGET PÅGÅR');
  await page.locator('#camp-dialog .close-dialog').click();
  await page.keyboard.press('i');
  const panel = page.locator('#equipment-panel');
  for (const name of ['Fältvana', 'Rena förband', 'Triage']) {
    await panel
      .locator('.equipment-row')
      .filter({ has: page.locator('p', { hasText: new RegExp('^' + name + ' ·') }) })
      .getByRole('button', { name: 'LÅS UPP', exact: true })
      .click();
  }
  await page.locator('#inventory-dialog .close-dialog').click();
  if (!(await page.evaluate(() => Boolean(document.pointerLockElement))))
    await page.locator('#capture-mouse').click();
  await page.keyboard.press('x');
  await expect(page.locator('#notification')).toHaveText('Triage!');
  await expect(page.locator('#ability-cooldown')).toContainText('X Triage');
  await page.keyboard.press('Escape');
  await page.locator('#leave').click();
  const save = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('avesta-save-v1-faltvardare')),
  );
  expect(save.campaign).toMatchObject({ step: 3, active: true });
  expect(save.skills).toEqual(['fieldcraft', 'sterile', 'class_utility']);
  await page.reload();
  await page.locator('[data-class-id="faltvardare"]').click();
  await page.locator('#player-name').fill('Skiftläsaren');
  await page.locator('#play-offline').click();
  await expect(page.locator('#campaign-progress')).toContainText('Arkivets driftjournal');
  await expect(page.locator('#ability-cooldown')).toContainText('X Triage REDO');
  expect(errors).toEqual([]);
});
