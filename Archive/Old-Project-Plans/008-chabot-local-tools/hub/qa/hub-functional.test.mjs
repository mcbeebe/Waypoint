import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const FILE = join(HERE, '..', 'chabot-hub.html');



const results = [];
const pass = (name) => results.push({ ok: true, name });
const fail = (name, detail) => results.push({ ok: false, name, detail });

// Count what a parent actually sees. renderPosts() refreshes every list on each
// mutation, so this is accurate regardless of which page is active.
const threadCount = () => page.$$eval('#discussions-list .thread', els => els.length);

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));
page.on('dialog', (d) => d.accept());

await page.goto(pathToFileURL(FILE).href);

// --- 1. All pages reachable via sidebar nav ---
const navLinks = await page.$$eval('.nav-link', els => els.map(e => e.textContent.trim()));
const expectedNav = ['Home', 'Navigator (Roadmap)', 'Discussions', 'Wisdom', 'My Contributions',
  'Community Guidelines', 'Key Resources', 'IEP Essentials', 'Classroom & Accommodations',
  'How to Ask (Templates)', 'Local Providers', 'School/District Contacts'];
for (const label of expectedNav) {
  if (navLinks.some(n => n.startsWith(label))) pass(`nav link present: ${label}`);
  else fail(`nav link present: ${label}`, `got: ${JSON.stringify(navLinks)}`);
}

// Click through every non-mod nav link, assert the page becomes active & has an h1
const pageIds = ['home','navigator','discussions','my-posts','guidelines','resources',
  'iep-guide','classroom','directory','contacts','wisdom','how-to-ask'];
for (const id of pageIds) {
  await page.evaluate((pid) => window.switchPage(pid, null), id);
  const active = await page.$eval(`#${id}`, el => el.classList.contains('active'));
  const h1 = await page.$eval(`#${id} h1`, el => el.textContent.trim()).catch(() => null);
  const others = await page.$$eval('.page.active', els => els.length);
  if (active && h1 && others === 1) pass(`page renders: ${id} ("${h1}")`);
  else fail(`page renders: ${id}`, `active=${active} h1=${h1} activeCount=${others}`);
}

// --- 2. Seed posts render with NO pending badge anywhere ---
await page.evaluate(() => window.switchPage('discussions', null));
const seedThreads = await threadCount();
if (seedThreads === 4) pass(`seed posts render (${seedThreads} threads)`);
else fail('seed posts render', `expected 4, got ${seedThreads}`);

const bodyText = await page.$eval('body', el => el.innerText);
if (!/pending review/i.test(bodyText)) pass('no "pending review" copy anywhere');
else fail('no "pending review" copy anywhere', 'found "pending review" in rendered text');

const pendingBadges = await page.$$eval('.badge-pending, .tag-pending', els => els.length);
if (pendingBadges === 0) pass('no pending badges in DOM');
else fail('no pending badges in DOM', `found ${pendingBadges}`);

