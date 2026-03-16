const { chromium } = require('@playwright/test');
const path = require('path');

(async () => {
    console.log("Starting custom modal capture for all tabs...");
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
        
        console.log("Navigating to /trades...");
        await page.goto('http://localhost:3005/trades', { waitUntil: 'domcontentloaded' });
        
        // Wait for page to settle using explicit timeouts instead of network state
        await page.waitForTimeout(5000);

        // Debug screenshot
        await page.screenshot({ path: path.join(__dirname, 'docs', 'assets', 'page_trades.png'), fullPage: true });
        console.log("Saved restored page_trades.png");
        
        console.log("Clicking 'Novo Trade'...");
        await page.locator('button:has-text("Novo Trade")').first().click({ force: true });
        
        console.log("Waiting for dialog...");
        const dialog = page.locator('[role="dialog"]').first();
        await dialog.waitFor({ state: 'visible', timeout: 10000 });
        await page.waitForTimeout(2000); // Animation allowance

        const tabNames = ["BÁSICO", "CONDUÇÃO", "PSICOLOGIA", "MÍDIA", "REVISÃO"];

        for (let step = 1; step <= 5; step++) {
            const dest = path.join(__dirname, 'docs', 'assets', `modal_add_trade_tab${step}.png`);
            await dialog.screenshot({ path: dest });
            console.log(`Saved screenshot: modal_add_trade_tab${step}.png`);

            if (step < 5) {
                const targetText = tabNames[step];
                console.log(`Clicking exact text: ${targetText}`);
                await page.locator(`button:has-text("${targetText}")`).first().click({ force: true });
                await page.waitForTimeout(1000); // Wait for transition animation
            }
        }
    } catch (e) {
        console.error("Capture failed:", e);
    } finally {
        await browser.close();
    }
})();
