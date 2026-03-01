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

    content = content.replace(/T\.color\.gold/g, 'T.color.semantic.gold');
    content = content.replace(/T\.color\.purple/g, 'T.color.semantic.purple');
    content = content.replace(/T\.glow\.shadow/g, 'T.glow.soft');
    content = content.replace(/T\.color\.semantic\.successDim/g, '`\\${T.color.semantic.success}20`');
    content = content.replace(/T\.color\.semantic\.infoDim/g, '`\\${T.color.semantic.info}20`');
    content = content.replace(/type\.heroStat/g, 'type.hero');
    content = content.replace(/T\.glass\.medium/g, 'T.glass.base');
    content = content.replace(/T\.glass\.primary/g, 'T.glass.vivid');

    if (content !== orig) {
        fs.writeFileSync(file, content, 'utf8');
        count++;
    }
}
console.log(`Fixed ${count} files.`);
