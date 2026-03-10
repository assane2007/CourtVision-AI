// Custom web entry point with error catching
if (typeof window !== 'undefined') {
    window.addEventListener('error', (e) => {
        const d = document.getElementById('__web_error_overlay') || document.createElement('pre');
        d.id = '__web_error_overlay';
        d.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#1a0000;color:#ff4444;padding:20px;overflow:auto;font-size:14px;white-space:pre-wrap;';
        d.innerText = (d.innerText || '') + '\n---\n' + e.message + '\n' + (e.error?.stack || '');
        if (!d.parentNode) document.body.appendChild(d);
    });
    window.addEventListener('unhandledrejection', (e) => {
        const d = document.getElementById('__web_error_overlay') || document.createElement('pre');
        d.id = '__web_error_overlay';
        d.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#1a0000;color:#ff4444;padding:20px;overflow:auto;font-size:14px;white-space:pre-wrap;';
        d.innerText = (d.innerText || '') + '\n---\nUnhandled rejection: ' + String(e.reason?.stack || e.reason);
        if (!d.parentNode) document.body.appendChild(d);
    });
}

// Load the real entry point
require('expo-router/entry');
