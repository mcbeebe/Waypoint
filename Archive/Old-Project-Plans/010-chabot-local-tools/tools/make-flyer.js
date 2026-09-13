/**
 * Builds the Chabot flyer HTML (QR injected) and prints it to a letter PDF.
 * Usage: node make-flyer.js  — regenerate qr-datauri.txt first to change the QR target.
 */
const fs = require('fs');
const { chromium } = require('playwright-core');

const qr = fs.readFileSync('qr-datauri.txt', 'utf8').trim();

const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,550;0,9..144,700;1,9..144,500&family=Public+Sans:wght@400;600;700&display=swap">
<style>
  @page { size: letter; margin: 0; }
  * { margin: 0; box-sizing: border-box; }
  html, body { width: 8.5in; height: 11in; }
  body {
    font-family: "Public Sans", "Segoe UI", sans-serif; color: #37415C;
    background: #F5F1E9; display: flex; flex-direction: column;
    justify-content: space-between; padding: 0.72in 0.75in 0.55in;
  }
  .eyebrow { font-size: 14px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: #0876A0; margin-bottom: 16px; }
  h1 {
    font-family: "Fraunces", Georgia, serif; font-weight: 700;
    font-size: 58px; line-height: 1.04; color: #1B2A4A; margin-bottom: 12px;
  }
  h1 .accent { color: #0876A0; }
  .sub { font-family: "Fraunces", Georgia, serif; font-style: italic; font-size: 27px; color: #0E9F6E; }
  .points { display: flex; flex-direction: column; gap: 20px; }
  .point { display: grid; grid-template-columns: 46px 1fr; gap: 16px; align-items: start; }
  .point .ico { font-size: 30px; line-height: 1.2; }
  .point p { font-size: 18px; line-height: 1.45; }
  .point strong { color: #1B2A4A; }
  .chips { display: flex; gap: 12px; justify-content: center; }
  .chip {
    background: #FFFFFF; border: 1.5px solid #E3DCCE; border-radius: 99px;
    padding: 9px 20px; font-size: 14.5px; color: #37415C;
  }
  .chip b { color: #0876A0; }
  .qr-band {
    background: #1B2A4A; border-radius: 16px; padding: 32px 34px;
    display: grid; grid-template-columns: 1fr 2.1in; gap: 24px; align-items: center;
  }
  .qr-band h2 { font-family: "Fraunces", Georgia, serif; font-weight: 550; font-size: 33px; color: #FFFFFF; line-height: 1.15; margin-bottom: 10px; }
  .qr-band p { color: #B9C6D8; font-size: 15.5px; line-height: 1.5; }
  .qr-band .free { display: inline-block; margin-top: 12px; background: #0E9F6E; color: #FFFFFF; font-weight: 700; font-size: 12.5px; letter-spacing: .08em; text-transform: uppercase; border-radius: 99px; padding: 5px 14px; }
  .qr-card { background: #FFFFFF; border-radius: 12px; padding: 12px; text-align: center; }
  .qr-card img { width: 100%; display: block; }
  .qr-card span { display: block; font-weight: 700; font-size: 13px; color: #1B2A4A; padding-top: 8px; }
  .footer { display: flex; justify-content: space-between; align-items: baseline; font-size: 13px; color: #6B7280; }
  .footer .fill { background: #FDF3C9; color: #92590A; font-weight: 700; border-radius: 4px; padding: 1px 7px; }
</style></head><body>
  <div>
    <div class="eyebrow">For Chabot Elementary families</div>
    <h1>Raising a kid whose brain<br>works <span class="accent">differently?</span></h1>
    <div class="sub">You're not alone at Chabot. Not even close.</div>
  </div>

  <div class="points">
    <div class="point"><div class="ico">🗺️</div><p><strong>A parent-made map of school support.</strong> What to ask for, who to ask, and what all those acronyms actually mean — IEP, 504, SST — explained like a friend would.</p></div>
    <div class="point"><div class="ico">✉️</div><p><strong>The magic words.</strong> Copy-and-paste sentences that get free testing, team meetings, and plans moving — kindly, and in writing.</p></div>
    <div class="point"><div class="ico">💛</div><p><strong>Your people.</strong> A private group of Chabot families trading the real answers: which camps work, which therapists have openings, and how it actually goes.</p></div>
  </div>

  <div class="qr-band">
    <div>
      <h2>Point your camera here. That's it.</h2>
      <p>The Chabot Family Navigator — every path, every phone number, and the exact words to use, on your phone in ten seconds.</p>
      <span class="free">Free · Parent-made · No sign-up</span>
    </div>
    <div class="qr-card"><img src="${qr}" alt="QR code to the Chabot Family Navigator"><span>Scan for the map</span></div>
  </div>

  <div class="chips">
    <span class="chip"><b>IEP?</b> The big plan.</span>
    <span class="chip"><b>504?</b> The small-changes list.</span>
    <span class="chip"><b>SST?</b> Just a meeting.</span>
    <span class="chip"><b>Confused?</b> That's the point of the map.</span>
  </div>

  <div class="footer">
    <span>Made with love by Chabot parents · A Waypoint community project</span>
    <span>Questions? <span class="fill">[your email]</span></span>
  </div>
</body></html>`;

fs.writeFileSync('chabot-flyer.html', html);

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage();
  await page.goto('file://' + process.cwd() + '/chabot-flyer.html', { waitUntil: 'networkidle' });
  await page.pdf({ path: 'Chabot-Flyer-v0.1.pdf', format: 'Letter', printBackground: true });
  await browser.close();
  console.log('wrote Chabot-Flyer-v0.1.pdf');
})();
