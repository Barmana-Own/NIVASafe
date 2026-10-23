import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(new URL('../frontend/package.json', import.meta.url));
const { chromium, expect } = require('@playwright/test');
const evidence = fileURLToPath(new URL('../.local/support-ticket-cards-20261023-01/', import.meta.url));
fs.mkdirSync(evidence, { recursive: true });
const origin = 'http://127.0.0.1:5189';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const checks = [], errors = [], unexpectedRequests = [];
let activePage, syntheticApiRequests = 0;
const id = index => `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;
const now = '2026-10-23T12:00:00.000Z';

function fixtures(locale) {
  return Array.from({ length: 9 }, (_, index) => ({
    id: id(index), category: 'TECHNICAL_SUPPORT', priority: 'NORMAL', status: 'OPEN',
    subject: index === 1 ? 'LongTicketIdentifier'.repeat(6) : locale === 'fa' ? `درخواست پشتیبانی ${index + 1}` : `Support ticket ${index + 1}`,
    message: `${locale === 'fa' ? 'شرح کامل درخواست و مسئلهٔ کاربر' : 'Full customer request details'} ${index + 1}\n${'<img src=x onerror="alert(1)"> Text stays escaped.'}`,
    requester: { id: 'synthetic-requester', displayName: 'Synthetic requester', email: 'requester@example.invalid' },
    organization: { id: 'synthetic-support-org', nameFa: 'سازمان آزمون', nameEn: 'Synthetic organization' },
    assignedTo: null, createdAt: now, updatedAt: now,
    replies: [{ id: 'synthetic-public', message: 'Synthetic public support reply', visibility: 'PUBLIC', createdAt: now, author: { id: 'synthetic-staff', displayName: 'Synthetic support', globalRole: 'SUPER_ADMIN' } }, { id: 'synthetic-private', message: 'Synthetic internal staff note', visibility: 'INTERNAL', createdAt: now, author: { id: 'synthetic-staff', displayName: 'Synthetic support', globalRole: 'SUPER_ADMIN' } }],
  }));
}

async function settled(page) {
  await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
}

async function geometry(page) {
  return page.locator('.support-request-list').evaluate(list => {
    const rect = element => { const { x, y, width, height } = element.getBoundingClientRect(); return { x, y, width, height }; };
    return { columns: getComputedStyle(list).gridTemplateColumns.split(' ').length, bounds: rect(list), cards: [...list.children].map(rect), pageOverflow: document.documentElement.scrollWidth - innerWidth, direction: getComputedStyle(list).direction };
  });
}

try {
  for (const role of ['admin', 'customer']) for (const theme of ['white', 'blue']) for (const locale of ['fa', 'en']) for (const width of role === 'admin' ? [320, 390, 768, 1024, 1280, 1920] : [390, 1440]) {
    const items = fixtures(locale), writes = [], detailReads = [];
    let failDetails = false;
    const admin = role === 'admin', prefix = admin ? '/admin/support-requests' : '/support/requests';
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
        let data, meta;
        if (path === '/admin/support-staff' && admin && method === 'GET') data = [{ id: 'synthetic-staff', displayName: 'Synthetic support', email: 'staff@example.invalid' }];
        else if (path === prefix && method === 'GET') {
          const pageNumber = Number(url.searchParams.get('page') ?? 1), search = url.searchParams.get('search') ?? '';
          const filtered = items.filter(item => item.subject.includes(search));
          data = pageNumber === 1 ? filtered.slice(0, 8).map(({ replies, ...item }) => item) : filtered.slice(8).map(({ replies, ...item }) => item);
          meta = { page: pageNumber, limit: 20, total: search ? filtered.length : 21 };
        } else if (path.startsWith(prefix + '/')) {
          const [requestId, action] = path.slice(prefix.length + 1).split('/'), item = items.find(item => item.id === requestId);
          assert(item, 'Only synthetic fixture ticket identifiers are allowed');
          if (!action && method === 'GET') {
            detailReads.push(requestId);
            if (failDetails) { await route.fulfill({ status: 503, json: { error: { code: 'SYNTHETIC_UNAVAILABLE', message: 'Synthetic temporary detail failure' } } }); return; }
            data = item;
          } else if (method === 'POST' && (action === 'replies' || admin && action === 'internal-notes')) {
            const body = request.postDataJSON(), key = request.headers()['idempotency-key'];
            assert.match(key ?? '', /^[0-9a-f-]{36}$/i);
            writes.push({ requestId, action, body, hasIdempotencyKey: true });
            data = { id: `synthetic-added-${writes.length}`, message: body.message, visibility: action === 'internal-notes' ? 'INTERNAL' : 'PUBLIC', createdAt: now, author: { id: 'synthetic-user', displayName: 'Synthetic user', globalRole: admin ? 'SUPER_ADMIN' : 'USER' } };
            item.replies.push(data);
          } else if (!action && method === 'PATCH' && admin) {
            const body = request.postDataJSON(); assert.equal(body.expectedUpdatedAt, item.updatedAt);
            writes.push({ requestId, action: 'management', body });
            Object.assign(item, body); data = item;
          } else { unexpectedRequests.push({ path, method }); await route.abort(); return; }
        } else { unexpectedRequests.push({ path, method }); await route.abort(); return; }
        await route.fulfill({ json: { data, ...(meta ? { meta } : {}) } });
      } else if (url.origin === origin && !url.pathname.startsWith('/api/')) await route.continue();
      else { unexpectedRequests.push({ origin: url.origin, path: url.pathname, method: request.method() }); await route.abort(); }
    });
    const page = await context.newPage(); activePage = page;
    page.on('pageerror', error => errors.push(error.message));
    const fixtureUrl = `${origin}/test-fixtures/support-ticket-cards.html?role=${role}&theme=${theme}&locale=${locale}`;
    await page.goto(fixtureUrl);
    const cards = page.locator('.support-request-list > article'), first = cards.nth(0), second = cards.nth(1);
    await expect(cards).toHaveCount(8); await settled(page);
    assert.equal(detailReads.length, 0, 'Collapsed summaries do not fetch conversations');
    assert.equal(await cards.locator('.support-thread-panel, .support-request-preview, .support-ticket-reference, textarea, article > label').count(), 0);
    const collapsed = await geometry(page), columns = width >= 1280 ? 4 : width >= 1024 ? 3 : width >= 640 ? 2 : 1;
    assert.equal(collapsed.columns, columns); assert(collapsed.pageOverflow <= 1);
    assert.equal(collapsed.direction, locale === 'fa' ? 'rtl' : 'ltr');
    for (let index = 0; index < columns; index++) assert(Math.abs(collapsed.cards[index].y - collapsed.cards[0].y) < 1);
    for (let index = 1; index < columns; index++) assert.equal(Math.sign(collapsed.cards[index].x - collapsed.cards[index - 1].x), locale === 'fa' ? -1 : 1);
    for (let index = 0; index < 8; index++) await expect(cards.nth(index).locator('h3')).toHaveText(items[index].subject);
    if (locale === 'fa' && [390, 1920].includes(width)) await page.screenshot({ path: `${evidence}/cards-${role}-${theme}-${width}.png`, fullPage: true });

    const toggle = first.locator('.support-thread-toggle');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    assert(await toggle.getAttribute('aria-describedby'));
    await toggle.focus(); await toggle.press('Enter');
    await expect(first).toHaveClass(/\bis-open\b/);
    await expect(first.locator('.support-thread-messages')).toBeVisible();
    await expect(first.locator('.support-request-preview')).toHaveText(items[0].message);
    await expect(first.locator('.support-ticket-reference bdi')).toHaveText(items[0].id);
    assert.equal(new URL(page.url()).searchParams.get('ticket'), id(0));
    const expanded = await geometry(page);
    assert(Math.abs(expanded.cards[0].width - expanded.bounds.width) < 2);
    assert(expanded.pageOverflow <= 1);
    assert.equal(await first.locator('img,script').count(), 0);
    await expect(first.locator('.support-internal-note-form')).toHaveCount(admin ? 1 : 0);
    await expect(first.locator('.support-thread-message.internal-note')).toHaveCount(admin ? 1 : 0);
    const reply = first.locator('.support-thread-reply-form:not(.support-internal-note-form) textarea');
    await reply.fill('Synthetic unsent reply draft A');
    if (admin) await first.locator('.support-internal-note-form textarea').fill('Synthetic private draft A');
    await second.locator('.support-thread-toggle').click();
    await expect(page.locator('.support-thread-panel')).toHaveCount(1);
    await expect(second).toHaveClass(/\bis-open\b/);
    await page.goBack();
    await expect(first).toHaveClass(/\bis-open\b/);
    await expect(reply).toHaveValue('Synthetic unsent reply draft A');
    if (admin) await expect(first.locator('.support-internal-note-form textarea')).toHaveValue('Synthetic private draft A');
    await first.locator('.support-thread-reply-form:not(.support-internal-note-form) button').click();
    await expect(reply).toHaveValue('');
    await expect(first.locator('.support-thread-messages')).toContainText('Synthetic unsent reply draft A');
    if (admin) {
      await first.locator('.support-internal-note-form button').click();
      await expect(first.locator('.support-thread-messages')).toContainText('Synthetic private draft A');
      const priority = first.locator(':scope > label').nth(1).getByRole('combobox');
      await priority.click();
      await page.getByRole('option', { name: locale === 'fa' ? 'زیاد' : 'High', exact: true }).click();
      await first.locator(':scope > button.primary').click();
      await expect.poll(() => writes.filter(write => write.action === 'management').length).toBe(1);
      assert.equal(writes.at(-1).body.priority, 'HIGH');
    }
    if (locale === 'fa' && [390, 1920].includes(width)) await page.screenshot({ path: `${evidence}/details-${role}-${theme}-${width}.png`, fullPage: true });
    await first.locator('.support-thread-toggle').click();
    await expect(page.locator('.support-thread-panel')).toHaveCount(0);
    await expect(page.locator('.support-request-list .is-open')).toHaveCount(0);
    assert.equal(new URL(page.url()).searchParams.get('ticket'), null);
    const restored = await geometry(page); assert.equal(restored.columns, columns); assert(restored.pageOverflow <= 1);

    if (theme === 'white' && locale === 'en' && width >= 1440) {
      await page.goto(`${fixtureUrl}&ticket=${id(8)}`);
      const linked = page.locator(`#ticket-${id(8)}`);
      await expect(linked.locator('.support-thread-messages')).toBeVisible();
      await expect(linked.locator('.support-request-preview')).toHaveText(items[8].message);
      await linked.locator('.support-thread-toggle').click();
      await expect(page.locator('.support-thread-panel')).toHaveCount(0);
      await page.goto(fixtureUrl);
      failDetails = true;
      await page.locator('.support-thread-toggle').first().click();
      await expect(page.locator('.support-thread-panel .error-state')).toBeVisible();
      failDetails = false;
      await page.locator('.support-thread-panel .error-state button').click();
      await expect(page.locator('.support-thread-messages')).toBeVisible();
    }
    checks.push({ role, theme, locale, width, columns, collapsed, expanded, lazyDetails: true, singleSelection: true, backNavigation: true, draftsPreserved: true, publicReply: true, internalNoteAndManagement: admin, writes: writes.length });
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
