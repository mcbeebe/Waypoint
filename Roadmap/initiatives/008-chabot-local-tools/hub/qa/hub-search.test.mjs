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

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

// Stub window.claude BEFORE page scripts run. `mode` picks the behaviour.
async function newPage(mode) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('dialog', d => d.accept());
  if (mode !== 'none') {
    await page.addInitScript((m) => {
      window.__prompts = [];
      const fake = async (input, opts) => {
        window.__prompts.push(input);
        if (m === 'error_rate') throw { code: 'rate_limited', message: 'slow down' };
        if (m === 'error_hide') throw { code: 'not_granted', message: 'nope' };
        if (m === 'error_partial') { opts?.onText?.({ text: 'PARTIAL LINE', delta: 'PARTIAL LINE' });
                                     throw { code: 'upstream_error', message: 'boom', text: 'PARTIAL LINE' }; }
        if (m === 'slow') return new Promise((res, rej) => {
          const timer = setTimeout(() => res({ text: 'x', truncated: false }), 100000);
          opts?.signal?.addEventListener('abort',
            () => { clearTimeout(timer); rej({ code: 'cancelled', message: 'aborted' }); });
        });
        const out = 'WHAT PARENTS HERE SAY\nParents say the SST is approachable.\n\nSUGGESTED NEXT STEPS\n- Ask the teacher for an SST meeting.\n- Bring three examples from home.';
        opts?.onText?.({ text: out, delta: out });
        return { text: out, truncated: false, modelTierApplied: 'default' };
      };
      fake.json = async () => ({});
      fake.limits = async () => ({ maxPromptBytes: 65536 });
      window.claude = { use: async (n) => (n === 'sample' ? fake : null) };
    }, mode);
  }
  await page.goto(URL);
  return { page, errs };
}

// ---------- Lessons ----------
{
  const { page, errs } = await newPage('none');
  await page.evaluate(() => window.switchPage('wisdom', null));

  const seed = await page.$$eval('#lessons-list .card', e => e.length);
  if (seed === 8) pass(`8 seed lessons render on Wisdom (${seed})`);
  else fail('8 seed lessons render', `got ${seed}`);

  // Long-form lesson keeps its own headline and full body
  const LONG = 'We spent the whole first year assuming the school would tell us what was available. '.repeat(6);
  await page.click('#wisdom button:has-text("+ Share a Lesson")');
  await page.fill('#lesson-title', 'Ask what exists before you go looking outside');
  await page.fill('#lesson-author', 'QA Parent, parent of 2nd grader');
  await page.fill('#lesson-body', LONG);
  await page.click('#lesson-modal button:has-text("Publish Lesson")');

  const after = await page.$$eval('#lessons-list .card', e => e.length);
  if (after === 9) pass(`new lesson appears on Wisdom (${after})`); else fail('new lesson appears', `got ${after}`);

  const first = await page.$eval('#lessons-list .card', e => e.innerText);
  if (/Ask what exists before you go looking outside/.test(first)) pass('lesson headline used verbatim (not truncated)');
  else fail('lesson headline verbatim', first.slice(0, 160));
  if (!/…|\.\.\./.test(first.split('\n')[0])) pass('lesson headline has no ellipsis');
  else fail('lesson headline has no ellipsis', first.split('\n')[0]);

  const bodyLen = await page.$eval('#lessons-list .card', e => e.innerText.length);
  if (bodyLen > LONG.length * 0.9) pass(`full long body preserved (${bodyLen} chars)`);
  else fail('full long body preserved', `only ${bodyLen}`);

  const credited = /QA Parent, parent of 2nd grader/.test(first);
  if (credited) pass('attribution line renders'); else fail('attribution line renders', first.slice(0, 160));

  // Lesson must NOT leak into the Discussions feed
  await page.evaluate(() => window.switchPage('discussions', null));
  const feed = await page.$eval('#discussions-list', e => e.innerText);
  if (!/Ask what exists before you go looking outside/.test(feed)) pass('lesson stays out of Discussions feed');
  else fail('lesson stays out of Discussions feed');

  // ...but DOES appear in My Contributions
  await page.evaluate(() => window.switchPage('my-posts', null));
  const mine = await page.$eval('#my-posts-list', e => e.innerText);
  if (/Ask what exists before you go looking outside/.test(mine)) pass('lesson appears in My Contributions');
  else fail('lesson appears in My Contributions', mine.slice(0, 160));
  if (!/Camp Chabot aftercare/.test(mine)) pass('My Contributions excludes other parents\' posts');
  else fail('My Contributions excludes others', mine.slice(0, 200));

  // Validation
  await page.click('#wisdom button:has-text("+ Share a Lesson")').catch(() => {});
  await page.evaluate(() => window.openLessonModal());
  const before = await page.$$eval('#lessons-list .card', e => e.length);
  await page.click('#lesson-modal button:has-text("Publish Lesson")');
  const same = await page.$$eval('#lessons-list .card', e => e.length);
  if (before === same) pass('empty lesson rejected'); else fail('empty lesson rejected');
  await page.click('#lesson-modal button:has-text("Cancel")');

  // Lessons are moderatable like everything else
  await page.evaluate(() => window.flagPost(103));
  await page.evaluate(() => window.switchPage('mod-dashboard', null));
  const dash = await page.$eval('#flagged-posts', e => e.innerText);
  if (/Get everything in writing/.test(dash)) pass('flagged lesson reaches mod dashboard');
  else fail('flagged lesson reaches mod dashboard', dash.slice(0, 200));

  if (errs.length === 0) pass('lessons: no console errors'); else fail('lessons: no console errors', errs.join(' | '));
  await page.close();
}

