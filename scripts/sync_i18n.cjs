const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '..', 'src/lib/i18n/locales');
const sourceFile = path.join(localesDir, 'pt-BR.json');
const targetLocales = ['en-US.json', 'es-ES.json', 'fr-FR.json'];

function syncLocales() {
    const sourceData = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));

    targetLocales.forEach(file => {
        const filePath = path.join(localesDir, file);
        if (!fs.existsSync(filePath)) {
            console.log(`Creating ${file}...`);
            fs.writeFileSync(filePath, JSON.stringify(sourceData, null, 4), 'utf8');
            return;
        }

        const targetData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const syncedData = {};

        // Ensure all keys from source exist in target
        function syncKeys(source, target, result) {
            Object.keys(source).forEach(key => {
                if (typeof source[key] === 'object' && source[key] !== null) {
                    result[key] = {};
                    syncKeys(source[key], target[key] || {}, result[key]);
                } else {
                    // Keep target value if exists, otherwise fallback to source
                    result[key] = target[key] !== undefined ? target[key] : source[key];
                }
            });
        }

        syncKeys(sourceData, targetData, syncedData);

        // Write back with 4 spaces indentation for consistency
        fs.writeFileSync(filePath, JSON.stringify(syncedData, null, 4) + '\n', 'utf8');
        console.log(`Synced ${file}.`);
    });
}

syncLocales();
