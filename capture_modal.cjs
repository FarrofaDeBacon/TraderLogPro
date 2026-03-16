const { chromium } = require('@playwright/test');
const path = require('path');

(async () => {
    console.log("Starting custom modal capture...");
    const browser = await chromium.launch();
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    try {
        await page.goto('http://localhost:3005/trades', { waitUntil: 'domcontentloaded' });
        
        // Wait for page to settle using explicit timeouts instead of network state
        await page.waitForTimeout(3000);
        
        console.log("Clicking 'Novo Trade'...");
        await page.locator('button:has-text("Novo Trade")').first().click({ force: true });
        
        console.log("Waiting for dialog...");
        const dialog = page.locator('[role="dialog"]').first();
        await dialog.waitFor({ state: 'visible', timeout: 5000 });
        
        await page.waitForTimeout(1000); // Animation allowance
        
        const dest = path.join(__dirname, 'docs', 'assets', 'modal_add_trade.png');
        await dialog.screenshot({ path: dest });
        
        console.log("Saved screenshot: modal_add_trade.png to", dest);
    } catch (e) {
        console.error("Capture failed:", e);
    } finally {
        await browser.close();
    }
})();
