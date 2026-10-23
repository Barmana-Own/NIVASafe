import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(new URL('../frontend/package.json', import.meta.url));
const { chromium, expect } = require('@playwright/test');
const evidence = fileURLToPath(new URL('../.local/notification-cards-20261023-01/', import.meta.url));
fs.mkdirSync(evidence, { recursive: true });
const origin = 'http://127.0.0.1:5189';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const checks = [], errors = [], unexpectedRequests = [];
let activePage, syntheticApiRequests = 0;

function fixtures(locale) {
  return Array.from({ length: 8 }, (_, index) => ({
    id: `synthetic-notification-${index}`,
    title: index === 0 ? (locale === 'fa' ? 'هشدار ریسک بحرانی' : 'Critical risk alert') : index === 1 ? 'LongNotificationIdentifier'.repeat(8) : (locale === 'fa' ? `یادآوری اقدام اصلاحی ${index + 1}` : `Corrective action reminder ${index + 1}`),
    message: index === 2 ? '<img src=x onerror="alert(1)"> Synthetic text stays escaped.' : (locale === 'fa' ? 'وضعیت ارزیابی و موعد اقدام اصلاحی را بررسی کنید. ' : 'Review the assessment and corrective action deadline. ').repeat(index === 1 ? 6 : 1),
    createdAt: '2026-10-23T12:00:00.000Z',
    readAt: index === 3 || index === 6 ? '2026-10-23T12:01:00.000Z' : null,
    link: index === 2 ? 'https://example.invalid/unsafe' : '/actions',
  }));
}

