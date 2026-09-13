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
  // Fresh role cycle from whatever state we're in: click to parent state first is
  // unreliable without knowing current state, so read the label and step precisely.
  while ((await page.$eval('#current-user', el => el.textContent.trim())) !== 'You: Admin') {
    await page.click('.user-badge button');
  }
}
async function toParent() {
  while ((await page.$eval('#current-user', el => el.textContent.trim())) !== 'You: Parent (Demo)') {
    await page.click('.user-badge button');
  }
}

// ================= CONTACTS =================

await page.evaluate(() => window.switchPage('contacts', null));

const chabotRows = await page.$$eval('#contacts-chabot-body tr', els => els.length);
if (chabotRows === 7) pass(`seed Chabot Elementary contacts render (${chabotRows})`);
else fail('seed Chabot Elementary contacts render', `expected 7, got ${chabotRows}`);

const ousdRows = await page.$$eval('#contacts-ousd-body tr', els => els.length);
if (ousdRows === 3) pass(`seed OUSD contacts render (${ousdRows})`);
else fail('seed OUSD contacts render', `expected 3, got ${ousdRows}`);

// Edit an existing Chabot row: modal pre-fills, save updates in place (not a duplicate)
await page.click('#contacts-chabot-body tr:first-child button');
const editHeader = await page.$eval('#contact-modal-header', el => el.textContent.trim());
if (editHeader === 'Edit Contact') pass('edit modal header says Edit'); else fail('edit modal header', editHeader);
const prefillRole = await page.$eval('#contact-role', el => el.value);
if (prefillRole === 'Principal') pass('edit modal pre-fills existing role'); else fail('edit modal pre-fills role', prefillRole);
await page.fill('#contact-name', 'Dr. Jamie Rivera');
await page.fill('#contact-phone', 'jrivera@ousd.org');
await page.click('#contact-modal button:has-text("Save Changes")');

const rowsAfterEdit = await page.$$eval('#contacts-chabot-body tr', els => els.length);
if (rowsAfterEdit === 7) pass('editing a contact does not create a duplicate row');
else fail('editing does not duplicate', `expected 7, got ${rowsAfterEdit}`);
const editedRowText = await page.$eval('#contacts-chabot-body tr:first-child', el => el.innerText);
if (/Dr\. Jamie Rivera/.test(editedRowText) && /jrivera@ousd\.org/.test(editedRowText))
  pass('edited contact reflects new name and phone');
else fail('edited contact reflects changes', editedRowText);

// Add a NEW Chabot contact — the group-specific field (Name) must be present
await page.click('button:has-text("+ Add Contact")');
const addHeader = await page.$eval('#contact-modal-header', el => el.textContent.trim());
if (addHeader === 'Add Contact') pass('add modal header says Add'); else fail('add modal header', addHeader);
const nameFieldVisible = await page.$eval('#contact-name-group', el => getComputedStyle(el).display !== 'none');
if (nameFieldVisible) pass('Chabot-group modal shows the Name field'); else fail('Chabot modal shows Name field');
await page.fill('#contact-role', 'Yard Supervisor');
await page.fill('#contact-name', 'Ms. Torres');
await page.fill('#contact-when', 'Recess incidents, sensory breaks');
await page.click('#contact-modal button:has-text("Add Contact")');
const rowsAfterAdd = await page.$$eval('#contacts-chabot-body tr', els => els.length);
if (rowsAfterAdd === 8) pass(`new Chabot contact added (${rowsAfterAdd} rows)`);
else fail('new Chabot contact added', `expected 8, got ${rowsAfterAdd}`);

