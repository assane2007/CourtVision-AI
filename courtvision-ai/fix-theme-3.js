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

    content = content.replace(/['"]bodySemibold['"]/g, "'cardTitle'");
    content = content.replace(/T\.color\.green/g, 'T.color.semantic.success');
    content = content.replace(/T\.color\.orange/g, 'T.color.signature.primary');
    content = content.replace(/T\.color\.accent/g, 'T.color.semantic.info');
    content = content.replace(/T\.glass\.medium/g, 'T.glass.base');
    content = content.replace(/T\.glass\.shadow/g, 'T.glow.soft()');

    if (content !== orig) {
        fs.writeFileSync(file, content, 'utf8');
        count++;
    }
}
console.log(`Fixed ${count} files.`);
