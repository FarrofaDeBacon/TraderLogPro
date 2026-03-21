import fs from 'fs';
let content = fs.readFileSync('vitest-results.json', 'utf16le');
if (content.charCodeAt(0) === 0xFEFF) {
  content = content.slice(1);
}
// Try JSON parse
try {
    let data = JSON.parse(content);
    data.testResults.forEach(suite => {
        suite.assertionResults.forEach(t => {
            if (t.status === 'failed') {
                console.log(`FAIL: ${suite.name} -> ${t.title}`);
            }
        });
    });
} catch(e) {
    console.error("Still failing to parse:", e.message);
}