try {
  for (const theme of ['white', 'blue']) for (const locale of ['fa', 'en']) for (const width of [320, 390, 768, 1024, 1280, 1920]) {
    const items = fixtures(locale), writes = [];
    const preferences = { emailEnabled: true, pushEnabled: false, riskAlerts: true, dueReminders: true };
    let failSummary = false, emptySummary = false;
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.hostname === 'fonts.googleapis.com') {
        await route.fulfill({ contentType: 'text/css', body: '@font-face{font-family:Vazirmatn;src:url("/qa/font-arabic.woff2") format("woff2");unicode-range:U+0600-06FF,U+200C-200F}@font-face{font-family:Vazirmatn;src:url("/qa/font-latin.woff2") format("woff2");unicode-range:U+0000-00FF}' });
      } else if (url.origin === origin && /^\/qa\/font-(arabic|latin)\.woff2$/.test(url.pathname)) {
        await route.fulfill({ contentType: 'font/woff2', path: fileURLToPath(new URL(`../frontend/tests/e2e/assets/vazirmatn-${url.pathname.includes('arabic') ? 'arabic' : 'latin'}.woff2`, import.meta.url)) });
      } else if (url.origin === origin && url.pathname.startsWith('/api/v1/')) {
        syntheticApiRequests++;
        const path = url.pathname.slice('/api/v1'.length), method = request.method();
        let data;
        if (path === '/notifications/summary' && method === 'GET') {
          assert.equal(url.searchParams.get('limit'), '100');
          if (failSummary) { await route.fulfill({ status: 503, json: { error: { code: 'SYNTHETIC_UNAVAILABLE', message: 'Synthetic temporary failure' } } }); return; }
          data = emptySummary ? { items: [], total: 0, unreadCount: 0 } : { items, total: items.length, unreadCount: items.filter(item => !item.readAt).length };
        } else if (path === '/notifications/preferences' && method === 'GET') data = preferences;
        else if (path === '/notifications/preferences' && method === 'PATCH') {
          writes.push({ path, method, body: request.postDataJSON() });
          Object.assign(preferences, request.postDataJSON()); data = preferences;
        } else if (/^\/notifications\/synthetic-notification-\d\/read$/.test(path) && method === 'PATCH') {
          const item = items.find(item => path === `/notifications/${item.id}/read`);
          assert(item); item.readAt = '2026-10-23T12:01:00.000Z'; writes.push({ path, method }); data = item;
        } else if (path === '/notifications/read-all' && method === 'POST') {
          items.forEach(item => { item.readAt = '2026-10-23T12:01:00.000Z'; }); writes.push({ path, method }); data = { count: items.length };
        } else {
          unexpectedRequests.push({ path, method }); await route.abort(); return;
        }
        await route.fulfill({ json: { data } });
      } else if (url.origin === origin && !url.pathname.startsWith('/api/')) await route.continue();
      else { unexpectedRequests.push({ origin: url.origin, path: url.pathname, method: request.method() }); await route.abort(); }
    });
    const page = await context.newPage(); activePage = page;
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${origin}/test-fixtures/notification-cards.html?locale=${locale}&theme=${theme}`);
    const cards = page.locator('.notification-list > .notification-card');
    await expect(cards).toHaveCount(8);
    await page.evaluate(async () => { await document.fonts.ready; });
    const layout = await page.locator('.notification-list').evaluate(list => {
      const rect = element => { const { x, y, width, height } = element.getBoundingClientRect(); return { x, y, width, height }; };
      const children = [...list.children];
      return {
        columns: getComputedStyle(list).gridTemplateColumns.split(' ').length,
        direction: getComputedStyle(list).direction,
        controlHeight: parseFloat(getComputedStyle(list).getPropertyValue('--icon-control-height')),
        boxes: children.map(rect), pageOverflow: document.documentElement.scrollWidth - innerWidth,
        overflowingChildren: children.flatMap(card => [...card.querySelectorAll('h3,p,small,a,button')].filter(child => {
          const childBounds = child.getBoundingClientRect(), cardBounds = card.getBoundingClientRect();
          return childBounds.x < cardBounds.x - 1 || childBounds.right > cardBounds.right + 1 || childBounds.bottom > cardBounds.bottom + 1;
        }).map(child => child.tagName)),
        buttons: children.flatMap(card => [...card.querySelectorAll('button')].map(rect)),
      };
    });
    const columns = width >= 1280 ? 4 : width >= 1024 ? 3 : width >= 640 ? 2 : 1;
    assert.equal(layout.columns, columns);
    assert.equal(layout.direction, locale === 'fa' ? 'rtl' : 'ltr');
    assert(layout.pageOverflow <= 1);
    assert.deepEqual(layout.overflowingChildren, []);
    assert(layout.controlHeight > 0);
    assert(layout.buttons.every(button => button.width >= layout.controlHeight && button.height >= layout.controlHeight));
    for (let index = 1; index < columns; index++) {
      assert(Math.abs(layout.boxes[index].y - layout.boxes[0].y) < 1);
      assert.equal(Math.sign(layout.boxes[index].x - layout.boxes[index - 1].x), locale === 'fa' ? -1 : 1);
    }
    assert(layout.boxes[columns].y >= layout.boxes[0].y + layout.boxes[0].height);
    for (let index = 0; index < items.length; index++) {
      await expect(cards.nth(index).locator('h3')).toHaveText(items[index].title);
      await expect(cards.nth(index).locator('p')).toHaveText(items[index].message);
      assert((await cards.nth(index).locator('small').textContent()).trim());
    }
    assert.equal(await cards.nth(2).locator('img,script,a').count(), 0);
    await expect(cards.first().getByRole('link')).toHaveAttribute('href', '/actions');
    await expect(page.locator('.preference-grid input[type="checkbox"]')).toHaveCount(4);
    await expect(page.locator('.notification-card.unread')).toHaveCount(6);
    if (locale === 'fa' && [390, 1920].includes(width)) await page.screenshot({ path: `${evidence}/${theme}-${width}.png`, fullPage: true });

    const markRead = cards.first().getByRole('button');
    await markRead.focus(); await expect(markRead).toBeFocused(); await markRead.press('Enter');
    await expect(cards.first()).toHaveClass(/\bread\b/);
    await expect(page.locator('.notification-card.unread')).toHaveCount(5);
    assert.equal(await cards.first().getByRole('button').count(), 0);
    await page.locator('.page-actions button').click();
    await expect(page.locator('.notification-card.unread')).toHaveCount(0);
    await expect(cards).toHaveCount(8);
    await page.locator('.preference-grid input').nth(1).click();
    await expect.poll(() => preferences.pushEnabled).toBe(true);
    await expect(page.locator('.preference-grid input').nth(1)).toBeChecked();
    assert.equal(writes.length, 3);
    assert.deepEqual(writes.map(write => write.method), ['PATCH', 'POST', 'PATCH']);

    if (width === 1920 && locale === 'fa' && theme === 'white') {
      emptySummary = true;
      await page.evaluate(() => dispatchEvent(new Event('nivasafe-notifications-changed')));
      await expect(cards).toHaveCount(0);
      await expect(page.locator('.empty-state')).toBeVisible();
      emptySummary = false; failSummary = true;
      await page.evaluate(() => dispatchEvent(new Event('nivasafe-notifications-changed')));
      await expect(page.locator('.error-state')).toBeVisible();
      failSummary = false;
      await page.locator('.error-state button').click();
      await expect(cards).toHaveCount(8);
    }
    checks.push({ theme, locale, width, columns, layout, contentPreserved: true, safeLinks: true, readOneAndAll: true, preferences: true });
    await context.close();
  }
  assert.deepEqual(errors, []); assert.deepEqual(unexpectedRequests, []);
  const result = { status: 'PASS', checks: checks.length, errors, unexpectedRequests, syntheticApiRequests, realApiRequests: 0, checksDetail: checks };
  fs.writeFileSync(`${evidence}/browser.json`, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ ...result, checksDetail: undefined }));
} catch (error) {
  await activePage?.screenshot({ path: `${evidence}/failure.png`, fullPage: true }).catch(() => undefined);
  fs.writeFileSync(`${evidence}/browser.json`, JSON.stringify({ status: 'FAIL', error: error.message, errors, unexpectedRequests, completed: checks }, null, 2) + '\n');
  throw error;
} finally { await browser.close(); }
