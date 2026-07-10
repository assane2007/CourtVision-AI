const { chromium } = require('playwright');
const { spawn } = require('child_process');
const dir = '/home/z/my-project/screenshots/';

function waitReady(proc) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject('timeout'), 45000);
    proc.stdout.on('data', d => {
      process.stdout.write(d.toString());
      if (d.toString().includes('Ready in')) { clearTimeout(t); setTimeout(resolve, 1000); }
    });
    proc.stderr.on('data', d => process.stderr.write(d.toString()));
  });
}

async function login(p) {
  await p.goto('http://localhost:3000', { waitUntil: 'load', timeout: 20000 });
  await p.waitForTimeout(2000);
  const f = async (s, v) => { const e = await p.$(s); if (e) { await e.click(); await e.fill(v); return true; } return false; };
  await f('input[type="email"]', 'test@courtvision.ai') || await f('input[name="email"]', 'test@courtvision.ai');
  await f('input[type="password"]', 'TestPass123') || await f('input[name="password"]', 'TestPass123');
  const btn = await p.$('button[type="submit"]');
  if (btn) await btn.click();
  await p.waitForLoadState('networkidle').catch(() => {});
  await p.waitForTimeout(2000);
}

async function main() {
  const server = spawn('bun', ['run', 'dev'], {
    cwd: '/home/z/my-project', env: { ...process.env, SKIP_ENV_VALIDATION: '1' }, stdio: ['pipe', 'pipe', 'pipe']
  });
  await waitReady(server);
  console.log('\n=== Ready ===\n');

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await login(p);

  // Get all clickable text
  const allText = await p.evaluate(() => {
    const seen = new Set();
    const items = [];
    document.querySelectorAll('button, a, [role=tab], [role=button], [class*=nav]').forEach(el => {
      const t = el.innerText?.trim();
      if (t && t.length < 40 && !seen.has(t) && t.length > 1) { seen.add(t); items.push(t); }
    });
    return items;
  });
  console.log('All buttons:', JSON.stringify(allText));

  // Navigate to specific screens by text matching
  const targets = [
    ['Outils IA', 'ai-tools'], ['AI Tools', 'ai-tools'],
    ['Profil', 'profile'], ['Profile', 'profile'], ['Mon profil', 'profile'],
    ['Paramètre', 'settings'], ['Settings', 'settings'], ['Réglage', 'settings'],
    ['Plan', 'plans'], ['Programme', 'plans'],
  ];

  for (const [text, name] of targets) {
    try {
      const el = await p.$(`text=/${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/i`);
      if (el) {
        await el.click();
        await p.waitForTimeout(1500);
        await p.screenshot({ path: dir + `25-${name}.png`, fullPage: true });
        console.log(`✓ 25-${name}.png`);
        // Go back
        await p.goBack({ waitUntil: 'load', timeout: 5000 }).catch(() => {});
        await p.waitForTimeout(1000);
      }
    } catch (e) { /* skip */ }
  }

  // Mobile dashboard
  const ctxM = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const pm = await ctxM.newPage();
  await login(pm);
  await pm.screenshot({ path: dir + '30-dashboard-mobile.png', fullPage: true });
  console.log('✓ 30-dashboard-mobile.png');
  await ctxM.close();

  await ctx.close();
  await browser.close();
  server.kill();
  console.log('Done!');
}

main().catch(e => { console.error(e.message); process.exit(1); });