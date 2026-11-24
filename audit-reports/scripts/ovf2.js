const { chromium } = require('playwright');
const [email, pw, ...routes] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.goto('http://localhost:5173/login');
  await p.fill('input[type=email]', email); await p.fill('input[type=password]', pw);
  await p.locator('form button[type=submit]').click();
  await p.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 8000 });
  for (const u of routes) {
    await p.goto('http://localhost:5173' + u); try { await p.waitForLoadState('networkidle', { timeout: 6000 }); } catch {}
    const r = await p.evaluate(() => {
      const W = document.documentElement.clientWidth; const out = [];
      const all = [...document.querySelectorAll('body *')];
      all.forEach(e => { const b = e.getBoundingClientRect(); if (b.right > W + 1 && b.width > 0) { let inScroll = false; for (let a = e.parentElement; a; a = a.parentElement) { const ox = getComputedStyle(a).overflowX; if ((ox === 'auto' || ox === 'scroll' || ox === 'hidden') && a.getBoundingClientRect().right <= W + 1) { inScroll = true; break; } } if (!inScroll) out.push([e.tagName, e.outerHTML.slice(0, 160), Math.round(b.left), Math.round(b.right), getComputedStyle(e).width]); } });
      return { sw: document.documentElement.scrollWidth, out: out.slice(0, 8) };
    });
    console.log(u, JSON.stringify(r));
  }
  await b.close();
})();
