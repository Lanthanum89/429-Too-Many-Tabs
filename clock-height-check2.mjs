import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const [w, h] of [[1024,768],[1280,720],[1366,768],[1440,700],[1600,900],[1920,1080],[1470,1015]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto('http://localhost:5173/429-Too-Many-Tabs/');
  await page.waitForTimeout(800);
  const clock = await page.$('.dashboard-clock .card');
  const calendar = await page.$('.dashboard-calendar .card');
  const buses = await page.$('.dashboard-commits .card');
  const c = await clock.boundingBox(), cal = await calendar.boundingBox(), b = await buses.boundingBox();
  console.log(`${w}x${h}: clock.h=${c.height.toFixed(0)} calendar.h=${cal.height.toFixed(0)} buses.h=${b.height.toFixed(0)}`);
  await page.close();
}
await browser.close();
