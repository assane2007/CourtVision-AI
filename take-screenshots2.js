const { chromium } = require('playwright');
const { spawn } = require('child_process');

const dir = '/home/z/my-project/screenshots/';

function waitReady(proc, maxWait = 60000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout')), maxWait);
    proc.stdout.on('data', (data) => {
      process.stdout.write(data.toString());
      if (data.toString().includes('Ready in')) { clearTimeout(timeout); setTimeout(resolve, 1000); }
    });
    proc.stderr.on('data', (d) => process.stderr.write(d.toString()));
  });
}

// Login helper
async function login(page) {
  await page.goto('http://localhost:3000', { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(2000);
  
  // Fill login
  const fill = async (s, v) => { const e = await page.$(s); if (e) { await e.click(); await e.fill(v); return true; } return false; };
  await fill('input[type="email"]', 'test@courtvision.ai') || await fill('input[name="email"]', 'test@courtvision.ai');
  await fill('input[type="password"]', 'TestPass123') || await fill('input[name="password"]', 'TestPass123');
  
  await page.screenshot({ path: dir + '10-login-filled.png', fullPage: true });
  console.log('✓ 10-login-filled.png');
  
  const btn = await page.$('button[type="submit"]');
  if (btn) await btn.click();
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(3000);
  console.log('Logged in, URL:', page.url());
}

async function main() {
  const server = spawn('bun', ['run', 'dev'], {
    cwd: '/home/z/my-project',
    env: { ...process.env, SKIP_ENV_VALIDATION: '1' },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  await waitReady(server);
  console.log('\n=== Ready ===\n');

  const browser = await chromium.launch({ headless: true });

  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    const p = await ctx.newPage();
    
    await login(p);
    await p.screenshot({ path: dir + '11-dashboard.png', fullPage: true });
    console.log('✓ 11-dashboard.png');

    // Get all clickable nav items
    const navTexts = await p.evaluate(() => {
      const items = [];
      document.querySelectorAll('button, a, [role=tab], [role=button]').forEach(el => {
        const t = el.innerText?.trim();
        if (t && t.length < 40 && t.length > 1) items.push(t);
      });
      return [...new Set(items)].slice(0, 50);
    });
    console.log('Nav items:', navTexts);

    // Navigate to each screen
    const screenKeywords = {
      'training': ['Entraîn', 'Training', 'Drill', 'Exercise', 'séance'],
      'ai-coach': ['Coach IA', 'AI Coach', 'coach', 'Assistant'],
      'ai-tools': ['Outils IA', 'AI Tools', 'outil'],
      'profile': ['Profil', 'Profile', 'Mon compte'],
      'stats': ['Stat', 'Perf', 'Perform', 'Progress'],
      'leaderboard': ['Classement', 'Leader', 'Ranking'],
      'settings': ['Paramètre', 'Setting', 'Réglage', 'Préférence'],
      'social': ['Social', 'Ami', 'Community', 'Réseau'],
      'plans': ['Plan', 'Programme'],
    };

    for (const [screenName, keywords] of Object.entries(screenKeywords)) {
      const allText = await p.evaluate(() => document.body.innerText);
      const matchedKeyword = keywords.find(kw => allText.includes(kw));
      if (matchedKeyword) {
        const el = await p.$(`text=/${matchedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/i`);
        if (el) {
          await el.click();
          await p.waitForTimeout(2000);
          await p.waitForLoadState('networkidle').catch(() => {});
          await p.screenshot({ path: dir + `20-${screenName}.png`, fullPage: true });
          console.log(`✓ 20-${screenName}.png (clicked "${matchedKeyword}")`);
          await p.waitForTimeout(500);
        }
      }
    }

    // Mobile versions of key screens
    const ctxM = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const pm = await ctxM.newPage();
    await login(pm);
    await pm.screenshot({ path: dir + '30-dashboard-mobile.png', fullPage: true });
    console.log('✓ 30-dashboard-mobile.png');
    await ctxM.close();

    await ctx.close();
    console.log('\n✅ All done!');
  } finally {
    await browser.close();
    server.kill();
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });