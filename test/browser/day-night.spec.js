import { test, expect } from '@playwright/test';

test('profession background keeps the class identity and the offline night clock survives a reload', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.locator('[data-class-id="faltvardare"]').click();
  await expect(page.locator('#class-detail')).toContainText('Sjuksköterska');
  await page.evaluate(() =>
    localStorage.setItem(
      'avesta-save-v1-faltvardare',
      JSON.stringify({ version: 1, classId: 'faltvardare', dayTime: 1300 }),
    ),
  );
  await page.locator('#player-name').fill('Nattskiftet');
  await page.locator('#play-offline').click();
  await expect(page.locator('#player-class')).toContainText('FÄLTVÅRDARE');
  await expect(page.locator('#compass')).toContainText('23:');
  await page.keyboard.press('Escape');
  await page.locator('#leave').click();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('avesta-save-v1-faltvardare')),
  );
  expect(saved.dayTime).toBeGreaterThanOrEqual(1300);
  expect(saved.dayTime).toBeLessThan(1320);
  await page.reload();
  await page.locator('[data-class-id="faltvardare"]').click();
  await page.locator('#player-name').fill('Nattskiftet');
  await page.locator('#play-offline').click();
  await expect(page.locator('#compass')).toContainText('23:');
  expect(errors).toEqual([]);
});
