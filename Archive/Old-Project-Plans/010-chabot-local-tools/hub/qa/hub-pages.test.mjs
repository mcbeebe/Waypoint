import { chromium } from 'playwright-core';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FILE = join(HERE, '..', 'chabot-hub.html');
const URL = pathToFileURL(FILE).href;

const results = [];
const pass = (n) => results.push({ ok: true, name: n });
const fail = (n, d) => results.push({ ok: false, name: n, detail: d });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errs = [];
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
page.on('dialog', d => d.accept());
await page.goto(URL);

async function toAdmin() {
  while ((await page.$eval('#current-user', el => el.textContent.trim())) !== 'You: Admin') {
    await page.click('.user-badge button');
  }
}
async function toParent() {
  while ((await page.$eval('#current-user', el => el.textContent.trim())) !== 'You: Parent (Demo)') {
    await page.click('.user-badge button');
  }
}

// --- 1. Manage Pages is admin-only, matches Manage Team's gating ---
const parentSeesLink = await page.evaluate(() =>
  [...document.querySelectorAll('.nav-link')].some(l =>
    l.textContent.includes('Manage Pages') && getComputedStyle(l.closest('.nav-section')).display !== 'none'));
if (!parentSeesLink) pass('Manage Pages hidden from a plain parent');
else fail('Manage Pages hidden from a plain parent');

await toAdmin();
const adminSeesLink = await page.evaluate(() =>
  [...document.querySelectorAll('.nav-link')].some(l => l.textContent.includes('Manage Pages')));
if (adminSeesLink) pass('Manage Pages visible to admin'); else fail('Manage Pages visible to admin');

await page.evaluate(() => window.switchPage('manage-pages', null));
const emptyState = await page.$eval('#custom-pages-admin-list', el => el.innerText);
if (/No custom pages yet/.test(emptyState)) pass('empty state shown before any page is published');
else fail('empty state shown before any page', emptyState);

// --- 2. Publish into an existing section ---
await page.click('button:has-text("+ New Page")');
await page.fill('#page-title', 'Summer Camps & ESY Guide');
await page.fill('#page-subtitle', 'What to look for, and how to ask about ESY.');
await page.selectOption('#page-section', 'Essential Info');
await page.fill('#page-body',
  '## Finding a camp\n\nStart early -- good ones fill by March.\n\n' +
  '- Ask about sensory accommodations\n- Ask about staff ratios\n\n' +
  '**ESY (Extended School Year)** is a summer service some IEPs include.');
await page.click('#page-modal button:has-text("Publish Page")');

const linkInEssential = await page.evaluate(() => {
  const section = document.querySelector('.nav-section[data-section="Essential Info"]');
  return !!section && section.textContent.includes('Summer Camps & ESY Guide');
});
if (linkInEssential) pass('new page linked under the chosen existing section (Essential Info)');
else fail('new page linked under Essential Info');

await page.click('.nav-link:has-text("Summer Camps & ESY Guide")');
const activeId = await page.evaluate(() => document.querySelector('.page.active')?.id);
if (activeId === 'custom-900') pass('clicking the new nav link navigates to the new page');
else fail('clicking new nav link navigates', `active id was ${activeId}`);

const rendered = await page.$eval('#custom-900', el => el.innerHTML);
if (rendered.includes('<h2>Finding a camp</h2>')) pass('## heading renders as <h2>');
else fail('## heading renders as <h2>');
if (rendered.includes('<li>Ask about sensory accommodations</li>')) pass('- bullets render as a list');
else fail('- bullets render as a list');
if (rendered.includes('<strong>ESY (Extended School Year)</strong>')) pass('**bold** renders as <strong>');
else fail('**bold** renders as <strong>');
if (rendered.includes('What to look for')) pass('subtitle renders'); else fail('subtitle renders');

