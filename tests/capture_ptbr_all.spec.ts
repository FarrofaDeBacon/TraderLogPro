import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const BASE_URL = 'http://localhost:3005';
const ASSETS_DIR = path.join(process.cwd(), 'docs', 'assets');

const SCREENSHOTS = [
    { route: '/', filename: 'page_dashboard.png' },
    { route: '/trades', filename: 'page_trades.png' },
    { route: '/strategies', filename: 'page_strategies.png' },
    { route: '/finance', filename: 'page_finance.png' },
    { route: '/fiscal/irpf', filename: 'page_fiscal.png' },
    { route: '/psychology', filename: 'page_psicologia.png' },
    { route: '/settings/strategies', filename: 'settings/strategies/list.png' },
    { route: '/settings/risk', filename: 'settings/risk/view.png' }
];

test.describe('Capture pt-BR Screenshots', () => {

    test.beforeAll(() => {
        if (!fs.existsSync(ASSETS_DIR)) {
            fs.mkdirSync(ASSETS_DIR, { recursive: true });
        }
        const settingsStrategiesDir = path.join(ASSETS_DIR, 'settings', 'strategies');
        if (!fs.existsSync(settingsStrategiesDir)) {
            fs.mkdirSync(settingsStrategiesDir, { recursive: true });
        }
        const settingsRiskDir = path.join(ASSETS_DIR, 'settings', 'risk');
        if (!fs.existsSync(settingsRiskDir)) {
            fs.mkdirSync(settingsRiskDir, { recursive: true });
        }
    });

    test.use({
        colorScheme: 'dark',
        viewport: { width: 1920, height: 1080 },
        locale: 'pt-BR',
        timezoneId: 'America/Sao_Paulo'
    });

    async function preparePage(page: any) {
        await page.evaluate(() => {
            localStorage.setItem('theme', 'dark');
            localStorage.setItem('locale', 'pt-BR');
            localStorage.setItem('sidebar_state', JSON.stringify({ isCollapsed: false }));
        });
    }

    for (const item of SCREENSHOTS) {
        test(`Capture ${item.filename}`, async ({ page }) => {
            console.log(`Navigating to ${BASE_URL}${item.route}...`);
            await page.goto(`${BASE_URL}${item.route}`, { waitUntil: 'domcontentloaded' });
            
            await preparePage(page);
            await page.reload({ waitUntil: 'networkidle' });

            await page.waitForTimeout(5000); // Allow animations and fetch
            try {
                await page.waitForSelector('canvas', { state: 'attached', timeout: 5000 });
            } catch (e) {
                console.log("No canvas found or timed out, proceeding anyway.");
            }
            await page.waitForTimeout(2000); // Let echarts render fully

            // Capture New Trade Wizard on Trades page
            if (item.route === '/trades') {
                try {
                    console.log("Waiting for network idle before opening wizard...");
                    await page.waitForLoadState('networkidle');
                    await page.waitForTimeout(2000);
                    
                    console.log("Attempting to open New Trade Wizard...");
                    const novoTradeBtn = page.locator('button:has-text("Novo Trade")').first();
                    await novoTradeBtn.waitFor({ state: 'visible', timeout: 5000 });
                    await novoTradeBtn.click({ force: true });
                    
                    // Wait for the Shadcn dialog content to appear
                    const dialogContent = page.locator('[role="dialog"], .bg-background.border.shadow-lg').first();
                    await dialogContent.waitFor({ state: 'visible', timeout: 5000 });
                    await page.waitForTimeout(1500); // Let animation finish
                    
                    // Take screenshot of the exact dialog component
                    await dialogContent.screenshot({ path: path.join(ASSETS_DIR, 'modal_add_trade.png') });
                    console.log(`Saved screenshot: modal_add_trade.png`);
                    
                    // Close the modal
                    await page.keyboard.press('Escape');
                    await page.waitForTimeout(1000);
                } catch (e: any) {
                    console.error("Failed to capture New Trade Wizard:", e.message);
                }
            }

            // For strategy detail
            if (item.route === '/strategies') {
                try {
                    console.log("Attempting to enter strategy detail...");
                    // Wait for cards and click the "Ver Análise Completa" button
                    await page.waitForSelector('button:has-text("Ver Análise")');
                    await page.click('button:has-text("Ver Análise")');
                    
                    await page.waitForLoadState('networkidle');
                    await page.waitForTimeout(5000); // Allow charts to load
                    
                    try {
                        await page.waitForSelector('canvas', { state: 'attached', timeout: 5000 });
                        await page.waitForTimeout(2000);
                    } catch (e) {
                         console.log("No canvas found in detail view, continuing.");
                    }

                    await page.screenshot({ path: path.join(ASSETS_DIR, 'page_strategies_detail.png'), fullPage: true });
                    console.log(`Saved screenshot: page_strategies_detail.png`);
                    
                    await page.goBack({ waitUntil: 'networkidle' });
                    await page.waitForTimeout(2000);
                } catch (e: any) {
                    console.error("Failed to capture strategy detail:", e.message);
                }
            }

            const dest = path.join(ASSETS_DIR, item.filename);
            
            if (item.route.includes('/settings/')) {
                // For settings pages, capture just the content container to avoid huge empty margins
                const settingsContainer = page.locator('.flex-1').first();
                await settingsContainer.waitFor({ state: 'visible' });
                // We add a tiny timeout just in case animations are still running inside
                await page.waitForTimeout(1000);
                await settingsContainer.screenshot({ path: dest });
                console.log(`Saved screenshot (cropped): ${item.filename}`);
            } else {
                await page.screenshot({ path: dest, fullPage: true });
                console.log(`Saved screenshot: ${item.filename}`);
            }
        });
    }
});
