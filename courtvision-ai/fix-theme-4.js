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

    content = content.replace(/T\.shadow\([^)]+\)/g, 'T.glow.soft()');
    content = content.replace(/glass\.medium/g, 'glass.base');
    content = content.replace(/glass\.success/g, 'glass.vivid');
    content = content.replace(/glass\.danger/g, 'glass.vivid');
    content = content.replace(/glass\.warning/g, 'glass.vivid');
    content = content.replace(/T\.glass\.medium/g, 'T.glass.base');
    content = content.replace(/T\.color\.gamification\.purpleDim/g, '`\\${T.color.gamification.purple}20`');
    content = content.replace(/T\.glass\.primary/g, 'T.glass.vivid');
    content = content.replace(/glass\.primary/g, 'glass.vivid');
    content = content.replace(/T\.color\.successDim/g, '`\\${T.color.semantic.success}20`');
    content = content.replace(/T\.color\.infoDim/g, '`\\${T.color.semantic.info}20`');

    if (content !== orig) {
        fs.writeFileSync(file, content, 'utf8');
        count++;
    }
}
console.log(`Fixed ${count} files.`);
