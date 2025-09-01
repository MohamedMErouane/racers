// public/privy-loader.js
// Loads the Privy Core JS SDK from a CDN and exposes it as a global for your existing code.
import Privy from 'https://cdn.jsdelivr.net/npm/@privy-io/js-sdk-core/+esm';
window.Privy = Privy;
console.log('[privy-loader] Loaded @privy-io/js-sdk-core via CDN');
