const { chromium } = require('playwright');
const { spawn } = require('child_process');

const dir = '/home/z/my-project/screenshots/';

function waitReady(proc, maxWait = 60000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout waiting for Ready')), maxWait);
    proc.stdout.on('data', (data) => {
      const str = data.toString();
      process.stdout.write(str);
      if (str.includes('Ready in')) {
        clearTimeout(timeout);
        setTimeout(resolve, 2000); // extra 2s after ready
      }
    });
    proc.stderr.on('data', (data) => process.stderr.write(data.toString()));
  });
}

async function main() {
  console.log('Starting dev server...');
  const server = spawn('bun', ['run', 'dev'], {
    cwd: '/home/z/my-project',
    env: { ...process.env, SKIP_ENV_VALIDATION: '1', PORT: '3000' },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  try {
    await waitReady(server);
    console.log('\n=== Server ready, launching browser ===\n');
  } catch (e) {
    console.error(e);
    server.kill();
    return;
  }

  const browser = await chromium.launch({ headless: true });

  try {
    // 1. Desktop login
    const ctx1 = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    const p1 = await ctx1.newPage();
    await p1.goto('http://localhost:3000', { waitUntil: 'load', timeout: 30000 });
    await p1.waitForTimeout(3000);
    await p1.screenshot({ path: dir + '01-login-desktop.png', fullPage: true });
    const text1 = await p1.evaluate(() => document.body.innerText);
    console.log('01-login: ' + text1.substring(0, 300));
    
    // List elements
    const els = await p1.evaluate(() => 
      Array.from(document.querySelectorAll('button, a, input, [role=tab], [data-state]')).slice(0, 40).map((el, i) => ({
        i, tag: el.tagName, text: (el.innerText || '').substring(0, 40).trim(),
        type: el.type, name: el.name, placeholder: el.placeholder, 
        role: el.getAttribute('role'), dataState: el.getAttribute('data-state')
      }))
    );
    console.log('Elements:', JSON.stringify(els, null, 1));

    // 2. Mobile login
    const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const p2 = await ctx2.newPage();
    await p2.goto('http://localhost:3000', { waitUntil: 'load', timeout: 30000 });
    await p2.waitForTimeout(3000);
    await p2.screenshot({ path: dir + '02-login-mobile.png', fullPage: true });
    console.log('✓ 02-login-mobile.png');
    await ctx2.close();

    // 3. Fill signup form
    const fill = async (sel, val) => {
      const el = await p1.$(sel);
      if (el) { await el.click(); await el.fill(val); return true; }
      return false;
    };

    // Try clicking signup tab
    const tabs = await p1.$$('[role=tab]');
    for (const tab of tabs) {
      const txt = await tab.innerText();
      if (txt.match(/inscription|sign.up|créer/i)) {
        await tab.click();
        await p1.waitForTimeout(1000);
        console.log('Clicked signup tab:', txt);
        break;
      }
    }

    // Try to fill
    let filled = false;
    // Try by name
    if (!filled) filled = await fill('input[name="name"]', 'Test Player');
    if (!filled) filled = await fill('input[placeholder*="Nom" i]', 'Test Player');
    if (!filled) filled = await fill('input[placeholder*="name" i]', 'Test Player');
    
    await fill('input[name="email"]', 'test@courtvision.ai') || 
      await fill('input[type="email"]', 'test@courtvision.ai') ||
      await fill('input[placeholder*="email" i]', 'test@courtvision.ai');
    
    await fill('input[name="password"]', 'TestPass123') || 
      await fill('input[type="password"]', 'TestPass123') ||
      await fill('input[placeholder*="mot de passe" i]', 'TestPass123');

    await p1.screenshot({ path: dir + '03-signup-filled.png', fullPage: true });
    console.log('✓ 03-signup-filled.png');

    // Submit
    const btn = await p1.$('button[type="submit"]') || await p1.$('text=/S\'inscrire|Créer/i');
    if (btn) {
      await btn.click();
      console.log('Submitted signup');
      await p1.waitForLoadState('networkidle').catch(() => {});
      await p1.waitForTimeout(3000);
    }

    await p1.screenshot({ path: dir + '04-after-signup.png', fullPage: true });
    console.log('✓ 04-after-signup.png');
    const url = p1.url();
    console.log('Current URL:', url);
    const textAfter = await p1.evaluate(() => document.body.innerText);
    console.log('After text:', textAfter.substring(0, 400));

    // 5. If we're on dashboard, take more screenshots
    if (!url.includes('login') && !url.includes('auth') && textAfter.length > 200) {
      // Dashboard screenshot
      await p1.screenshot({ path: dir + '05-dashboard.png', fullPage: true });
      console.log('✓ 05-dashboard.png');

      // List nav items
      const navItems = await p1.evaluate(() => 
        Array.from(document.querySelectorAll('nav button, nav a, [data-screen], sidebar button, [class*=nav] button')).map(el => el.innerText?.trim()).filter(Boolean)
      );
      console.log('Nav items:', navItems);

      // Try to navigate to different screens
      const screens = ['training', 'drill', 'coach', 'ai', 'profile', 'stat', 'paramètre', 'setting'];
      for (const screen of screens) {
        const el = await p1.$(`text=/${screen}/i`);
        if (el) {
          await el.click();
          await p1.waitForTimeout(2000);
          await p1.waitForLoadState('networkidle').catch(() => {});
          const name = screen.replace(/[^a-z]/gi, '-');
          await p1.screenshot({ path: dir + `06-${name}.png`, fullPage: true });
          console.log('✓ 06-' + name + '.png');
          break; // Just one extra screen
        }
      }
    }

    await ctx1.close();
    console.log('\n✅ Done!');
  } finally {
    await browser.close();
    server.kill();
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });