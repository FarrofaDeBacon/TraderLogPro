import fs from 'fs';
import path from 'path';

function ensureImport(content, storeName, importPath) {
    if (!content.includes(storeName)) {
        // Add import after the first generic <script...
        return content.replace(/<script[^>]*>/, `$&$\n    import { ${storeName} } from "${importPath}";`);
    }
    // No .ts files have <script>, but trades.svelte.ts does not have <script> tag.
    return content;
}

function ensureImportTs(content, storeName, importPath) {
    if (!content.includes(storeName)) {
        return `import { ${storeName} } from "${importPath}";\n` + content;
    }
    return content;
}

// 1. RTD Import Dialog
let rtd = path.join(process.cwd(), 'src/lib/components/settings/RTDImportDialog.svelte');
let rtdContent = fs.readFileSync(rtd, 'utf-8');
rtdContent = rtdContent.replace(/appStore\.saveAssets\(\)/g, 'assetsStore.saveAssets()');
fs.writeFileSync(rtd, rtdContent, 'utf-8');

// 2. Trades Store
let trades = path.join(process.cwd(), 'src/lib/stores/trades.svelte.ts');
let tradesContent = fs.readFileSync(trades, 'utf-8');
tradesContent = tradesContent.replace(/appStore\.loadCashTransactions\(\)/g, 'financialConfigStore.loadCashTransactions()');
tradesContent = ensureImportTs(tradesContent, 'financialConfigStore', '$lib/stores/financial-config.svelte');
fs.writeFileSync(trades, tradesContent, 'utf-8');

// 3. DailyClosureWizard
let dcw = path.join(process.cwd(), 'src/lib/components/finance/DailyClosureWizard.svelte');
let dcwContent = fs.readFileSync(dcw, 'utf-8');
dcwContent = dcwContent.replace(/appStore\.addCashTransaction/g, 'financialConfigStore.addCashTransaction');
dcwContent = ensureImport(dcwContent, 'financialConfigStore', '$lib/stores/financial-config.svelte');
fs.writeFileSync(dcw, dcwContent, 'utf-8');

// 4. TransactionDialog
let td = path.join(process.cwd(), 'src/lib/components/finance/TransactionDialog.svelte');
let tdContent = fs.readFileSync(td, 'utf-8');
tdContent = tdContent.replace(/appStore\.transferFunds/g, 'financialConfigStore.transferFunds');
tdContent = tdContent.replace(/appStore\.addCashTransaction/g, 'financialConfigStore.addCashTransaction');
tdContent = ensureImport(tdContent, 'financialConfigStore', '$lib/stores/financial-config.svelte');
fs.writeFileSync(td, tdContent, 'utf-8');

// 5. TransferDialog
let trans = path.join(process.cwd(), 'src/lib/components/finance/TransferDialog.svelte');
let transContent = fs.readFileSync(trans, 'utf-8');
transContent = transContent.replace(/appStore\.transferFunds/g, 'financialConfigStore.transferFunds');
transContent = ensureImport(transContent, 'financialConfigStore', '$lib/stores/financial-config.svelte');
fs.writeFileSync(trans, transContent, 'utf-8');

console.log('CRUDs fixes applied.');