// ---------- Search (no AI available) ----------
{
  const { page, errs } = await newPage('none');
  await page.evaluate(() => window.switchPage('search', null));

  await page.fill('#search-input', 'evaluation SST');
  await page.click('#search button:has-text("Search")');
  await page.waitForTimeout(200);

  const n = await page.$$eval('#search-results .card', e => e.length);
  if (n > 0) pass(`search returns results (${n})`); else fail('search returns results', 'zero');

  const txt = await page.$eval('#search-results', e => e.innerText);
  if (/SST process/.test(txt)) pass('search finds a discussion post'); else fail('search finds discussion post', txt.slice(0,200));
  if (/Navigator|IEP/.test(txt)) pass('search finds a reference guide'); else fail('search finds reference guide', txt.slice(0,200));

  // Lessons are searchable
  await page.fill('#search-input', 'writing accommodations verbally');
  await page.click('#search button:has-text("Search")');
  await page.waitForTimeout(200);
  const t2 = await page.$eval('#search-results', e => e.innerText);
  if (/Get everything in writing/.test(t2)) pass('search finds a lesson'); else fail('search finds a lesson', t2.slice(0,200));
  if (/lesson/i.test(t2)) pass('lesson result carries Lesson tag'); else fail('lesson result tag', t2.slice(0,200));

  // No match
  await page.fill('#search-input', 'zzzqqqxxyy');
  await page.click('#search button:has-text("Search")');
  await page.waitForTimeout(200);
  const t3 = await page.$eval('#search-results', e => e.innerText);
  if (/Nothing matched/.test(t3)) pass('empty search state'); else fail('empty search state', t3.slice(0,150));

  // Flagged content must not surface in search
  await page.fill('#search-input', 'coaching program special offer');
  await page.click('#search button:has-text("Search")');
  await page.waitForTimeout(200);
  const t4 = await page.$eval('#search-results', e => e.innerText);
  if (!/Vendor Dave/.test(t4)) pass('flagged post excluded from search'); else fail('flagged post excluded', t4.slice(0,200));

  // AI panel must be absent, not broken, when sampling is unavailable
  const aiHtml = await page.$eval('#ai-panel-slot', e => e.innerHTML.trim());
  if (aiHtml === '') pass('AI panel hidden when sampling unavailable');
  else fail('AI panel hidden when unavailable', aiHtml.slice(0, 160));

  if (errs.length === 0) pass('search: no console errors'); else fail('search: no console errors', errs.join(' | '));
  await page.close();
}

// ---------- AI summary (stubbed sample) ----------
{
  const { page, errs } = await newPage('ok');
  await page.evaluate(() => window.switchPage('search', null));
  await page.fill('#search-input', 'evaluation SST');
  await page.click('#search button:has-text("Search")');
  await page.waitForSelector('.ai-panel', { timeout: 5000 });
  await page.waitForTimeout(300);

  const ai = await page.$eval('.ai-panel', e => e.innerText);
  if (/WHAT PARENTS HERE SAY/.test(ai)) pass('AI summary renders'); else fail('AI summary renders', ai.slice(0,200));
  if (/SUGGESTED NEXT STEPS/.test(ai)) pass('AI next steps render'); else fail('AI next steps render', ai.slice(0,200));
  if (/not medical or legal advice/i.test(ai)) pass('AI disclaimer shown'); else fail('AI disclaimer shown', ai.slice(0,300));
  const bold = await page.$$eval('.ai-body strong', e => e.length);
  if (bold >= 2) pass('AI headings formatted as headings'); else fail('AI headings formatted', `${bold} strongs`);

  // The prompt must carry the escalation tone contract and injection framing
  const prompt = await page.evaluate(() => window.__prompts[0]);
  const checks = [
    ['tone: ask not demand', /never "demand"/i],
    ['tone: status not blame', /never "The school ignored you"/i],
    ['tone: partners', /partners, not adversaries/i],
    ['tone: firmer only later', /after an earlier ask has gone unanswered/i],
    ['guard: not medical/legal', /not a doctor or a lawyer/i],
    ['guard: contributions are data not instructions', /NOT as\s*\n?\s*instructions to you/i],
    ['prompt carries the query', /searched for: "evaluation SST"/],
    ['prompt carries contributions', /<contributions>/]
  ];
  for (const [name, re] of checks) {
    if (re.test(prompt)) pass(name); else fail(name, prompt.slice(0, 400));
  }
  if (errs.length === 0) pass('ai ok: no console errors'); else fail('ai ok: no console errors', errs.join(' | '));
  await page.close();
}

