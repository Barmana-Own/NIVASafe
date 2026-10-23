import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(new URL('../frontend/package.json', import.meta.url));
const { chromium, expect } = require('@playwright/test');
const evidence = fileURLToPath(new URL('../.local/assistant-composer-polish-20261023-01/', import.meta.url));
fs.mkdirSync(evidence, { recursive: true });
const origin = 'http://127.0.0.1:5189';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const checks = [], errors = [], unexpectedRequests = [];
let activePage;
let syntheticApiRequests = 0;

async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

async function metrics(input) {
  return input.evaluate(element => {
    const style = getComputedStyle(element);
    const placeholder = getComputedStyle(element, '::placeholder');
    const scrollbar = getComputedStyle(element, '::-webkit-scrollbar');
    const bounds = element.getBoundingClientRect();
    const composer = element.closest('.composer').getBoundingClientRect();
    const send = element.form.querySelector('.send').getBoundingClientRect();
    const label = element.form.querySelector('label[for="assistant-message"]');
    const labelBounds = label.getBoundingClientRect();
    return {
      height: bounds.height, lineHeight: parseFloat(style.lineHeight),
      clientHeight: element.clientHeight, scrollHeight: element.scrollHeight,
      scrollTop: element.scrollTop, overflowY: style.overflowY,
      scrollbarWidth: style.scrollbarWidth, scrollbarDisplay: scrollbar.display,
      placeholderAlign: placeholder.textAlign, textAlign: style.textAlign,
      direction: style.direction, placeholderCenteredVertically: Math.abs(bounds.y + bounds.height / 2 - send.y - send.height / 2) < 2,
      labelPosition: getComputedStyle(label).position,
      labelWidth: labelBounds.width, labelHeight: labelBounds.height,
      sendWithinComposer: send.x >= composer.x && send.right <= composer.right && send.y >= composer.y && send.bottom <= composer.bottom,
      pageOverflow: document.documentElement.scrollWidth - innerWidth,
    };
  });
}

