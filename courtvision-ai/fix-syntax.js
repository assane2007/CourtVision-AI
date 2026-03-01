const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            if (!filePath.includes('node_modules')) {
                results = results.concat(walk(filePath));
            }
        } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
            results.push(filePath);
        }
    }
    return results;
}

const files = walk('apps/mobile');
let count = 0;

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    const orig = content;

    // Fix the broken T.glow.soft syntax from the bad replace
    content = content.replace(/\.\.\.T\.glow\.soft\(\),\s*[0-9.]+,\s*\d+\)/g, '...T.glow.soft()');

    if (content !== orig) {
        fs.writeFileSync(file, content, 'utf8');
        count++;
    }
}
console.log(`Fixed syntax errors in ${count} files.`);