// --- 2b. My Contributions starts empty (it is "mine", not "everyone's") ---
await page.evaluate(() => window.switchPage('my-posts', null));
const mineAtStart = await page.$eval('#my-posts-list', el => el.innerText);
if (/haven't posted anything yet/.test(mineAtStart)) pass('My Contributions empty before you post');
else fail('My Contributions empty before you post', mineAtStart.slice(0, 160));
await page.evaluate(() => window.switchPage('discussions', null));

// --- 2c. The two destinations are legible and cross-linked ---
const navText = await page.$eval('.sidebar', el => el.innerText);
if (/Discussions/.test(navText) && /Wisdom/.test(navText)) pass('nav names both destinations');
else fail('nav names both destinations', navText.slice(0, 200));
if (/short/i.test(navText) && /long-form/i.test(navText)) pass('nav labels which format goes where');
else fail('nav labels format', navText.slice(0, 200));

await page.evaluate(() => window.switchPage('discussions', null));
const discSub = await page.$eval('#discussions .subtitle', el => el.innerText);
if (/Wisdom/.test(discSub)) pass('Discussions points long stories to Wisdom');
else fail('Discussions points to Wisdom', discSub);

await page.evaluate(() => window.switchPage('wisdom', null));
const wisH1 = await page.$eval('#wisdom h1', el => el.textContent.trim());
if (wisH1 === 'Wisdom') pass('Wisdom page headline matches its nav name');
else fail('Wisdom headline matches nav', wisH1);
const wisSub = await page.$eval('#wisdom .subtitle', el => el.innerText);
if (/Discussions/.test(wisSub)) pass('Wisdom points short tips to Discussions');
else fail('Wisdom points to Discussions', wisSub);
await page.evaluate(() => window.switchPage('discussions', null));

// --- 3. Posting a question: goes live immediately ---
await page.click('#discussions button:has-text("+ Ask a Question")');
const modalOpen = await page.$eval('#post-modal', el => el.classList.contains('open'));
if (modalOpen) pass('question modal opens'); else fail('question modal opens');

await page.fill('#question-text', 'QA TEST: does the aftercare program have a quiet room?');
await page.fill('#question-author', 'QA Parent');
await page.click('#post-modal button:has-text("Post Question")');

const modalClosed = await page.$eval('#post-modal', el => !el.classList.contains('open'));
if (modalClosed) pass('modal closes after submit'); else fail('modal closes after submit');

const afterPost = await threadCount();
if (afterPost === 5) pass(`new post appears immediately (${afterPost} threads)`);
else fail('new post appears immediately', `expected 5, got ${afterPost}`);

const firstThreadText = await page.$eval('#discussions-list .thread', el => el.innerText);
if (/QA TEST/.test(firstThreadText)) pass('new post is at top of list');
else fail('new post is at top of list', firstThreadText.slice(0, 120));
if (!/flagged/i.test(firstThreadText)) pass('new post has no status badge');
else fail('new post has no status badge', firstThreadText.slice(0, 120));

// --- 4. Post appears on Home and My Contributions too ---
for (const [pid, listId] of [['home','home-threads'], ['my-posts','my-posts-list']]) {
  await page.evaluate((p) => window.switchPage(p, null), pid);
  const t = await page.$eval(`#${listId}`, el => el.innerText);
  if (/QA TEST/.test(t)) pass(`new post visible on ${pid}`);
  else fail(`new post visible on ${pid}`, t.slice(0, 120));
}

// --- 5. Tip modal ---
await page.evaluate(() => window.switchPage('discussions', null));
await page.click('#discussions button:has-text("+ Share a Tip")');
await page.fill('#tip-text', 'QA TIP: visual timer on the fridge helped our mornings.');
await page.fill('#tip-author', 'QA Parent');
await page.click('#tip-modal button:has-text("Share Tip")');
const afterTip = await threadCount();
if (afterTip === 6) pass(`tip posts immediately (${afterTip} threads)`);
else fail('tip posts immediately', `expected 6, got ${afterTip}`);

// --- 6. Resource modal from Directory page: lands in the Directory, NOT Discussions ---
// (this used to be a real bug -- "+ Add a Provider" wrote into the generic
// Discussions feed as a tip; it now writes into the structured `directory` array)
await page.evaluate(() => window.switchPage('directory', null));
const dirCountBefore = await page.$$eval('#directory-list .card', els => els.length);
await page.click('#directory button:has-text("+ Add a Provider")');
await page.fill('#resource-name', 'QA RESOURCE: East Bay Feeding Therapy');
await page.fill('#resource-desc', 'Sliding scale, accepts Medi-Cal.');
await page.click('#resource-modal button:has-text("Add Provider")');
const dirCountAfter = await page.$$eval('#directory-list .card', els => els.length);
if (dirCountAfter === dirCountBefore + 1) pass(`new provider appears in Directory (${dirCountAfter} cards)`);
else fail('new provider appears in Directory', `expected ${dirCountBefore + 1}, got ${dirCountAfter}`);

const dirText = await page.$eval('#directory-list', el => el.innerText);
if (/QA RESOURCE/.test(dirText)) pass('provider name renders in Directory');
else fail('provider name renders in Directory', dirText.slice(0, 200));

await page.evaluate(() => window.switchPage('discussions', null));
const threadsAfterProvider = await threadCount();
if (threadsAfterProvider === 6) pass('adding a provider does not leak into the Discussions feed');
else fail('provider does not leak into Discussions', `expected 6 (unchanged), got ${threadsAfterProvider}`);

// --- 7. Mod section hidden for parents ---
const modHiddenForParent = await page.$eval('#mod-nav-section',
  el => getComputedStyle(el).display === 'none');
if (modHiddenForParent) pass('mod nav hidden in parent view');
else fail('mod nav hidden in parent view');

// --- 8. Toggle to mod view ---
await page.click('.user-badge button');
const modVisible = await page.$eval('#mod-nav-section',
  el => getComputedStyle(el).display !== 'none');
const userLabel = await page.$eval('#current-user', el => el.textContent.trim());
if (modVisible) pass('mod nav visible after toggle'); else fail('mod nav visible after toggle');
if (userLabel === 'You: Moderator') pass('user label updates to Moderator');
else fail('user label updates to Moderator', userLabel);

// --- 9. Mod dashboard shows ONLY flagged content ---
await page.evaluate(() => window.switchPage('mod-dashboard', null));
const dashText = await page.$eval('#mod-dashboard', el => el.innerText);
if (!/pending/i.test(dashText)) pass('mod dashboard has no pending queue');
else fail('mod dashboard has no pending queue', dashText.slice(0, 200));

const flaggedCount = await page.$eval('#flagged-count', el => el.textContent.trim());
if (flaggedCount === '1') pass('flagged count = 1 (seed spam post)');
else fail('flagged count = 1', `got ${flaggedCount}`);

const flaggedCards = await page.$$eval('#flagged-posts .card', els => els.length);
if (flaggedCards === 1) pass('one flagged card rendered');
else fail('one flagged card rendered', `got ${flaggedCards}`);

const flaggedText = await page.$eval('#flagged-posts', el => el.innerText);
if (/self-promotion/i.test(flaggedText)) pass('flag reason shown on card');
else fail('flag reason shown on card', flaggedText.slice(0, 150));

// --- 10. Community flag flow: parent flags a post -> shows in dashboard ---
await page.evaluate(() => window.flagPost(1));
const flaggedAfter = await page.$eval('#flagged-count', el => el.textContent.trim());
if (flaggedAfter === '2') pass('community flag adds to mod queue');
else fail('community flag adds to mod queue', `got ${flaggedAfter}`);

const navCount = await page.$eval('#mod-nav-count', el => el.textContent.trim());
if (navCount === '(2)') pass('sidebar shows flag count badge');
else fail('sidebar shows flag count badge', `got "${navCount}"`);

// --- 11. Clear flag keeps post ---
const postsBeforeClear = await threadCount();
await page.evaluate(() => window.clearFlag(1));
const flaggedAfterClear = await page.$eval('#flagged-count', el => el.textContent.trim());
const postsAfterClear = await threadCount();
if (flaggedAfterClear === '1' && postsAfterClear === postsBeforeClear)
  pass('clear flag keeps post, removes from queue');
else fail('clear flag keeps post', `flagged=${flaggedAfterClear} posts=${postsAfterClear}/${postsBeforeClear}`);

// --- 12. Hide post removes it ---
await page.evaluate(() => window.hidePost(4));
const flaggedAfterHide = await page.$eval('#flagged-count', el => el.textContent.trim());
const postsAfterHide = await threadCount();
if (flaggedAfterHide === '0' && postsAfterHide === postsAfterClear - 1)
  pass('hide post removes it from community + queue');
else fail('hide post removes it', `flagged=${flaggedAfterHide} posts=${postsAfterHide}`);

const emptyState = await page.$eval('#flagged-posts', el => el.innerText);
if (/No flagged posts/.test(emptyState)) pass('empty state shows when queue is clear');
else fail('empty state shows when queue is clear', emptyState.slice(0, 100));

// --- 13. Role cycles mod -> admin -> parent (three states, not a toggle) ---
await page.click('.user-badge button'); // mod -> admin
const adminVisible = await page.$eval('#admin-nav-section',
  el => getComputedStyle(el).display !== 'none');
const modStillVisibleForAdmin = await page.$eval('#mod-nav-section',
  el => getComputedStyle(el).display !== 'none');
const adminLabel = await page.$eval('#current-user', el => el.textContent.trim());
if (adminVisible) pass('admin nav visible in admin view'); else fail('admin nav visible in admin view');
if (modStillVisibleForAdmin) pass('admin can still see mod nav (superset, not separate)');
else fail('admin can still see mod nav');
if (adminLabel === 'You: Admin') pass('user label updates to Admin'); else fail('user label updates to Admin', adminLabel);

await page.click('.user-badge button'); // admin -> parent
const modHiddenAgain = await page.$eval('#mod-nav-section',
  el => getComputedStyle(el).display === 'none');
const adminHiddenAgain = await page.$eval('#admin-nav-section',
  el => getComputedStyle(el).display === 'none');
const backLabel = await page.$eval('#current-user', el => el.textContent.trim());
const leftDashboard = await page.$eval('#mod-dashboard', el => !el.classList.contains('active'));
if (modHiddenAgain) pass('mod nav re-hidden in parent view'); else fail('mod nav re-hidden');
if (adminHiddenAgain) pass('admin nav re-hidden in parent view'); else fail('admin nav re-hidden');
if (backLabel === 'You: Parent (Demo)') pass('user label reverts'); else fail('user label reverts', backLabel);
if (leftDashboard) pass('leaves mod dashboard when switching back');
else fail('leaves mod dashboard when switching back');

// --- 14. Collapsibles work ---
await page.evaluate(() => window.switchPage('navigator', null));
await page.click('#navigator .collapsible-header');
const collapsibleOpen = await page.$eval('#navigator .collapsible-content',
  el => el.classList.contains('open'));
if (collapsibleOpen) pass('collapsible expands'); else fail('collapsible expands');

// --- 15. Thread expand ---
await page.evaluate(() => window.switchPage('discussions', null));
await page.click('#discussions-list .thread-header');
const threadOpen = await page.$eval('#discussions-list .thread-body',
  el => el.classList.contains('open'));
if (threadOpen) pass('thread expands to show body'); else fail('thread expands');

// --- 16. Empty-input validation ---
await page.click('#discussions button:has-text("+ Ask a Question")');
const before = await threadCount();
await page.click('#post-modal button:has-text("Post Question")');
const after = await threadCount();
if (before === after) pass('empty question rejected'); else fail('empty question rejected');
await page.click('#post-modal button:has-text("Cancel")');

// --- 17. Replies actually post (the "answers" half of ask-and-answer) ---
await page.evaluate(() => window.switchPage('discussions', null));
await page.evaluate(() => window.openReply(3));
const replyBoxVisible = await page.$$eval('.page.active .reply-text[data-post="3"]', els => els.length);
if (replyBoxVisible === 1) pass('reply box opens on the active page');
else fail('reply box opens on the active page', `found ${replyBoxVisible}`);

const repliesBefore = await page.$$eval('#discussions-list .thread', els =>
  els.find(e => /SST process/.test(e.innerText)).querySelectorAll('.comment').length);

await page.fill('.page.active .reply-text[data-post="3"]', 'QA REPLY: we brought a one-page list and it went fine.');
await page.fill('.page.active .reply-author[data-post="3"]', 'QA Parent');
await page.click('.page.active button:has-text("Post Reply")');

const sstThread = await page.$$eval('#discussions-list .thread', els => {
  const t = els.find(e => /SST process/.test(e.innerText));
  return { comments: t.querySelectorAll('.comment').length, text: t.innerText };
});
if (sstThread.comments === repliesBefore + 1) pass(`reply appended (${repliesBefore} → ${sstThread.comments})`);
else fail('reply appended', `expected ${repliesBefore + 1}, got ${sstThread.comments}`);
if (/QA REPLY/.test(sstThread.text)) pass('reply text renders in thread');
else fail('reply text renders in thread', sstThread.text.slice(0, 150));
if (/QA Parent/.test(sstThread.text)) pass('reply author renders');
else fail('reply author renders', sstThread.text.slice(0, 150));
if (/2 replies/.test(sstThread.text)) pass('reply count updates in header');
else fail('reply count updates in header', sstThread.text.slice(0, 150));

// Thread stays expanded through the re-render
const stayedOpen = await page.$$eval('#discussions-list .thread', els =>
  els.find(e => /SST process/.test(e.innerText))
     .querySelector('.thread-body').classList.contains('open'));
if (stayedOpen) pass('thread stays expanded after replying');
else fail('thread stays expanded after replying');

// --- 18. Reply from a THIRD page reads the right field (dup-ID regression) ---
// My Contributions lists only the viewer's own posts, so drive it through the UI
// rather than a hardcoded seed id.
await page.evaluate(() => window.switchPage('my-posts', null));
const myPostId = await page.$eval('#my-posts-list button[onclick^="openReply"]',
  el => Number(el.getAttribute('onclick').match(/\d+/)[0]));
await page.evaluate((id) => window.openReply(id), myPostId);
await page.fill('.page.active .reply-text', 'QA CROSSPAGE: replying from My Contributions.');
await page.click('.page.active button:has-text("Post Reply")');
const crossPage = await page.$eval('#my-posts-list', el => el.innerText);
if (/QA CROSSPAGE/.test(crossPage)) pass('reply works from a third page');
else fail('reply works from a third page', crossPage.slice(0, 200));

// Empty reply rejected
await page.evaluate((id) => window.openReply(id), myPostId);
const cBefore = await page.$$eval('#my-posts-list .comment', els => els.length);
await page.click('.page.active button:has-text("Post Reply")');
const cAfter = await page.$$eval('#my-posts-list .comment', els => els.length);
if (cBefore === cAfter) pass('empty reply rejected'); else fail('empty reply rejected');
await page.click('.page.active button:has-text("Cancel")');

// --- 19. Helpful vote increments once ---
await page.evaluate(() => window.switchPage('discussions', null));
await page.evaluate(() => window.toggleThread(1));
const votesBefore = await page.$$eval('#discussions-list .thread', els =>
  els.find(e => /Camp Chabot aftercare/.test(e.innerText)).innerText.match(/Helpful \((\d+)\)/)[1]);
await page.evaluate(() => window.voteHelpful(1));
const voteState = await page.$$eval('#discussions-list .thread', els => {
  const t = els.find(e => /Camp Chabot aftercare/.test(e.innerText));
  const btn = Array.from(t.querySelectorAll('button')).find(b => /Helpful/.test(b.textContent));
  return { label: btn.textContent.trim(), disabled: btn.disabled };
});
if (voteState.label === `👍 Helpful (${Number(votesBefore) + 1})`)
  pass(`helpful vote increments (${votesBefore} → ${Number(votesBefore) + 1})`);
else fail('helpful vote increments', `got "${voteState.label}" from ${votesBefore}`);
if (voteState.disabled) pass('helpful button disables after voting');
else fail('helpful button disables after voting');

await page.evaluate(() => window.voteHelpful(1));
const afterDouble = await page.$$eval('#discussions-list .thread', els =>
  els.find(e => /Camp Chabot aftercare/.test(e.innerText)).innerText.match(/Helpful \((\d+)\)/)[1]);
if (afterDouble === String(Number(votesBefore) + 1)) pass('double-vote is a no-op');
else fail('double-vote is a no-op', `count went to ${afterDouble}`);

// --- 20. User content is escaped, not executed ---
await page.click('#discussions button:has-text("+ Ask a Question")');
await page.fill('#question-text', '<img src=x onerror="window.__xss=1">XSS PROBE');
await page.fill('#question-author', '<b>bold author</b>');
await page.click('#post-modal button:has-text("Post Question")');
const xssFired = await page.evaluate(() => window.__xss === 1);
const injectedImgs = await page.$$eval('#discussions-list img', els => els.length);
const injectedBold = await page.$$eval('#discussions-list .card-meta b', els => els.length);
if (!xssFired) pass('injected script does not execute'); else fail('injected script does not execute');
if (injectedImgs === 0) pass('injected tag not parsed as HTML'); else fail('injected tag not parsed', `${injectedImgs} imgs`);
if (injectedBold === 0) pass('author name escaped'); else fail('author name escaped', `${injectedBold} <b>`);
const probeVisible = await page.$eval('#discussions-list', el => /XSS PROBE/.test(el.innerText));
if (probeVisible) pass('escaped content still renders as text'); else fail('escaped content still renders');

// --- 21. Mobile viewport ---
await page.setViewportSize({ width: 390, height: 844 });
const hScroll = await page.evaluate(() =>
  document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
if (!hScroll) pass('no horizontal scroll at 390px');
else fail('no horizontal scroll at 390px', 'page scrolls sideways');

// --- 18. Console clean ---
if (consoleErrors.length === 0) pass('no console errors');
else fail('no console errors', consoleErrors.join(' | '));

await browser.close();

const failed = results.filter(r => !r.ok);
console.log(results.map(r => `${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? '\n        → ' + r.detail : ''}`).join('\n'));
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
