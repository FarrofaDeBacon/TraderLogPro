import fs from 'fs';
import path from 'path';

let filepath = path.join(process.cwd(), 'src/lib/domain/risk/position-sizing-adapter.test.ts');
let content = fs.readFileSync(filepath, 'utf-8');

content = content.replace(
    /fixed_capital:\s*10000,?\s*};/,
    "fixed_capital: 10000,\n        growth_plan_id: 'mock-plan',\n        };"
);

fs.writeFileSync(filepath, content, 'utf-8');
console.log('Fixed adapter mock test');
