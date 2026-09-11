import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const FILE = join(HERE, '..', 'chabot-hub.html');


const URL = pathToFileURL(FILE).href;
const results = [];
const pass = (n) => results.push({ ok: true, name: n });
const fail = (n, d) => results.push({ ok: false, name: n, detail: d });

const ALL_PAGES = ['home','search','navigator','discussions','my-posts','guidelines',
  'resources','iep-guide','classroom','directory','contacts','wisdom','how-to-ask',
  'mod-dashboard','manage-team','manage-pages'];

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

// iPhone 12/13 mini-ish: the narrow end of what parents actually carry.
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3, isMobile: true, hasTouch: true
});
const errs = [];
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
page.on('dialog', d => d.accept());
await page.goto(URL);

// --- 1. There IS navigation on a phone ---
const burgerVisible = await page.isVisible('#hamburger');
if (burgerVisible) pass('hamburger button visible at 390px'); else fail('hamburger visible at 390px');

const barVisible = await page.isVisible('.mobile-bar');
if (barVisible) pass('mobile top bar visible'); else fail('mobile top bar visible');

// Drawer starts off-screen
const closedPos = await page.$eval('.sidebar', el => el.getBoundingClientRect().right);
if (closedPos <= 1) pass(`drawer starts off-screen (right edge ${Math.round(closedPos)}px)`);
else fail('drawer starts off-screen', `right edge at ${closedPos}px`);

// --- 2. Tapping the hamburger opens it ---
await page.tap('#hamburger');
await page.waitForTimeout(350);
const openPos = await page.$eval('.sidebar', el => el.getBoundingClientRect().left);
if (openPos >= -1) pass(`drawer slides in on tap (left edge ${Math.round(openPos)}px)`);
else fail('drawer slides in on tap', `left edge ${openPos}px`);

const backdropUp = await page.isVisible('#drawer-backdrop');
if (backdropUp) pass('backdrop shown while drawer open'); else fail('backdrop shown while drawer open');

const aria = await page.getAttribute('#hamburger', 'aria-expanded');
if (aria === 'true') pass('hamburger reports aria-expanded=true'); else fail('aria-expanded=true', aria);

// --- 3. Every nav link is reachable and works from the drawer ---
const linkCount = await page.$$eval('.sidebar .nav-link', els =>
  els.filter(e => e.getBoundingClientRect().left >= -1).length);
if (linkCount >= 12) pass(`${linkCount} nav links reachable in drawer`);
else fail('nav links reachable in drawer', `only ${linkCount}`);

const drawerNames = await page.$$eval('.sidebar .nav-link', els => els.map(e => e.innerText.trim()));
if (drawerNames.some(n => /^Wisdom/.test(n))) pass('Wisdom reachable from the drawer');
else fail('Wisdom reachable from drawer', JSON.stringify(drawerNames));

await page.tap('.sidebar .nav-link:has-text("Navigator")');
await page.waitForTimeout(350);
const navActive = await page.$eval('#navigator', el => el.classList.contains('active'));
if (navActive) pass('tapping a drawer link navigates'); else fail('tapping a drawer link navigates');

const closedAfterNav = await page.$eval('.sidebar', el => el.getBoundingClientRect().right);
if (closedAfterNav <= 1) pass('drawer closes after navigating'); else fail('drawer closes after navigating', `${closedAfterNav}px`);

// --- 3b. Sidebar title must be legible against the navy sidebar ---
await page.tap('#hamburger');
await page.waitForTimeout(300);
const titleStyle = await page.$eval('.sidebar h1', el => ({
  fg: getComputedStyle(el).color,
  bg: getComputedStyle(el.closest('.sidebar')).backgroundColor
}));
if (titleStyle.fg !== titleStyle.bg) pass(`sidebar title legible (${titleStyle.fg} on ${titleStyle.bg})`);
else fail('sidebar title legible', `same colour: ${titleStyle.fg}`);

// --- 3c. Explicit close button (backdrop strip is narrow on a phone) ---
const closeVisible = await page.isVisible('.drawer-close');
if (closeVisible) pass('drawer has a visible close button'); else fail('drawer close button visible');
await page.tap('.drawer-close');
await page.waitForTimeout(350);
const afterClose = await page.$eval('.sidebar', el => el.getBoundingClientRect().right);
if (afterClose <= 1) pass('close button closes the drawer'); else fail('close button closes drawer', `${afterClose}px`);

