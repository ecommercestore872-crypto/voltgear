const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('https://buyntryy.com/', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: 'tmp/hero.png' });
  await browser.close();
})();
