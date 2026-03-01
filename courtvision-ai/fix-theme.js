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

    content = content.replace(/T\.glass\.light/g, 'glass.thin');
    content = content.replace(/glass\.light/g, 'glass.thin');
    content = content.replace(/T\.color\.signature\.dim/g, 'T.color.signature.muted');
    content = content.replace(/T\.color\.border\.subtle/g, 'T.color.border.soft');
    content = content.replace(/border\.subtle/g, 'border.soft');
    content = content.replace(/T\.color\.border\.default/g, 'T.color.border.base');
    content = content.replace(/border\.default/g, 'border.base');
    content = content.replace(/T\.color\.border\.accent/g, 'T.color.border.base');
    content = content.replace(/border\.accent/g, 'border.base');
    content = content.replace(/T\.color\.semantic\.warningDim/g, '`\\${T.color.semantic.warning}20`');
    content = content.replace(/T\.color\.semantic\.errorDim/g, '`\\${T.color.semantic.error}20`');
    content = content.replace(/type\.bodySemibold/g, 'type.cardTitle');
    content = content.replace(/type\.smallStat/g, 'type.mediumStat');
    content = content.replace(/type\.bigStat/g, 'type.statLarge');
    content = content.replace(/T\.glass\.accent/g, 'glass.vivid');
    content = content.replace(/T\.glass\.regular/g, 'glass.base');
    content = content.replace(/T\.colors/g, 'T.color');
    content = content.replace(/T\.color\.primary/g, 'T.color.signature.primary');

    if (content !== orig) {
        fs.writeFileSync(file, content, 'utf8');
        count++;
    }
}
console.log(`Fixed ${count} files.`);