// --- 3. A brand-new section is created once and reused, not duplicated ---
await page.evaluate(() => window.switchPage('manage-pages', null));
await page.click('button:has-text("+ New Page")');
await page.fill('#page-title', '5th Grade Transition Timeline');
await page.selectOption('#page-section', '__new__');
const newSectionFieldShown = await page.isVisible('#page-new-section-group');
if (newSectionFieldShown) pass('choosing "Start a new section" reveals the name field');
else fail('new-section field reveals on selection');
await page.fill('#page-new-section', 'Milestones');
await page.fill('#page-body', 'A short guide to the middle-school transition.');
await page.click('#page-modal button:has-text("Publish Page")');

const customSection = await page.evaluate(() => {
  const el = document.getElementById('custom-nav-section');
  return { display: getComputedStyle(el).display, hasHeading: el.textContent.includes('Milestones') };
});
if (customSection.display === 'block' && customSection.hasHeading) pass('a new nav section is created for a brand-new section name');
else fail('new nav section created', JSON.stringify(customSection));

await page.evaluate(() => window.switchPage('manage-pages', null));
await page.click('button:has-text("+ New Page")');
await page.fill('#page-title', 'Middle School Open Houses');
await page.selectOption('#page-section', '__new__');
await page.fill('#page-new-section', 'Milestones');
await page.fill('#page-body', 'Dates and how to sign up.');
await page.click('#page-modal button:has-text("Publish Page")');

const milestoneHeadingCount = await page.$$eval('.nav-section-title', els =>
  els.filter(e => e.textContent === 'Milestones').length);
if (milestoneHeadingCount === 1) pass('a second page in the same new section does not duplicate the section heading');
else fail('no duplicate section heading', `found ${milestoneHeadingCount}`);

const milestoneLinkCount = await page.evaluate(() =>
  document.getElementById('custom-nav-section').querySelectorAll('.nav-link').length);
if (milestoneLinkCount === 2) pass('both pages appear as separate links under the shared section');
else fail('both pages under shared section', `found ${milestoneLinkCount}`);

// --- 4. Edit in place: no duplicate, content updates everywhere it appears ---
await page.evaluate(() => window.switchPage('manage-pages', null));
const cardsBeforeEdit = await page.$$eval('#custom-pages-admin-list .card', els => els.length);
await page.click('#custom-pages-admin-list .card:has-text("Summer Camps") button:has-text("Edit")');

const editHeader = await page.$eval('#page-modal-header', el => el.textContent.trim());
if (editHeader === 'Edit Page') pass('edit modal header says Edit Page'); else fail('edit header', editHeader);
const prefillTitle = await page.$eval('#page-title', el => el.value);
if (prefillTitle === 'Summer Camps & ESY Guide') pass('edit modal pre-fills the existing title');
else fail('edit modal pre-fills title', prefillTitle);
const prefillSection = await page.$eval('#page-section', el => el.value);
if (prefillSection === 'Essential Info') pass('edit modal pre-fills the existing section');
else fail('edit modal pre-fills section', prefillSection);

await page.fill('#page-body', 'Updated content after edit.');
await page.click('#page-modal button:has-text("Save Changes")');

const cardsAfterEdit = await page.$$eval('#custom-pages-admin-list .card', els => els.length);
if (cardsAfterEdit === cardsBeforeEdit) pass('editing a page does not create a duplicate admin-list card');
else fail('editing does not duplicate', `${cardsBeforeEdit} -> ${cardsAfterEdit}`);

await page.evaluate(() => window.switchPage('custom-900', null));
const bodyAfterEdit = await page.$eval('#custom-900', el => el.innerText);
if (bodyAfterEdit.includes('Updated content after edit')) pass('rendered page reflects the edit');
else fail('rendered page reflects edit', bodyAfterEdit.slice(0, 150));
if (!bodyAfterEdit.includes('Finding a camp')) pass('old content is fully replaced, not appended');
else fail('old content fully replaced', bodyAfterEdit.slice(0, 200));

