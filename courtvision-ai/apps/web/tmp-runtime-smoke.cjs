const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (err) => {
    pageErrors.push(err.message);
  });

  await page.goto('http://localhost:3000', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });

  await page.waitForTimeout(5000);

  console.log(
    JSON.stringify(
      {
        pageErrors,
        consoleErrors: consoleErrors.slice(0, 20),
      },
      null,
      2
    )
  );

  await browser.close();
})();
