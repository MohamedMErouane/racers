
// privy-diagnostics.js
(function() {
  function log(...x) { console.log('[privy]', ...x); }
  window.addEventListener('DOMContentLoaded', async () => {
    if (!window.Privy) return console.error('[privy] SDK not loaded');
    const privy = new window.Privy({ appId: "cmermm5bm003bjo0bgsoffojs" });
    window.__privy = privy;
    log('SDK ready');

    async function tryConnect() {
      try {
        // Try generic login() if present
        if (typeof privy.login === 'function') {
          const sess = await privy.login();
          log('login()', sess);
        }
        // Try core auth flows if available
        else if (privy.auth && typeof privy.auth.login === 'function') {
          const sess = await privy.auth.login();
          log('auth.login()', sess);
        } else if (privy.auth && privy.auth.email && typeof privy.auth.email.sendCode === 'function') {
          const email = prompt('Enter email to receive code:');
          if (!email) return;
          await privy.auth.email.sendCode(email);
          const code = prompt('Enter the code you received:');
          const sess = await privy.auth.email.loginWithCode(email, code);
          log('email login ok', sess);
        } else {
          alert('No supported Privy login method found in this SDK build.');
        }
      } catch (e) {
        console.error('Privy connect error', e);
        alert('Privy connect failed. Check Allowed Origins in Privy Dashboard & HTTPS.');
      }
    }

    // Bind a global so your button can call window.connectWallet()
    window.connectWallet = tryConnect;

    // Mount embedded wallet iframe & postMessage bridge if available
    try {
      const url = privy.embeddedWallet?.getURL?.();
      if (url) {
        const iframe = document.createElement('iframe');
        iframe.src = url; iframe.style.display = 'none';
        document.body.appendChild(iframe);
        privy.setMessagePoster?.(iframe.contentWindow);
        window.addEventListener('message', (e) => privy.embeddedWallet?.onMessage?.(e.data));
        log('embedded wallet mounted');
      }
    } catch(err) { console.warn('embedded wallet mount failed', err); }
  });
})();
