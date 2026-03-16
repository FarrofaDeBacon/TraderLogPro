const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

(async () => {
    console.log("Starting capture for Settings > Strategies...");
    const browser = await chromium.launch();
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
        colorScheme: 'dark'
    });
    const page = await context.newPage();

    try {
        console.log("Navigating to inject local storage...");
        await page.goto('http://localhost:3005/', { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => {
            localStorage.setItem('onboarding_completed', 'true');
            localStorage.setItem('mode', 'dark');
            localStorage.setItem('theme', 'dark');
            document.documentElement.classList.add('dark');
        });
        
        console.log("Navigating to /settings/strategies...");
        await page.goto('http://localhost:3005/settings/strategies', { waitUntil: 'domcontentloaded' });
        
        await page.waitForTimeout(5000); // Give it time to load the table
        
        const outDir = path.join(__dirname, 'docs', 'assets', 'settings', 'strategies');
        if (!fs.existsSync(outDir)) {
            fs.mkdirSync(outDir, { recursive: true });
        }

        const listPath = path.join(outDir, 'list.png');
        await page.screenshot({ path: listPath, fullPage: true });
        console.log("Saved list.png");
        
        console.log("Clicking 'Novo Setup'...");
        await page.locator('button:has-text("Novo Setup")').first().click({ force: true });

        
        console.log("Waiting for dialog...");
        const dialog = page.locator('[role="dialog"]').first();
        await dialog.waitFor({ state: 'visible', timeout: 10000 });
        await page.waitForTimeout(1500); // Animation allowance

        const modalPath = path.join(outDir, 'modal.png');
        await dialog.screenshot({ path: modalPath });
        console.log("Saved modal.png");

    } catch (e) {
        console.error("Capture failed:", e);
    } finally {
        await browser.close();
    }
})();
