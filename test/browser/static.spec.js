import { test, expect } from '@playwright/test';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
test('a repository subpath caches and starts solo with the network disabled', async ({
  browser,
}) => {
  const prefix = '/Speltest-Mk.I/';
  const server = http.createServer(async (req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const file = path.resolve('dist', pathname.slice(prefix.length) || 'index.html');
    if (!pathname.startsWith(prefix) || !file.startsWith(path.resolve('dist') + path.sep)) {
      res.writeHead(404);
      res.end();
      return;
    }
    try {
      const body = await readFile(file);
      res.writeHead(200, {
        'Content-Type':
          {
            '.html': 'text/html',
            '.js': 'text/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.svg': 'image/svg+xml',
            '.webmanifest': 'application/manifest+json',
          }[path.extname(file)] || 'text/plain',
      });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}${prefix}`);
    if (process.env.EXPECT_STATIC_SOLO === '1')
      await expect(page.locator('#play-online')).toBeDisabled();
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller)
        await new Promise((r) =>
          navigator.serviceWorker.addEventListener('controllerchange', r, { once: true }),
        );
    });
    await context.setOffline(true);
    await page.reload();
    await page.locator('#player-name').fill('Webbspelare');
    await page.locator('#play-offline').click();
    await expect(page.locator('#session')).toContainText('OFFLINE');
  } finally {
    await context.close();
    await new Promise((r) => server.close(r));
  }
});
