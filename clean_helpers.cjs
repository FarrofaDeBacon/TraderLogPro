const fs = require('fs');
const path = require('path');
const dir = 'c:/PROJETOS/TraderLogPro/src/lib/stores';

const files = fs.readdirSync(dir).filter(f => f.endsWith('.test.ts'));

for (const file of files) {
    const fp = path.join(dir, file);
    let content = fs.readFileSync(fp, 'utf8');
    
    // Remove "helper methods" test blocks
    content = content.replace(/it\('should resolve.*?helper methods', \(\) => \{[\s\S]*?\}\);\r?\n/g, "");
    
    // Remove "properties by explicit IDs" test blocks
    content = content.replace(/it\('should resolve.*?properties by explicit IDs', \(\) => \{[\s\S]*?\}\);\r?\n/g, "");
    
    fs.writeFileSync(fp, content, 'utf8');
    console.log('Cleaned out legacy helpers from:', file);
}
