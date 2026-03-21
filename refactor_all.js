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
    // Escapar a store atual
    if (filePath.endsWith('app.svelte.ts') || filePath.endsWith('settings.svelte.ts')) return;

    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;

    // 1. Resolver imports multiline de settings.svelte
    // Regex matches: import { ... } from "$lib/stores/settings.svelte" \n or spaces
    let importRegex = /import\s+{([^}]*)}\s+from\s+["'](\$lib\/stores\/settings\.svelte|\.\/settings\.svelte)["'];/g;
    
    content = content.replace(importRegex, (match, p1, p2) => {
        let items = p1.split(',').map(s => s.trim()).filter(Boolean);
        let types = [];
        let values = [];

        items.forEach(item => {
            if (item.startsWith('type ')) {
                types.push(item.substring(5).trim());
            } else if (item === 'settingsStore') {
                values.push('appStore');
            } else if (item.match(/^[A-Z]/)) {
                // If it's capitalized and not prefixed with type, it was an implicit type export
                types.push(item);
            } else {
                values.push(item);
            }
        });

        let isRelative = p2.startsWith('.');
        let lines = [];
        if (values.length > 0) {
            lines.push(`import { ${values.join(', ')} } from "${isRelative ? './app.svelte' : '$lib/stores/app.svelte'}";`);
        }
        if (types.length > 0) {
            lines.push(`import type { ${types.join(', ')} } from "$lib/types";`);
        }
        return lines.join('\n');
    });

    // 2. Global text replacements for the instance methods
    content = content.replace(/settingsStore\.loadData/g, 'appStore.loadData');
    content = content.replace(/settingsStore\.isLoadingData/g, 'appStore.isLoadingData');
    content = content.replace(/settingsStore\.clearDatabase/g, 'appStore.clearDatabase');
    content = content.replace(/settingsStore\.seedDatabase/g, 'appStore.seedDatabase');
    
    // Replace any remaining `settingsStore` raw usage with `appStore` (if they were passed as props)
    content = content.replace(/settingsStore\b/g, 'appStore');

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`Updated: ${filePath}`);
    }
}

// Rename settings.svelte.ts to app.svelte.ts first if it exists
let oldPath = path.join(process.cwd(), 'src/lib/stores/settings.svelte.ts');
let newPath = path.join(process.cwd(), 'src/lib/stores/app.svelte.ts');
if (fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, newPath);
    console.log("Renamed settings.svelte.ts to app.svelte.ts");
}

let oldSpec = path.join(process.cwd(), 'src/lib/stores/settings.test.ts');
let newSpec = path.join(process.cwd(), 'src/lib/stores/app.test.ts');
if (fs.existsSync(oldSpec)) {
    fs.renameSync(oldSpec, newSpec);
    console.log("Renamed settings.test.ts to app.test.ts");
}

walkDir(path.join(process.cwd(), 'src'), refactorFile);
console.log('Refactoring step 4 complete.');