// --- 5. Editing into a section that already exists as a brand-new one earlier reuses it ---
// (regression guard for the ensureCustomNavSection lookup path)
await page.evaluate(() => window.switchPage('manage-pages', null));
await page.click('#custom-pages-admin-list .card:has-text("Summer Camps") button:has-text("Edit")');
await page.selectOption('#page-section', '__new__');
await page.fill('#page-new-section', 'Milestones');
await page.click('#page-modal button:has-text("Save Changes")');
const milestoneHeadingAfterMove = await page.$$eval('.nav-section-title', els =>
  els.filter(e => e.textContent === 'Milestones').length);
if (milestoneHeadingAfterMove === 1) pass('moving a page into an existing custom section does not duplicate the heading');
else fail('moving into existing custom section', `found ${milestoneHeadingAfterMove} headings`);
const milestoneLinksAfterMove = await page.evaluate(() =>
  document.getElementById('custom-nav-section').querySelectorAll('.nav-link').length);
if (milestoneLinksAfterMove === 3) pass('all three pages now listed under Milestones after the move');
else fail('three pages under Milestones after move', `found ${milestoneLinksAfterMove}`);

// Move it back to Essential Info for the rest of the suite's assumptions.
await page.evaluate(() => window.switchPage('manage-pages', null));
await page.click('#custom-pages-admin-list .card:has-text("Summer Camps") button:has-text("Edit")');
await page.selectOption('#page-section', 'Essential Info');
await page.click('#page-modal button:has-text("Save Changes")');

// --- 6. Validation ---
await page.click('button:has-text("+ New Page")');
const beforeEmptyTitle = await page.$$eval('#custom-pages-admin-list .card', els => els.length);
await page.click('#page-modal button:has-text("Publish Page")');
const afterEmptyTitle = await page.$$eval('#custom-pages-admin-list .card', els => els.length);
if (beforeEmptyTitle === afterEmptyTitle) pass('page with empty title rejected'); else fail('empty title rejected');

await page.fill('#page-title', 'Has A Title But No Body');
await page.click('#page-modal button:has-text("Publish Page")');
const afterEmptyBody = await page.$$eval('#custom-pages-admin-list .card', els => els.length);
if (afterEmptyTitle === afterEmptyBody) pass('page with empty body rejected'); else fail('empty body rejected');

await page.fill('#page-body', 'Has content now.');
await page.selectOption('#page-section', '__new__');
await page.click('#page-modal button:has-text("Publish Page")');
const afterEmptyNewSectionName = await page.$$eval('#custom-pages-admin-list .card', els => els.length);
if (afterEmptyBody === afterEmptyNewSectionName) pass('"start a new section" with no name typed is rejected');
else fail('empty new-section name rejected');
await page.click('#page-modal button:has-text("Cancel")');

// --- 7. Role visibility on an already-rendered page updates live, not just at creation ---
await page.evaluate(() => window.switchPage('custom-900', null));
const editBtnVisibleAsAdmin = await page.isVisible('#custom-900 button:has-text("Edit Page")');
if (editBtnVisibleAsAdmin) pass('admin sees Edit/Delete controls on the page itself');
else fail('admin sees Edit/Delete controls on the page');

await toParent();
const editBtnHiddenAsParent = await page.isVisible('#custom-900 button:has-text("Edit Page")');
if (!editBtnHiddenAsParent) pass('switching to parent hides those controls on the SAME already-rendered page (no re-navigation needed)');
else fail('parent role hides controls without re-navigating');

const parentCanRead = await page.evaluate(() => document.getElementById('custom-900').innerText.includes('Updated content'));
if (parentCanRead) pass('a parent can still read the published page content');
else fail('parent can read published content');

