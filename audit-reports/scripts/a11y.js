// Basic accessibility checks per page (not a full WCAG audit).
const { chromium } = require('playwright');
const FE = 'http://localhost:5173';
const sets = [
  [null, null, ['/', '/about', '/contact', '/login', '/signup/traveler', '/signup/agency']],
  ['Arjun@gmail.com', process.env.PW_TRAVELER, ['/traveler/dashboard', '/traveler/create-itinerary', '/traveler/bookings', '/traveler/trips', '/traveler/profile']],
  ['Devansh@gmail.com', process.env.PW_GUIDE, ['/guide/dashboard', '/guide/requests', '/guide/messages']],
  ['admin@ticp.com', process.env.PW_ADMIN, ['/admin/dashboard', '/admin/packages', '/admin/bookings']],
];
(async () => {
  const b = await chromium.launch();
  const tot = { pages: 0, noLabel: 0, noName: 0, noAlt: 0, noLang: 0, noH1: 0 };
  for (const [email, pw, routes] of sets) {
    const p = await b.newPage();
    if (email) {
      await p.goto(FE + '/login'); await p.fill('input[type=email]', email); await p.fill('input[type=password]', pw);
      await p.locator('form button[type=submit]').click(); await p.waitForURL((u) => !u.pathname.startsWith('/login'));
    }
    for (const r of routes) {
      await p.goto(FE + r); try { await p.waitForLoadState('networkidle', { timeout: 6000 }); } catch {}
      const res = await p.evaluate(() => {
        const vis = (e) => { const s = getComputedStyle(e); const b = e.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && b.width > 0; };
        const name = (e) => (e.getAttribute('aria-label') || e.getAttribute('aria-labelledby') || e.getAttribute('title') || e.innerText || e.value || '').trim();
        const inputs = [...document.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]), select, textarea')].filter(vis);
        const noLabel = inputs.filter((i) => !(i.id && document.querySelector(`label[for="${i.id}"]`)) && !i.closest('label') && !i.getAttribute('aria-label') && !i.getAttribute('aria-labelledby') && !i.getAttribute('title'));
        const btns = [...document.querySelectorAll('button, a[href]')].filter(vis).filter((e) => !name(e));
        const imgs = [...document.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt'));
        return { noLabel: noLabel.length, noLabelEx: noLabel.slice(0, 3).map((i) => i.outerHTML.slice(0, 90)), noName: btns.length, noAlt: imgs.length, lang: document.documentElement.lang, h1: document.querySelectorAll('h1').length };
      });
      tot.pages++; tot.noLabel += res.noLabel; tot.noName += res.noName; tot.noAlt += res.noAlt; if (!res.lang) tot.noLang++; if (!res.h1) tot.noH1++;
      console.log(r, JSON.stringify(res));
    }
    await p.close();
  }
  console.log('TOTAL', JSON.stringify(tot));
  await b.close();
})();
