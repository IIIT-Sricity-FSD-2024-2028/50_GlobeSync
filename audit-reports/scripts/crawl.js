// Route crawler: logs in as each role through the real login form, visits every
// route for that role, and records console errors, failed API calls and screenshots.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const FE = process.env.FE || 'http://127.0.0.1:5173';
const OUT = process.env.OUT || '/tmp/claude-0/sp/crawl-out';
fs.mkdirSync(OUT, { recursive: true });

const ROLES = {
  public: { routes: ['/', '/about', '/contact', '/portal-select', '/login', '/signup/traveler', '/signup/agency', '/unauthorized', '/does-not-exist'] },
  traveler: { email: 'Arjun@gmail.com', password: process.env.PW_TRAVELER, routes: ['/traveler/dashboard', '/traveler/packages', '/traveler/plan', '/traveler/create-itinerary', '/traveler/trips', '/traveler/bookings', '/traveler/expenses', '/traveler/profile', '/traveler/support', '/traveler/messages'] },
  guide: { email: 'Devansh@gmail.com', password: process.env.PW_GUIDE, routes: ['/guide/dashboard', '/guide/requests', '/guide/travelers', '/guide/completed-trips', '/guide/reviews', '/guide/messages', '/guide/profile'] },
  admin: { email: 'admin@ticp.com', password: process.env.PW_ADMIN, routes: ['/admin/dashboard', '/admin/bookings', '/admin/trips', '/admin/packages', '/admin/agencies', '/admin/guides', '/admin/reviews', '/admin/reports', '/admin/profile'] },
  support: { email: 'Aisha.johnson@gmail.com', password: process.env.PW_SUPPORT, routes: ['/support/dashboard', '/support/tickets', '/support/refunds', '/support/messages', '/support/profile'] },
  agency: { email: 'ops@horizontravel.com', password: process.env.PW_AGENCY, routes: ['/agency/dashboard', '/agency/packages', '/agency/book-package', '/agency/trips', '/agency/create-trip', '/agency/create-itinerary', '/agency/itinerary', '/agency/bookings', '/agency/passengers', '/agency/expenses', '/agency/commission', '/agency/revenue', '/agency/payments', '/agency/subscription', '/agency/messages', '/agency/profile', '/agency/support'] },
  superuser: { email: 'superadmin@ticp.com', password: process.env.PW_SUPER, routes: ['/super/dashboard', '/super/revenue', '/super/users', '/super/agencies', '/super/payment-methods', '/super/rules-config', '/super/api-management', '/super/reports', '/super/profile'] },
};

const only = process.argv[2] ? process.argv[2].split(',') : Object.keys(ROLES);
const vp = process.env.MOBILE ? { width: 390, height: 844 } : { width: 1366, height: 900 };

(async () => {
  const browser = await chromium.launch();
  const results = [];
  for (const role of only) {
    const cfg = ROLES[role];
    const ctx = await browser.newContext({ viewport: vp });
    const page = await ctx.newPage();
    let current = { console: [], failed: [], pageErrors: [] };
    page.on('console', (m) => { if (m.type() === 'error') current.console.push(m.text().slice(0, 300)); });
    page.on('pageerror', (e) => current.pageErrors.push(String(e).slice(0, 300)));
    page.on('response', (r) => { if (r.status() >= 400 && r.url().includes(':3001')) current.failed.push(`${r.status()} ${r.request().method()} ${r.url().replace('http://localhost:3001', '')}`); });

    if (cfg.email) {
      await page.goto(`${FE}/login`);
      await page.fill('input[type=email]', cfg.email);
      await page.fill('input[type=password]', cfg.password);
      await page.locator('form button[type=submit]').click();
      try { await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 8000 }); } catch (e) {
        const txt = (await page.locator('body').innerText()).slice(0, 400);
        results.push({ role, route: 'LOGIN', ok: false, note: txt });
        console.log(role, 'LOGIN FAILED', txt.replace(/\n/g, ' | ').slice(0, 200));
        await ctx.close();
        continue;
      }
    }
    for (const route of cfg.routes) {
      current = { console: [], failed: [], pageErrors: [] };
      await page.goto(`${FE}${route}`);
      try { await page.waitForLoadState('networkidle', { timeout: 8000 }); } catch {}
      await page.waitForTimeout(600);
      const finalUrl = new URL(page.url()).pathname;
      const buttons = await page.locator('button:visible').count();
      const links = await page.locator('a:visible').count();
      const inputs = await page.locator('input:visible, select:visible, textarea:visible').count();
      const bodyText = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
      const errorish = (bodyText.match(/(error|failed|not found|unable|denied|NaN|undefined|Invalid Date|\[object Object\])[^.]{0,80}/gi) || []).slice(0, 5);
      const brokenImgs = await page.evaluate(() => [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.getAttribute('src')));
      const hOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      const shot = path.join(OUT, `${role}${route.replace(/\//g, '_')}${process.env.MOBILE ? '_m' : ''}.png`);
      await page.screenshot({ path: shot, fullPage: false });
      const r = { role, route, finalUrl, buttons, links, inputs, console: [...new Set(current.console)], pageErrors: current.pageErrors, failed: [...new Set(current.failed)], errorish, brokenImgs, hOverflow, shot };
      results.push(r);
      console.log(`${role} ${route} -> ${finalUrl} btn=${buttons} in=${inputs} fail=${r.failed.length} cons=${r.console.length} perr=${r.pageErrors.length} ovf=${hOverflow} img=${brokenImgs.length}`);
      if (r.failed.length) console.log('   FAILED:', r.failed.join(' ; ').slice(0, 400));
      if (r.pageErrors.length) console.log('   PAGEERR:', r.pageErrors.join(' ; ').slice(0, 300));
      if (errorish.length) console.log('   TEXT:', errorish.join(' ; ').slice(0, 300));
    }
    await ctx.close();
  }
  fs.writeFileSync(path.join(OUT, `results${process.env.MOBILE ? '_mobile' : ''}.json`), JSON.stringify(results, null, 2));
  await browser.close();
})();