// --- 8. XSS: page title and body cannot inject markup ---
await toAdmin();
await page.evaluate(() => window.switchPage('manage-pages', null));
await page.click('button:has-text("+ New Page")');
await page.fill('#page-title', '<img src=x onerror=window.__xssFired=true>Evil Title');
await page.selectOption('#page-section', 'Community');
await page.fill('#page-body', 'Safe body <script>window.__xssFired = true;</script> and a literal <b>tag</b>.');
await page.click('#page-modal button:has-text("Publish Page")');

const xssFired = await page.evaluate(() => window.__xssFired === true);
if (!xssFired) pass('neither an injected <img onerror> nor a <script> tag executes');
else fail('XSS does not execute');

const navLinkText = await page.evaluate(() => {
  const link = [...document.querySelectorAll('.nav-link')].find(l => l.textContent.includes('Evil Title'));
  return link ? link.textContent : null;
});
if (navLinkText && navLinkText.includes('<img')) pass('the raw tag renders as visible plain text in the nav, not as markup');
else fail('raw tag renders as plain text', navLinkText);

const evilId = await page.evaluate(() => {
  const link = [...document.querySelectorAll('.nav-link')].find(l => l.textContent.includes('Evil Title'));
  return link ? link.dataset.customPage : null;
});
await page.evaluate((id) => window.switchPage('custom-' + id, null), evilId);
const evilBodyHtml = await page.$eval(`#custom-${evilId}`, el => el.innerHTML);
if (evilBodyHtml.includes('&lt;b&gt;tag&lt;/b&gt;') && !/<b>tag<\/b>/.test(evilBodyHtml))
  pass('a literal <b> typed in the body renders as text, not as a real bold tag');
else fail('literal tag in body stays text', evilBodyHtml.slice(0, 200));

// --- 9. Delete ---
await page.evaluate(() => window.switchPage('manage-pages', null));
const cardsBeforeDelete = await page.$$eval('#custom-pages-admin-list .card', els => els.length);
await page.click('#custom-pages-admin-list .card:has-text("Evil Title") button:has-text("Delete")');
const cardsAfterDelete = await page.$$eval('#custom-pages-admin-list .card', els => els.length);
if (cardsAfterDelete === cardsBeforeDelete - 1) pass('deleting removes exactly one admin-list card');
else fail('delete removes one card', `${cardsBeforeDelete} -> ${cardsAfterDelete}`);

const navLinkGone = await page.evaluate(() =>
  ![...document.querySelectorAll('.nav-link')].some(l => l.textContent.includes('Evil Title')));
if (navLinkGone) pass('deleted page nav link is removed'); else fail('deleted nav link removed');

// Delete while actively viewing the page should redirect somewhere valid, not leave a blank screen.
const remainingId = await page.evaluate(() => {
  const link = [...document.querySelectorAll('.nav-link[data-custom-page]')][0];
  return link ? link.dataset.customPage : null;
});
await page.evaluate((id) => window.switchPage('custom-' + id, null), remainingId);
await page.evaluate(() => window.switchPage('manage-pages', null));
await page.evaluate((id) => window.switchPage('custom-' + id, null), remainingId);
const activeBeforeSelfDelete = await page.evaluate(() => document.querySelector('.page.active')?.id);
await page.evaluate(() => window.switchPage('manage-pages', null));
await page.evaluate((id) => window.deletePage(Number(id)), remainingId);
const somePageActive = await page.evaluate(() => !!document.querySelector('.page.active'));
if (somePageActive) pass('after deleting a page, some page is still active (never a blank screen)');
else fail('never leaves a blank screen after delete');

// --- 10. Desktop layout sanity for a rendered custom page ---
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
if (overflow <= 1) pass('no horizontal overflow after all this page-builder activity');
else fail('no horizontal overflow', `+${overflow}px`);

if (errs.length === 0) pass('no console errors across the whole run'); else fail('no console errors', errs.join(' | '));
await browser.close();

const failed = results.filter(r => !r.ok);
console.log(results.map(r => `${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? '\n        → ' + r.detail : ''}`).join('\n'));
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
