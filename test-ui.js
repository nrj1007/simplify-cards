const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Mobile viewport to simulate clipping
  await page.setViewportSize({ width: 375, height: 812 });
  
  try {
    console.log("Navigating to calculator...");
    await page.goto('http://localhost:3000/calculator?card=amex-gold', { waitUntil: 'networkidle' });
    
    // Wait for the milestone progress section to render
    await page.waitForSelector('.milestone-progress-section', { timeout: 10000 });
    
    console.log("Taking screenshot...");
    const screenshotPath = path.join(__dirname, 'milestone-screenshot.png');
    await page.locator('.milestone-progress-section').screenshot({ path: screenshotPath });
    
    console.log(`Screenshot saved to ${screenshotPath}`);
  } catch (err) {
    console.error("Error during Playwright execution:", err);
  } finally {
    await browser.close();
  }
})();
