const fs = require('fs');
const path = require('path');

const MOVES = {
    // Dashboard Components
    'ProgressionChart.tsx': 'dashboard',
    'WeeklyDots.tsx': 'dashboard',
    'SessionCard.tsx': 'dashboard',
    'StatCard.tsx': 'dashboard',
    'StatCardV4.tsx': 'dashboard',
    'ShareCard.tsx': 'dashboard',

    // Gamification Components
    'XPBadge.tsx': 'gamification',
    'DailyChallengeCard.tsx': 'gamification',
    'PerformanceBadge.tsx': 'gamification',
    'StreakReminderBanner.tsx': 'gamification',

    // Workout Components
    'LiveCamera.tsx': 'workout',
    'SmartCamera.tsx': 'workout',
    'EdgeVisionCamera.tsx': 'workout',
    'AROverlayView.tsx': 'workout',
    'BiomechanicsPanel.tsx': 'workout',
    'SessionSummary.tsx': 'workout',
    'ScoreRing.tsx': 'workout',
    'ShotScienceGrid.tsx': 'workout',
    'CourtZoneSelector.tsx': 'workout',
    'ShotChart.tsx': 'workout'
};

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

const appsDir = path.join(__dirname, 'apps/mobile');

// Move files
for (const [file, folder] of Object.entries(MOVES)) {
    const src = path.join(appsDir, 'components', file);
    const destDir = path.join(appsDir, 'components', folder);
    const dest = path.join(destDir, file);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    if (fs.existsSync(src)) {
        fs.renameSync(src, dest);
        console.log(`Moved ${file} to ${folder}`);
    }
}

// Update imports
const files = walk(appsDir);
for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;

    for (const [componentName, folder] of Object.entries(MOVES)) {
        const componentNoExt = componentName.replace('.tsx', '');

        // This regex catches imports like:
        // import { XPBadge } from '../../components/XPBadge'
        // and turns it into `../../components/gamification/XPBadge`

        const regex1 = new RegExp(`(['"])([\\.\\/]+)components\\/${componentNoExt}(['"])`, 'g');
        if (regex1.test(content)) {
            content = content.replace(regex1, `$1$2components/${folder}/${componentNoExt}$3`);
            modified = true;
        }

        // Catch inside components where they do `../FeatureName` -> `../folder/FeatureName` or similar
        // Because these files themselves moved a directory deeper, their OWN relative imports to OTHER things need adjusting!

    }

    if (modified) {
        fs.writeFileSync(file, content, 'utf8');
    }
}

console.log('Refactor complete, step 1.');
