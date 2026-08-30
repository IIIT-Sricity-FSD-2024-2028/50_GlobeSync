const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('response', resp => {
    if (resp.status() === 403) {
      console.log('403 Response:', resp.url());
    }
  });
  page.on('dialog', async dialog => {
    console.log('DIALOG:', dialog.message());
    await dialog.accept();
  });

  // go to login page
  await page.goto('http://localhost:8080/login.html?role=admin');
  // simulate login (we can just inject localStorage)
  await page.evaluate(() => {
    localStorage.setItem('role', 'admin');
    localStorage.setItem('user', JSON.stringify({admin_id: 1, name: 'Super Admin'}));
  });
  await page.goto('http://localhost:8080/admin/admin-dashboard.html');
  await new Promise(r => setTimeout(r, 1000));
  
  // click trips sidebar link
  await page.click('a[href="trips.html"]');
  await new Promise(r => setTimeout(r, 2000));

  await browser.close();
})();
