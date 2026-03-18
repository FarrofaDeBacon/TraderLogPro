const fs = require('fs');
const path = require('path');

const dir = 'c:/PROJETOS/TraderLogPro/src/lib/stores';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.test.ts') && f !== 'settings.test.ts');

for (const file of files) {
    const fp = path.join(dir, file);
    let content = fs.readFileSync(fp, 'utf8');
    
    // Replace the problematic factory with a safe inline vi.fn()
    content = content.replace(/vi\.mock\('@tauri-apps\/api\/core', \(\) => \(\{[\s\S]*?invoke:\s*setupTauriMock[\s\S]*?\}\)\);/m, 
        "vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));");
        
    fs.writeFileSync(fp, content, 'utf8');
    console.log('Successfully patched Vite Hoist Issue in: ', file);
}
