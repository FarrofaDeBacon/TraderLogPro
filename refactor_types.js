import fs from 'fs';
import path from 'path';

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walkDir(dirPath, callback);
        } else {
            if (f.endsWith('.svelte') || f.endsWith('.ts')) {
                callback(dirPath);
            }
        }
    });
}

function refactorFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;

    // Pattern to match: import { settingsStore, type Timeframe } from "$lib/stores/settings.svelte";
    // Or variations.
    let importRegex = /import\s+{(.*?)}\s+from\s+["']\$lib\/stores\/settings(?:\.svelte)?(?:\.ts)?["'];/g;
    
    // Alvo especificamente também './settings.svelte'
    let importRegexRelative = /import\s+{(.*?)}\s+from\s+["']\.\/settings(?:\.svelte)?(?:\.ts)?["'];/g;

    function replacer(match, p1, isRelative) {
        let items = p1.split(',').map(s => s.trim()).filter(Boolean);
        let types = [];
        let values = [];

        for (let item of items) {
            if (item.startsWith('type ')) {
                types.push(item.substring(5).trim());
            } else {
                values.push(item);
            }
        }

        let newImports = [];
        if (values.length > 0) {
            newImports.push(`import { ${values.join(', ')} } from "${isRelative ? './settings.svelte' : '$lib/stores/settings.svelte'}";`);
        }
        if (types.length > 0) {
            // Se for na lib/stores, podemos importar de $lib/types
            newImports.push(`import type { ${types.join(', ')} } from "$lib/types";`);
        }

        if (newImports.length === 0) return '';
        return newImports.join('\n');
    }

    content = content.replace(importRegex, (match, p1) => replacer(match, p1, false));
    content = content.replace(importRegexRelative, (match, p1) => replacer(match, p1, true));

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`Updated: ${filePath}`);
    }
}

walkDir(path.join(process.cwd(), 'src'), refactorFile);
console.log('Refactoring types complete.');
