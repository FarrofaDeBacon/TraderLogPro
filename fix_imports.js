import fs from 'fs';
import path from 'path';

let files = [
    'src/lib/components/finance/DailyClosureWizard.svelte',
    'src/lib/components/finance/TransactionDialog.svelte',
    'src/lib/components/finance/TransferDialog.svelte'
];

files.forEach(file => {
    let p = path.join(process.cwd(), file);
    let c = fs.readFileSync(p, 'utf-8');
    if (!c.includes('import { financialConfigStore }')) {
        c = c.replace(/<script[^>]*>/, `$&\\n    import { financialConfigStore } from "$lib/stores/financial-config.svelte";`);
        fs.writeFileSync(p, c, 'utf-8');
    }
});

let tradesUrl = path.join(process.cwd(), 'src/lib/stores/trades.svelte.ts');
let tradesContent = fs.readFileSync(tradesUrl, 'utf-8');
if (!tradesContent.includes('import { financialConfigStore }')) {
    tradesContent = `import { financialConfigStore } from "$lib/stores/financial-config.svelte";\\n` + tradesContent;
    fs.writeFileSync(tradesUrl, tradesContent, 'utf-8');
}

console.log('Fixed imports');