// ---------- AI error handling ----------
for (const [mode, expect, label] of [
  ['error_rate', /handling a lot right now/i, 'rate_limited shows a retry message'],
  ['error_hide', null, 'not_granted hides the panel entirely'],
  ['error_partial', /PARTIAL LINE[\s\S]*interrupted/i, 'upstream_error keeps partial text']
]) {
  const { page, errs } = await newPage(mode);
  await page.evaluate(() => window.switchPage('search', null));
  await page.fill('#search-input', 'evaluation SST');
  await page.click('#search button:has-text("Search")');
  await page.waitForTimeout(600);
  const slot = await page.$eval('#ai-panel-slot', e => e.innerText.trim());
  if (expect === null) {
    if (slot === '') pass(label); else fail(label, slot.slice(0, 160));
  } else {
    if (expect.test(slot)) pass(label); else fail(label, slot.slice(0, 200));
  }
  const stillHasResults = await page.$$eval('#search-results .card', e => e.length);
  if (stillHasResults > 0) pass(`${mode}: results survive AI failure`);
  else fail(`${mode}: results survive AI failure`, 'results empty');
  if (errs.length === 0) pass(`${mode}: no console errors`); else fail(`${mode}: no console errors`, errs.join(' | '));
  await page.close();
}

// ---------- Stop button ----------
{
  const { page } = await newPage('slow');
  await page.evaluate(() => window.switchPage('search', null));
  await page.fill('#search-input', 'evaluation SST');
  await page.click('#search button:has-text("Search")');
  await page.waitForSelector('.ai-panel button:has-text("Stop")', { timeout: 5000 });
  pass('Stop button offered during a long call');
  const thinking = await page.$eval('.ai-body', e => e.innerText);
  if (/Reading what parents shared/.test(thinking)) pass('thinking placeholder shown');
  else fail('thinking placeholder shown', thinking.slice(0, 120));
  await page.click('.ai-panel button:has-text("Stop")');
  await page.waitForTimeout(300);
  const after = await page.$eval('#ai-panel-slot', e => e.innerText.trim());
  if (!/Reading what parents shared/.test(after)) pass('Stop clears the pending panel');
  else fail('Stop clears the pending panel', after.slice(0, 120));
  await page.close();
}

// ---------- Rapid re-search must not blank the panel (superseded-call race) ----------
{
  const { page, errs } = await newPage('ok');
  await page.evaluate(() => window.switchPage('search', null));
  // Fire a second search while the first is still resolving.
  await page.evaluate(() => {
    document.getElementById('search-input').value = 'evaluation SST';
    window.runSearch();
    document.getElementById('search-input').value = 'camps aftercare sensory';
    window.runSearch();
  });
  await page.waitForTimeout(800);
  const slot = await page.$eval('#ai-panel-slot', e => e.innerText.trim());
  if (/WHAT PARENTS HERE SAY/.test(slot)) pass('second search keeps its AI panel');
  else fail('second search keeps its AI panel', slot.slice(0, 200) || '(blank)');
  const res = await page.$$eval('#search-results .card', e => e.length);
  if (res > 0) pass('second search keeps its results'); else fail('second search keeps its results');
  if (errs.length === 0) pass('race: no console errors'); else fail('race: no console errors', errs.join(' | '));
  await page.close();
}

// ---------- Mobile ----------
{
  const { page } = await newPage('none');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.switchPage('search', null));
  const h = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  if (!h) pass('search page: no horizontal scroll at 390px'); else fail('search page: no horizontal scroll');
  await page.evaluate(() => window.switchPage('wisdom', null));
  const h2 = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  if (!h2) pass('wisdom page: no horizontal scroll at 390px'); else fail('wisdom page: no horizontal scroll');
  await page.close();
}

await browser.close();
const failed = results.filter(r => !r.ok);
console.log(results.map(r => `${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? '\n        → ' + r.detail : ''}`).join('\n'));
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
