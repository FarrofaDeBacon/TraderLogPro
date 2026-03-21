import fs from 'fs';
import path from 'path';

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        if (fs.statSync(dirPath).isDirectory()) {
            walkDir(dirPath, callback);
        } else {
            if (f.endsWith('.svelte') || f.endsWith('.ts')) {
                callback(dirPath);
            }
        }
    });
}

function refactorFile(filePath) {
    if (filePath.endsWith('app.svelte.ts')) return;

    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;

    // Match "import type { X } from '$lib/stores/settings.svelte';"
    let typeExportRegex = /import\s+type\s+{([^}]*)}\s+from\s+["'](\$lib\/stores\/settings(?:\.svelte)?|\$lib\/stores\/app(?:\.svelte)?)["'];/g;
    
    // Replace with "$lib/types"
    content = content.replace(typeExportRegex, (match, p1) => {
        return `import type { ${p1.trim()} } from "$lib/types";`;
    });

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`Updated Types: ${filePath}`);
    }
}

walkDir(path.join(process.cwd(), 'src'), refactorFile);
console.log('Type fix complete.');