// OUSD group: the modal must hide the Name field (OUSD contacts are departments, not people)
const ousdAddButtons = await page.$$('button');
await page.evaluate(() => window.openContactModal('OUSD'));
const ousdNameHidden = await page.$eval('#contact-name-group', el => getComputedStyle(el).display === 'none');
if (ousdNameHidden) pass('OUSD-group modal hides the Name field'); else fail('OUSD modal hides Name field');
const ousdRoleLabel = await page.$eval('#contact-role-label', el => el.textContent.trim());
if (ousdRoleLabel === 'Department / Line *') pass('OUSD modal relabels Role to Department / Line');
else fail('OUSD modal relabels field', ousdRoleLabel);
await page.fill('#contact-role', 'Transportation Office');
await page.fill('#contact-when', 'Bus routes, accommodations');
await page.click('#contact-modal button:has-text("Add Contact")');
const ousdRowsAfter = await page.$$eval('#contacts-ousd-body tr', els => els.length);
if (ousdRowsAfter === 4) pass(`new OUSD contact added (${ousdRowsAfter} rows)`);
else fail('new OUSD contact added', `expected 4, got ${ousdRowsAfter}`);

// Empty-role rejected
await page.click('button:has-text("+ Add Contact")');
const beforeReject = await page.$$eval('#contacts-chabot-body tr', els => els.length);
await page.click('#contact-modal button:has-text("Add Contact")');
const afterReject = await page.$$eval('#contacts-chabot-body tr', els => els.length);
if (beforeReject === afterReject) pass('contact with empty role rejected'); else fail('empty-role contact rejected');
await page.click('#contact-modal button:has-text("Cancel")');

// This is a Member-level permission per the owner's instruction, not admin-gated:
// a plain parent must be able to edit/add contacts without switching role.
await toParent();
await page.evaluate(() => window.switchPage('contacts', null));
const editBtnVisibleAsParent = await page.isVisible('#contacts-chabot-body tr:first-child button');
if (editBtnVisibleAsParent) pass('contact Edit button visible to a plain Member (parent role)');
else fail('contact edit visible to Member');

// ================= DIRECTORY =================

await page.evaluate(() => window.switchPage('directory', null));
const dirCards = await page.$$eval('#directory-list .card', els => els.length);
if (dirCards === 6) pass(`seed directory providers render (${dirCards})`);
else fail('seed directory providers render', `expected 6, got ${dirCards}`);

const categoryHeadings = await page.$$eval('#directory-list h2', els => els.map(e => e.textContent));
if (categoryHeadings.includes('Support Groups') && categoryHeadings.includes('Occupational Therapy'))
  pass('directory grouped by category');
else fail('directory grouped by category', JSON.stringify(categoryHeadings));

// Edit an existing entry in place (no duplicate)
await page.click('#directory-list button:has-text("Edit")');
const dirEditHeader = await page.$eval('#resource-modal-header', el => el.textContent.trim());
if (dirEditHeader === 'Edit Provider') pass('directory edit modal says Edit Provider'); else fail('directory edit header', dirEditHeader);
const prefillName = await page.$eval('#resource-name', el => el.value);
if (prefillName === "Emma's OT Services") pass('directory edit modal pre-fills name'); else fail('directory edit pre-fill', prefillName);
await page.fill('#resource-contact', '510-555-9999 | updated@example.com');
await page.click('#resource-modal button:has-text("Save Changes")');
const dirCardsAfterEdit = await page.$$eval('#directory-list .card', els => els.length);
if (dirCardsAfterEdit === 6) pass('editing a provider does not duplicate it');
else fail('editing provider no duplicate', `expected 6, got ${dirCardsAfterEdit}`);
const editedDirText = await page.$eval('#directory-list', el => el.innerText);
if (/510-555-9999/.test(editedDirText)) pass('edited provider contact info updated');
else fail('edited provider contact updated');

// Flag -> appears in Mod Dashboard -> Clear Flag keeps it, Remove deletes it
await page.click('#directory-list button:has-text("Flag")');
const flaggedBadge = await page.waitForSelector('#directory-list .badge-flagged', { timeout: 3000 }).catch(() => null);
if (flaggedBadge) pass('flagged provider shows a Flagged badge'); else fail('flagged provider shows badge');