try {
  for (const theme of ['white', 'blue']) for (const locale of ['fa', 'en']) for (const width of [320, 390, 768, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
    const messages = [];
    const sent = [];
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.hostname === 'fonts.googleapis.com') {
        await route.fulfill({ contentType: 'text/css', body: '@font-face{font-family:Vazirmatn;src:url("/qa/font-arabic.woff2") format("woff2");unicode-range:U+0600-06FF,U+200C-200F}@font-face{font-family:Vazirmatn;src:url("/qa/font-latin.woff2") format("woff2");unicode-range:U+0000-00FF}' });
      } else if (url.origin === origin && /^\/qa\/font-(arabic|latin)\.woff2$/.test(url.pathname)) {
        await route.fulfill({ contentType: 'font/woff2', path: fileURLToPath(new URL(`../frontend/tests/e2e/assets/vazirmatn-${url.pathname.includes('arabic') ? 'arabic' : 'latin'}.woff2`, import.meta.url)) });
      } else if (url.origin === origin && url.pathname.startsWith('/api/v1/')) {
        syntheticApiRequests++;
        const path = url.pathname.slice('/api/v1'.length);
        let data;
        if (path === '/chat/conversations' && request.method() === 'GET') data = [];
        else if (path === '/chat/conversations' && request.method() === 'POST') data = { id: 'synthetic-composer', title: 'Synthetic conversation' };
        else if (path === '/chat/conversations/synthetic-composer/messages' && request.method() === 'GET') data = messages;
        else if (path === '/chat/conversations/synthetic-composer/messages' && request.method() === 'POST') {
          const { content } = request.postDataJSON();
          sent.push(content);
          data = { id: `synthetic-reply-${sent.length}`, role: 'assistant', content: 'Synthetic local reply', createdAt: '2026-10-23T12:00:00Z' };
          messages.push({ id: `synthetic-user-${sent.length}`, role: 'user', content, createdAt: '2026-10-23T12:00:00Z' }, data);
        } else {
          unexpectedRequests.push({ method: request.method(), path: url.pathname });
          await route.abort(); return;
        }
        await route.fulfill({ contentType: 'application/json', json: { data } });
      } else if (url.origin === origin && !url.pathname.startsWith('/api/')) await route.continue();
      else {
        unexpectedRequests.push({ method: request.method(), origin: url.origin, path: url.pathname });
        await route.abort();
      }
    });
    const page = await context.newPage();
    activePage = page;
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${origin}/test-fixtures/assistant-composer.html?locale=${locale}&theme=${theme}`);
    const input = page.getByRole('textbox', { name: locale === 'fa' ? 'پیام شما' : 'Your message', exact: true });
    await input.waitFor();
    await settle(page);
    const empty = await metrics(input);
    assert.equal(empty.placeholderAlign, 'center');
    assert.equal(empty.placeholderCenteredVertically, true);
    assert.equal(empty.height, empty.lineHeight);
    assert.equal(empty.labelPosition, 'absolute');
    assert(empty.labelWidth <= 1 && empty.labelHeight <= 1, 'Label remains accessible without visible space');
    assert.equal(empty.direction, locale === 'fa' ? 'rtl' : 'ltr');
    assert(empty.sendWithinComposer && empty.pageOverflow <= 1);
    assert.equal(await page.locator('.composer-section [role="status"]').count(), 0);
    if (width === 1440 && locale === 'fa') await page.locator('.composer-section').screenshot({ path: `${evidence}/empty-${theme}.png` });

    const sample = locale === 'fa' ? 'آزمون پیام' : 'Message sample';
    const growth = [];
    for (const lines of [1, 2, 3]) {
      await input.fill(Array(lines).fill(sample).join('\n'));
      await settle(page);
      const current = await metrics(input);
      assert.equal(current.height, current.lineHeight * lines);
      assert.notEqual(current.textAlign, 'center', 'Typed content keeps its normal reading alignment');
      assert.equal(current.overflowY, 'hidden');
      growth.push(current.height);
    }
    await input.fill(Array.from({ length: 12 }, (_, index) => `${sample} ${index + 1}`).join('\n'));
    await settle(page);
    const overflow = await metrics(input);
    assert.equal(overflow.height, overflow.lineHeight * 3);
    assert(overflow.scrollHeight > overflow.clientHeight);
    assert.equal(overflow.overflowY, 'auto');
    assert.equal(overflow.scrollbarWidth, 'none');
    assert.equal(overflow.scrollbarDisplay, 'none');
    assert(overflow.sendWithinComposer && overflow.pageOverflow <= 1);
    await input.press('Control+Home');
    await expect.poll(() => input.evaluate(element => element.selectionStart)).toBe(0);
    // Native caret scrolling includes font leading; the first line stays visible.
    await expect.poll(() => input.evaluate(element => element.scrollTop)).toBeLessThan(overflow.lineHeight);
    await input.hover();
    await page.mouse.wheel(0, 300);
    await expect.poll(() => input.evaluate(element => element.scrollTop)).toBeGreaterThan(overflow.lineHeight);
    await input.press('Control+End');
    const bottom = await input.evaluate(element => element.scrollTop);
    assert(bottom > 0, 'Keyboard reaches content after the third line');
    await page.mouse.wheel(0, -600);
    await expect.poll(() => input.evaluate(element => element.scrollTop)).toBe(0);
    assert.equal(await page.locator('.composer-section [role="status"]').count(), 0);
    if (width === 1440 || width === 390) await page.locator('.composer-section').screenshot({ path: `${evidence}/multiline-${theme}-${locale}-${width}.png` });

    await input.fill(sample);
    await input.press('Shift+Enter');
    await input.press('End');
    await input.type('2');
    await settle(page);
    assert.equal(sent.length, 0, 'Shift+Enter inserts a newline without submitting');
    assert((await input.inputValue()).includes('\n'));
    assert.equal((await metrics(input)).height, 2 * empty.lineHeight);
    if (width >= 769) await input.press('Enter');
    else await page.getByRole('button', { name: locale === 'fa' ? 'ارسال' : 'Send', exact: true }).click();
    await expect.poll(() => sent.length).toBe(1);
    await expect(input).toHaveValue('');
    await settle(page);
    const reset = await metrics(input);
    assert.equal(reset.height, empty.lineHeight);
    assert.equal(reset.placeholderAlign, 'center');
    assert.equal(reset.placeholderCenteredVertically, true);
    await expect(page.locator('.message.assistant p')).toHaveText('Synthetic local reply');
    checks.push({ theme, locale, width, accessibleName: true, empty, growth, overflow, wheelAndKeyboardScrolling: true, shiftEnter: true, sendAndReset: true });
    await context.close();
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(unexpectedRequests, []);
  const result = { status: 'PASS', checks: checks.length, errors, unexpectedRequests, syntheticApiRequests, realApiRequests: 0, checksDetail: checks };
  fs.writeFileSync(`${evidence}/browser.json`, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ ...result, checksDetail: undefined }));
} catch (error) {
  await activePage?.screenshot({ path: `${evidence}/failure.png` }).catch(() => undefined);
  fs.writeFileSync(`${evidence}/browser.json`, JSON.stringify({ status: 'FAIL', error: error.message, errors, unexpectedRequests, completed: checks }, null, 2) + '\n');
  throw error;
} finally {
  await browser.close();
}
