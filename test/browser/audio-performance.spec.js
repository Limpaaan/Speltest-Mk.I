import { test, expect } from '@playwright/test';
import { SPEECH } from '../../shared/speech.js';
test('GPU preference persists; recorded dialogue decodes, replays offline and obeys voice mute', async ({
  page,
  context,
}) => {
  test.setTimeout(150000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && /WebGLProgram|shader/i.test(m.text())) errors.push(m.text());
  });
  await page.addInitScript(() => {
    window.webglPreferences = [];
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, options) {
      if (kind === 'webgl2') window.webglPreferences.push(options?.powerPreference);
      return original.call(this, kind, options);
    };
  });
  await page.goto('/');
  await page.locator('#settings-menu').click();
  await page.locator('#setting-gpuPerformance').check();
  await expect(page.locator('#settings-gpu-restart')).toBeVisible();
  await page.locator('#settings-gpu-restart').click();
  await expect(page.locator('.edition')).toContainText('0.9');
  await expect
    .poll(() => page.evaluate(() => window.webglPreferences))
    .toContain('high-performance');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise((resolve) =>
        navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }),
      );
  });
  const clips = await page.evaluate(async (lines) => {
    const c = new AudioContext(),
      results = [];
    for (const line of lines) {
      const response = await fetch('audio/' + line.file);
      const buffer = await c.decodeAudioData(await response.arrayBuffer());
      const values = buffer.getChannelData(0);
      results.push({
        id: line.id,
        duration: buffer.duration,
        audible: values.some((x) => Math.abs(x) > 0.005),
      });
    }
    await c.close();
    return results;
  }, SPEECH);
  expect(clips).toHaveLength(41);
  expect(clips.every((c) => c.duration > 1 && c.audible)).toBe(true);
  await context.setOffline(true);
  await page.locator('#player-name').fill('Ljudprov');
  await page.locator('#play-offline').click();
  await expect(page.locator('body')).toHaveAttribute('data-audio', 'ready');
  if (!(await page.evaluate(() => Boolean(document.pointerLockElement))))
    await page.locator('#capture-mouse').click();
  await page.keyboard.press('e');
  await expect(page.locator('#camp-dialog')).toBeVisible();
  await expect(page.locator('#speech-caption')).toContainText('Maja:');
  await expect(page.locator('#camp-transcript')).toContainText('Jag tänkte stryka ditt namn');
  await expect.poll(() => page.locator('#camp-transcript .reading').count()).toBeGreaterThan(0);
  await page.locator('#camp-dialog .stop-voice').click();
  await expect(page.locator('#speech-caption')).toBeEmpty();
  await expect(page.locator('#camp-transcript')).toHaveAttribute('data-state', 'stopped');
  await page.locator('#quest-listen').click();
  await expect(page.locator('#speech-caption')).toContainText('Maja:');
  await page.locator('#camp-dialog .close-dialog').click();
  await page.keyboard.press('Escape');
  await page.locator('#settings-pause').click();
  await page.locator('#setting-voicesEnabled').uncheck();
  await page.locator('#settings-dialog .close-dialog').click();
  await page.locator('#resume').click();
  if (!(await page.evaluate(() => Boolean(document.pointerLockElement))))
    await page.locator('#capture-mouse').click();
  await page.keyboard.press('e');
  await page.locator('#quest-listen').click();
  await expect(page.locator('#speech-caption')).toBeEmpty();
  expect(errors).toEqual([]);
});
test('inventory icons show resources and NPC station cards provide a map guide', async ({
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
        credits: 73,
        scrap: 21,
        materials: { iron: 9, wood: 4 },
        supplies: { medkit: 2 },
      }),
    ),
  );
  await page.locator('#player-name').fill('Packningsprov');
  await page.locator('#play-offline').click();
  await expect(page.locator('#hud-wallet [data-resource=credits]')).toContainText('73');
  await page.keyboard.press('i');
  await expect(page.locator('.material-card')).toHaveCount(12);
  await expect(page.locator('[data-material=iron] strong')).toHaveText('9');
  await expect(page.locator('[data-material=iron] [data-icon=iron]')).toBeVisible();
  await expect(page.locator('#inventory-items [data-weapon=rifle]')).toContainText('UTRUSTAD');
  await page.locator('#inventory-dialog .close-dialog').click();
  await page.keyboard.press('j');
  await expect(page.locator('#journal-directory .station-card')).toHaveCount(5);
  await page.locator('#journal-directory [data-station=liv] button').click();
  await expect(page.locator('.map-panel')).toHaveClass(/expanded/);
  await expect(page.locator('#guide-hint')).toContainText('Liv · Sjukstugan');
  expect(errors).toEqual([]);
});
