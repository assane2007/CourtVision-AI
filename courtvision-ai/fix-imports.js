const fs = require('fs');
const path = require('path');

const folders = ['dashboard', 'gamification', 'workout'];

for (const folder of folders) {
    const dir = path.join(__dirname, 'apps/mobile/components', folder);
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (!file.endsWith('.tsx') && !file.endsWith('.ts')) continue;

        const filepath = path.join(dir, file);
        let content = fs.readFileSync(filepath, 'utf8');
        let modified = false;

        // Fix lib imports
        const libRegex = /(['"])\.\.\/lib\/([^'"]+)(['"])/g;
        if (libRegex.test(content)) {
            content = content.replace(libRegex, '$1../../lib/$2$3');
            modified = true;
        }

        // Fix constants/hooks imports
        const hooksRegex = /(['"])\.\.\/hooks\/([^'"]+)(['"])/g;
        if (hooksRegex.test(content)) {
            content = content.replace(hooksRegex, '$1../../hooks/$2$3');
            modified = true;
        }

        // Fix ui imports
        const uiRegex = /(['"])\.\/ui\/?([^'"]*)(['"])/g;
        if (uiRegex.test(content)) {
            content = content.replace(uiRegex, '$1../ui/$2$3');
            modified = true;
        }

        // Fix other component imports (now sibling or in another feature folder)
        // e.g. import { XPBadge } from './XPBadge' -> import { XPBadge } from '../gamification/XPBadge'
        // This is trickier, let's just run tsc and manually patch if needed, or use a broad regex if it's simple

        if (modified) {
            fs.writeFileSync(filepath, content, 'utf8');
        }
    }
}
console.log('Fixed relative imports inside feature modules.');