await toAdmin();
await page.evaluate(() => window.switchPage('mod-dashboard', null));
const modDashText = await page.$eval('#flagged-posts', el => el.innerText);
if (/Emma's OT Services/.test(modDashText) && /directory/i.test(modDashText))
  pass('flagged directory entry appears in Mod Dashboard, tagged Directory');
else fail('flagged directory entry in Mod Dashboard', modDashText.slice(0, 300));

await page.click('#flagged-posts button:has-text("Keep Entry")');
const dirCardsAfterClear = await page.evaluate(() => document.querySelectorAll('#directory-list .card').length);
// clearing from the mod dashboard doesn't re-render the (inactive) directory page,
// so check the underlying data instead of the DOM of a page that isn't active
const clearedInData = await page.evaluate(() => directory.find(d => d.name === "Emma's OT Services").flagged === false);
if (clearedInData) pass('Clear Flag un-flags the provider (entry kept)'); else fail('Clear Flag keeps entry, clears flag');

// ================= ADD PROVIDER FROM DIRECTORY =================

await page.evaluate(() => window.switchPage('directory', null));
await page.click('button:has-text("+ Add a Provider")');
const addProviderHeader = await page.$eval('#resource-modal-header', el => el.textContent.trim());
if (addProviderHeader === 'Add a Provider') pass('add-provider modal says Add a Provider'); else fail('add-provider header', addProviderHeader);
await page.selectOption('#resource-category', 'Camp or Activity');
await page.fill('#resource-name', 'QA Summer Adventure Camp');
await page.fill('#resource-desc', 'Small groups, sensory-friendly.');
await page.click('#resource-modal button:has-text("Add Provider")');
const dirCardsAfterAdd = await page.$$eval('#directory-list .card', els => els.length);
if (dirCardsAfterAdd === 7) pass(`new provider added to Directory (${dirCardsAfterAdd})`);
else fail('new provider added to Directory', `expected 7, got ${dirCardsAfterAdd}`);
const camps = await page.$$eval('#directory-list h2', els => els.map(e => e.textContent));
if (camps.includes('Camp or Activity')) pass('new category heading appears for new provider');
else fail('new category heading appears', JSON.stringify(camps));

// Empty-name rejected
await page.click('button:has-text("+ Add a Provider")');
const beforeEmptyName = await page.$$eval('#directory-list .card', els => els.length);
await page.click('#resource-modal button:has-text("Add Provider")');
const afterEmptyName = await page.$$eval('#directory-list .card', els => els.length);
if (beforeEmptyName === afterEmptyName) pass('provider with empty name rejected'); else fail('empty-name provider rejected');
await page.click('#resource-modal button:has-text("Cancel")');

// Directory editing is also a Member permission, not admin-gated
await toParent();
await page.evaluate(() => window.switchPage('directory', null));
const dirEditVisibleAsParent = await page.isVisible('#directory-list button:has-text("Edit")');
if (dirEditVisibleAsParent) pass('directory Edit button visible to a plain Member (parent role)');
else fail('directory edit visible to Member');

// ================= ROLE MODEL =================

const parentSeesAdminNav = await page.$eval('#admin-nav-section', el => getComputedStyle(el).display === 'none');
if (parentSeesAdminNav) pass('parent cannot see Site Admin nav'); else fail('parent cannot see Site Admin nav');
const parentSeesModNav = await page.$eval('#mod-nav-section', el => getComputedStyle(el).display === 'none');
if (parentSeesModNav) pass('parent cannot see Moderation nav'); else fail('parent cannot see Moderation nav');

await toAdmin();
const adminSeesManageTeam = await page.evaluate(() => {
  const link = [...document.querySelectorAll('.nav-link')].find(l => l.textContent.includes('Manage Team'));
  return !!link && link.getBoundingClientRect().width > 0;
});
if (adminSeesManageTeam) pass('admin sees Manage Team link'); else fail('admin sees Manage Team link');

// A moderator (not admin) must NOT see Manage Team
await toParent();
await page.click('.user-badge button'); // parent -> mod
const modLabel = await page.$eval('#current-user', el => el.textContent.trim());
if (modLabel === 'You: Moderator') pass('reached Moderator state for permission check'); else fail('reached Moderator state', modLabel);
const modSeesAdminNav = await page.$eval('#admin-nav-section', el => getComputedStyle(el).display === 'none');
if (modSeesAdminNav) pass('moderator (non-admin) cannot see Site Admin nav');
else fail('moderator cannot see Site Admin nav');

// ================= ID-COLLISION REGRESSION =================
// A real bug: nextContactId/nextDirectoryId/nextTeamId once started at the
// round number their seeds were built from (300/400/500) instead of above
// the highest seed id -- so the SECOND item added collided with a seed
// record's id, and removing/editing one silently corrupted the other.
// Add three of each and confirm every id in play is unique.

await page.evaluate(() => window.switchPage('contacts', null));
for (const label of ['QA Contact A', 'QA Contact B', 'QA Contact C']) {
  await page.click('button:has-text("+ Add Contact")');
  await page.fill('#contact-role', label);
  await page.click('#contact-modal button:has-text("Add Contact")');
}
const contactIds = await page.evaluate(() => contacts.map(c => c.id));
if (new Set(contactIds).size === contactIds.length) pass('no duplicate contact ids after several adds');
else fail('no duplicate contact ids', JSON.stringify(contactIds));

await page.evaluate(() => window.switchPage('directory', null));
for (const label of ['QA Dir A', 'QA Dir B', 'QA Dir C']) {
  await page.click('button:has-text("+ Add a Provider")');
  await page.fill('#resource-name', label);
  await page.click('#resource-modal button:has-text("Add Provider")');
}
const directoryIds = await page.evaluate(() => directory.map(d => d.id));
if (new Set(directoryIds).size === directoryIds.length) pass('no duplicate directory ids after several adds');
else fail('no duplicate directory ids', JSON.stringify(directoryIds));

await toAdmin();
await page.evaluate(() => window.switchPage('manage-team', null));
for (const label of ['QA Team A', 'QA Team B', 'QA Team C']) {
  await page.click('button:has-text("+ Add Team Member")');
  await page.fill('#team-name', label);
  await page.selectOption('#team-role', 'mod');
  await page.click('#team-modal button:has-text("Save")');
}
const teamIds = await page.evaluate(() => team.map(t => t.id));
if (new Set(teamIds).size === teamIds.length) pass('no duplicate team ids after several adds');
else fail('no duplicate team ids', JSON.stringify(teamIds));

// The specific failure mode this caught: removing one new member must never
// also remove the seed admin "You" (id 501) via a collided id.
const youStillAdmin = await page.evaluate(() => team.some(t => t.name === 'You' && t.role === 'admin'));
if (youStillAdmin) pass('seed admin "You" survives unrelated team additions');
else fail('seed admin "You" survives unrelated team additions', 'You was removed -- id collision');

await toParent();

// ================= MANAGE TEAM =================

await toAdmin();
await page.evaluate(() => window.switchPage('manage-team', null));

const seedAdmins = await page.$eval('#admin-list', el => el.innerText);
if (/^You$/m.test(seedAdmins)) pass('seed admin "You" listed'); else fail('seed admin listed', seedAdmins);
const seedMods = await page.$eval('#mod-list', el => el.innerText);
if (/Sarah P\./.test(seedMods) && /Marcus T\./.test(seedMods)) pass('seed moderators listed');
else fail('seed moderators listed', seedMods);

// The sole admin cannot be removed (would orphan the hub)
const soleAdminRemoveVisible = await page.$$eval('#admin-list .team-row button', els => els.length);
if (soleAdminRemoveVisible === 0) pass('sole admin has no Remove button (cannot orphan the hub)');
else fail('sole admin has no Remove button', `found ${soleAdminRemoveVisible}`);

// Add a co-admin
await page.click('button:has-text("+ Add Team Member")');
await page.fill('#team-name', 'Priya (PTA co-lead)');
await page.selectOption('#team-role', 'admin');
await page.click('#team-modal button:has-text("Save")');
const adminsAfterAdd = await page.$eval('#admin-list', el => el.innerText);
if (/Priya \(PTA co-lead\)/.test(adminsAfterAdd)) pass('new admin added to Manage Team');
else fail('new admin added', adminsAfterAdd);

// With two admins, both now show Remove
const removeButtonsWithTwo = await page.$$eval('#admin-list .team-row button', els => els.length);
if (removeButtonsWithTwo === 2) pass('both admins show Remove once there are two');
else fail('both admins show Remove with two admins', `found ${removeButtonsWithTwo}`);

// Add a moderator
await page.click('button:has-text("+ Add Team Member")');
await page.fill('#team-name', 'QA New Mod');
await page.selectOption('#team-role', 'mod');
await page.click('#team-modal button:has-text("Save")');
const modsAfterAdd = await page.$eval('#mod-list', el => el.innerText);
if (/QA New Mod/.test(modsAfterAdd)) pass('new moderator added to Manage Team');
else fail('new moderator added', modsAfterAdd);

// Remove the moderator
const modRemoveBtn = await page.$('#mod-list .team-row:has-text("QA New Mod") button');
await modRemoveBtn.click();
const modsAfterRemove = await page.$eval('#mod-list', el => el.innerText);
if (!/QA New Mod/.test(modsAfterRemove)) pass('moderator removed from team');
else fail('moderator removed', modsAfterRemove);

// Remove the co-admin, back down to one -- Remove button should disappear again
const adminRemoveBtn = await page.$('#admin-list .team-row:has-text("Priya") button');
await adminRemoveBtn.click();
const removeButtonsBackToOne = await page.$$eval('#admin-list .team-row button', els => els.length);
if (removeButtonsBackToOne === 0) pass('back to one admin: Remove button disappears again');
else fail('Remove disappears at one admin', `found ${removeButtonsBackToOne}`);

// Mod Dashboard roster reflects the team array, not hardcoded text
await page.evaluate(() => window.switchPage('mod-dashboard', null));
const dashboardTeamText = await page.$eval('#mod-team-list', el => el.innerText);
if (/Sarah P\./.test(dashboardTeamText) && /admin/i.test(dashboardTeamText) && /mod/i.test(dashboardTeamText))
  pass('Mod Dashboard roster reflects the live team array with role badges');
else fail('Mod Dashboard roster reflects team array', dashboardTeamText);

// ================= CONTENT: the ported Navigator material =================

await toParent();
await page.evaluate(() => window.switchPage('navigator', null));
const navText = await page.$eval('#navigator', el => el.innerText);

const decoderTerms = ['IEP', 'SST', 'IDEA', 'Evaluation', 'RSP', 'OT', 'ESY'];
const missingTerms = decoderTerms.filter(t => !navText.includes(t));
if (missingTerms.length === 0) pass('Decoder Ring includes all key terms (incl. IDEA, ESY)');
else fail('Decoder Ring includes all key terms', `missing: ${missingTerms.join(', ')}`);

if (/DAY 0/.test(navText) && /BY DAY 15/.test(navText) && /BY DAY 60/.test(navText))
  pass('the shared Day 0/15/60 schedule is present (was missing entirely before)');
else fail('shared schedule present', navText.includes('DAY') ? 'partial match' : 'not found at all');

if (/56321/.test(navText)) pass('schedule cites the actual Education Code sections');
else fail('schedule cites Education Code', 'citation not found');

if (/How to Ask/.test(navText)) pass('Magic Words cross-links to the full How to Ask library');
else fail('Magic Words cross-links to How to Ask');

await page.evaluate(() => window.switchPage('guidelines', null));
const guidelinesText = await page.$eval('#guidelines', el => el.innerText);
if (/Three Promises/.test(guidelinesText) && /Ask in writing, every time/.test(guidelinesText))
  pass('Three Promises ported into Community Guidelines');
else fail('Three Promises ported', guidelinesText.slice(-400));

await page.evaluate(() => window.switchPage('contacts', null));
const wideResourcesText = await page.$eval('#contacts', el => el.innerText);
if (/DREDF/.test(wideResourcesText) && /Family Resource Navigators/.test(wideResourcesText) && /SB 946/.test(wideResourcesText))
  pass('real outside resources (DREDF, Family Resource Navigators, SB 946) ported into Contacts');
else fail('outside resources ported', wideResourcesText.slice(0, 300));

if (errs.length === 0) pass('no console errors across the whole run'); else fail('no console errors', errs.join(' | '));
await browser.close();

const failed = results.filter(r => !r.ok);
console.log(results.map(r => `${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? '\n        → ' + r.detail : ''}`).join('\n'));
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
