const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Strict mobile viewport where the new styles apply (max-width: 639px)
  await page.setViewportSize({ width: 400, height: 800 });
  
  try {
    console.log("Navigating to /cards page...");
    await page.goto('http://localhost:3000/cards', { waitUntil: 'networkidle' });
    
    // Wait for the first carousel to render
    await page.waitForSelector('.cards-carousel', { timeout: 10000 });
    
    console.log("Taking screenshot of the first carousel row...");
    const screenshotPath = path.join(__dirname, 'cards-mobile-screenshot.png');
    // We target the entire first row so we can see the 1.5 card cutoff clearly
    await page.locator('.cards-row').first().screenshot({ path: screenshotPath });
    
    console.log(`Screenshot saved to ${screenshotPath}`);
  } catch (err) {
    console.error("Error during Playwright execution:", err);
  } finally {
    await browser.close();
  }
})();