// --- 4. Backdrop tap and Escape both close it ---
await page.tap('#hamburger');
await page.waitForTimeout(300);
await page.evaluate(() => document.getElementById('drawer-backdrop').click());
await page.waitForTimeout(350);
const afterBackdrop = await page.$eval('.sidebar', el => el.getBoundingClientRect().right);
if (afterBackdrop <= 1) pass('backdrop tap closes drawer'); else fail('backdrop tap closes drawer', `${afterBackdrop}px`);

await page.tap('#hamburger');
await page.waitForTimeout(300);
await page.keyboard.press('Escape');
await page.waitForTimeout(350);
const afterEsc = await page.$eval('.sidebar', el => el.getBoundingClientRect().right);
if (afterEsc <= 1) pass('Escape closes drawer'); else fail('Escape closes drawer', `${afterEsc}px`);

// --- 5. No page-level horizontal scroll on ANY page ---
for (const id of ALL_PAGES) {
  await page.evaluate((p) => window.switchPage(p, null), id);
  await page.waitForTimeout(60);
  const over = await page.evaluate(() => ({
    doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth
  }));
  if (over.doc <= 1 && over.body <= 1) pass(`no h-scroll at 390px: ${id}`);
  else fail(`no h-scroll at 390px: ${id}`, `doc +${over.doc}px, body +${over.body}px`);
}

// --- 6. Wide tables scroll inside their own box ---
await page.evaluate(() => window.switchPage('contacts', null));
const wrapped = await page.$$eval('#contacts .table-scroll .data-table', e => e.length);
if (wrapped >= 2) pass(`contact tables wrapped in scroll boxes (${wrapped})`);
else fail('contact tables wrapped', `${wrapped}`);
const tableScrolls = await page.$eval('#contacts .table-scroll',
  el => el.scrollWidth > el.clientWidth);
if (tableScrolls) pass('wide table scrolls within its box, not the page');
else fail('wide table scrolls within its box');
const hintShown = await page.isVisible('#contacts .table-hint');
if (hintShown) pass('mobile shows a swipe hint above wide tables'); else fail('swipe hint shown');

// --- 7. Grids collapse to one column ---
await page.evaluate(() => window.switchPage('navigator', null));
const pathCols = await page.$eval('.path-grid',
  el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
if (pathCols === 1) pass('Navigator 3-col grid collapses to 1'); else fail('Navigator grid collapses', `${pathCols} cols`);

await page.evaluate(() => window.switchPage('classroom', null));
const accomCols = await page.$eval('.accom-grid',
  el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
if (accomCols === 1) pass('Accommodations 2-col grid collapses to 1'); else fail('Accommodations grid collapses', `${accomCols} cols`);

// --- 8. iOS zoom guard: inputs must be >=16px ---
await page.evaluate(() => window.switchPage('search', null));
const inputSize = await page.$eval('#search-input', el => parseFloat(getComputedStyle(el).fontSize));
if (inputSize >= 16) pass(`search input ${inputSize}px (no iOS auto-zoom)`);
else fail('search input >=16px', `${inputSize}px`);

await page.evaluate(() => window.openLessonModal());
const taSize = await page.$eval('#lesson-body', el => parseFloat(getComputedStyle(el).fontSize));
if (taSize >= 16) pass(`lesson textarea ${taSize}px (no iOS auto-zoom)`);
else fail('lesson textarea >=16px', `${taSize}px`);

// --- 9. Modals are usable on a phone ---
const modalBox = await page.$eval('#lesson-modal .modal-content', el => {
  const r = el.getBoundingClientRect();
  return { left: r.left, right: r.right, w: r.width };
});
if (modalBox.left >= 0 && modalBox.right <= 391) pass(`lesson modal fits viewport (${Math.round(modalBox.w)}px)`);
else fail('lesson modal fits viewport', JSON.stringify(modalBox));

await page.fill('#lesson-title', 'Mobile QA lesson');
await page.fill('#lesson-body', 'Wrote this whole thing on a phone.');
await page.click('#lesson-modal button:has-text("Publish Lesson")');
await page.waitForTimeout(200);
await page.evaluate(() => window.switchPage('wisdom', null));
const wis = await page.$eval('#lessons-list', el => el.innerText);
if (/Mobile QA lesson/.test(wis)) pass('can publish a lesson from mobile'); else fail('can publish a lesson from mobile');

// --- 10. Modal must render above the drawer ---
const zModal = await page.$eval('.modal', el => parseInt(getComputedStyle(el).zIndex, 10));
const zDrawer = await page.$eval('.sidebar', el => parseInt(getComputedStyle(el).zIndex, 10));
if (zModal > zDrawer) pass(`modal (${zModal}) stacks above drawer (${zDrawer})`);
else fail('modal stacks above drawer', `modal ${zModal} vs drawer ${zDrawer}`);

// --- 11. Touch targets ---
await page.evaluate(() => window.switchPage('discussions', null));
await page.evaluate(() => window.toggleThread(1));
const small = await page.$$eval('#discussions-list .thread-body button', els =>
  els.filter(e => e.offsetParent !== null)           // only buttons actually on screen
     .filter(e => e.getBoundingClientRect().height < 36).length);
const measured = await page.$$eval('#discussions-list .thread-body button',
  els => els.filter(e => e.offsetParent !== null).length);
if (measured >= 3) pass(`measured ${measured} visible thread buttons`);
else fail('measured visible thread buttons', `only ${measured}`);
if (small === 0) pass('thread action buttons meet touch-target height');
else fail('thread action buttons touch height', `${small} under 36px`);

if (errs.length === 0) pass('mobile: no console errors'); else fail('mobile: no console errors', errs.join(' | '));
await page.close();

// --- 12. Desktop must be unchanged ---
{
  const d = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const derrs = [];
  d.on('pageerror', e => derrs.push(e.message));
  await d.goto(URL);
  const burgerHidden = !(await d.isVisible('#hamburger'));
  if (burgerHidden) pass('desktop: hamburger hidden'); else fail('desktop: hamburger hidden');
  const closeHidden = !(await d.isVisible('.drawer-close'));
  if (closeHidden) pass('desktop: drawer close button hidden'); else fail('desktop: close button hidden');
  const dTitle = await d.$eval('.sidebar h1', el => ({
    fg: getComputedStyle(el).color, bg: getComputedStyle(el.closest('.sidebar')).backgroundColor }));
  if (dTitle.fg !== dTitle.bg) pass('desktop: sidebar title legible'); else fail('desktop: sidebar title legible', dTitle.fg);
  const sidebarOn = await d.$eval('.sidebar', el => el.getBoundingClientRect().left >= 0);
  if (sidebarOn) pass('desktop: sidebar visible in place'); else fail('desktop: sidebar visible in place');
  await d.evaluate(() => window.switchPage('navigator', null));
  const cols = await d.$eval('.path-grid', el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
  if (cols === 3) pass('desktop: Navigator keeps 3 columns'); else fail('desktop: Navigator 3 columns', `${cols}`);
  const dHint = await d.isVisible('.table-hint');
  if (!dHint) pass('desktop: swipe hint hidden'); else fail('desktop: swipe hint hidden');
  const dOver = await d.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (dOver <= 1) pass('desktop: no horizontal scroll'); else fail('desktop: no horizontal scroll', `+${dOver}px`);
  if (derrs.length === 0) pass('desktop: no console errors'); else fail('desktop: no console errors', derrs.join(' | '));
  await d.close();
}

// --- 13. Tablet boundary ---
{
  const t = await browser.newPage({ viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true });
  await t.goto(URL);
  const hb = await t.isVisible('#hamburger');
  if (hb) pass('768px: drawer mode active (hamburger shown)'); else fail('768px: drawer mode active');
  const over = await t.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (over <= 1) pass('768px: no horizontal scroll'); else fail('768px: no horizontal scroll', `+${over}px`);
  await t.close();
}

await browser.close();
const failed = results.filter(r => !r.ok);
console.log(results.map(r => `${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? '\n        → ' + r.detail : ''}`).join('\n'));
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
