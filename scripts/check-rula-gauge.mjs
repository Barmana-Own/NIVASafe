import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(new URL('../frontend/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const evidence = fileURLToPath(new URL('../.local/rula-gauge-color-20261023-01/', import.meta.url));
fs.mkdirSync(evidence, { recursive: true });
const origin = 'http://127.0.0.1:5189';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext();
const errors = [], apiRequests = [], checks = [];
await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
const page = await context.newPage();
page.on('pageerror', error => errors.push(error.message));
page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/')) apiRequests.push(request.url()); });
const expected = { pending: [0, null, null], partial: [154, null, null], low: [26, 1, 1], medium: [77, 2, 3], high: [154, 3, 6], critical: [180, 4, 7] };

async function verify(state, metadata) {
  const gauge = page.locator('.rula-score-gauge');
  await gauge.waitFor();
  const snapshot = await gauge.evaluate(element => {
    const style = getComputedStyle(element), bounds = element.getBoundingClientRect();
    const progress = getComputedStyle(element.querySelector('.rula-score-gauge-progress'));
    const level = element.getAttribute('data-action-level');
    const token = ['--color-accent', '--color-success', '--color-warning', '--color-high', '--color-danger'][Number(level) || 0];
    return { angle: style.getPropertyValue('--rula-score-angle').trim(), level, value: element.getAttribute('aria-valuenow'), valueText: element.getAttribute('aria-valuetext'), color: style.getPropertyValue('--rula-score-color').trim(), token: style.getPropertyValue(token).trim(), scoreColor: getComputedStyle(element.querySelector('strong')).color, ink: style.getPropertyValue('--color-ink').trim(), captionColor: getComputedStyle(element.querySelector('small')).color, secondary: style.getPropertyValue('--color-secondary').trim(), background: progress.backgroundImage, width: bounds.width, height: bounds.height, overflow: document.documentElement.scrollWidth - innerWidth };
  });
  const [angle, level, score] = expected[state];
  checks.push({ ...metadata, state, ...snapshot });
  assert.equal(snapshot.angle, `${angle}deg`);
  assert.equal(snapshot.level, level === null ? null : String(level));
  assert.equal(snapshot.value, score === null ? null : String(score));
  assert.equal(snapshot.color, snapshot.token);
  const rgb = hex => `rgb(${[1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16)).join(', ')})`;
  assert.equal(snapshot.scoreColor, rgb(snapshot.ink));
  assert.equal(snapshot.captionColor, rgb(snapshot.secondary));
  assert.match(snapshot.background, /conic-gradient\(from 270deg/);
  assert(snapshot.width > 0 && snapshot.height > 0 && snapshot.width / snapshot.height > 1.7, `Semicircle bounds: ${snapshot.width} × ${snapshot.height}`);
  assert(snapshot.overflow <= 1, `Whole-page overflow: ${snapshot.overflow}`);
  if (state === 'partial') {
    assert(snapshot.valueText);
    assert.equal(await gauge.locator('strong').textContent(), '—');
  }
}

try {
  for (const theme of ['white', 'blue']) for (const locale of ['fa', 'en']) for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`${origin}/test-fixtures/rula-gauge.html?state=partial&theme=${theme}&locale=${locale}`);
    await verify('partial', { theme, locale, width });
    if (locale === 'fa' && width === 1440) await page.locator('.rula-analysis-summary').screenshot({ path: `${evidence}/partial-${theme}.png` });
  }
  for (const theme of ['white', 'blue']) for (const state of ['pending', 'low', 'medium', 'high', 'critical']) {
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.goto(`${origin}/test-fixtures/rula-gauge.html?state=${state}&theme=${theme}&locale=en`);
    await verify(state, { theme, locale: 'en', width: 1280 });
    if (theme === 'white') await page.locator('.rula-analysis-summary').screenshot({ path: `${evidence}/${state}.png` });
  }
  await page.goto(`${origin}/test-fixtures/rula-gauge.html?state=partial&theme=white&locale=en`);
  const photos = [['partial', 'critical'], ['low', 'medium'], ['high', 'partial'], ['critical', 'pending']];
  for (const [photo, [right, left]] of photos.entries()) {
    await page.locator(`[data-photo="${photo}"]`).click();
    await page.locator('.rula-side-tabs button').nth(0).click();
    await verify(right, { photo, side: 'RIGHT' });
    await page.locator('.rula-side-tabs button').nth(1).click();
    await verify(left, { photo, side: 'LEFT' });
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(apiRequests, []);
  const result = { status: 'PASS', checks, pageErrors: errors, apiRequests, data: 'Synthetic local-only fixtures; no assessment or AI-provider requests.' };
  fs.writeFileSync(`${evidence}/browser.json`, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ status: 'PASS', checks: checks.length, photos: 4, sides: 2, themes: 2, locales: 2, widths: [320, 390, 768, 1440], apiRequests: 0, errors: 0 }));
} catch (error) {
  await page.screenshot({ path: `${evidence}/browser-failure.png`, fullPage: true });
  fs.writeFileSync(`${evidence}/browser.json`, JSON.stringify({ status: 'FAIL', checks, pageErrors: errors, apiRequests, error: error.message }, null, 2) + '\n');
  throw error;
} finally {
  await browser.close();
}
