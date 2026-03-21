import fs from 'fs';
import path from 'path';

let files = [
    'src/lib/components/finance/DailyClosureWizard.svelte',
    'src/lib/components/finance/TransactionDialog.svelte',
    'src/lib/components/finance/TransferDialog.svelte',
    'src/lib/stores/trades.svelte.ts'
];

files.forEach(file => {
    let p = path.join(process.cwd(), file);
    if(fs.existsSync(p)){
        let c = fs.readFileSync(p, 'utf-8');
        c = c.replace(/\\n/g, '\n');
        fs.writeFileSync(p, c, 'utf-8');
    }
});

let pcal = path.join(process.cwd(), 'src/lib/components/dashboard/PerformanceCalendar.svelte');
if(fs.existsSync(pcal)){
    let pcalContent = fs.readFileSync(pcal, 'utf-8');
    pcalContent = pcalContent.replace(/settings.svelte/g, 'app.svelte');
    fs.writeFileSync(pcal, pcalContent, 'utf-8');
}
console.log('Cleanups done.');
