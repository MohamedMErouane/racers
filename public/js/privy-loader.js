// Privy SDK dynamic loader utility with fallback
window.privyLoaded = false;
window.privyLoadFailed = false;
window.usingMockPrivy = false;

function loadPrivySDK() {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (typeof Privy !== 'undefined') {
      window.privyLoaded = true;
      console.log('✅ Privy SDK already loaded');
      resolve();
      return;
    }

    // Create script element
    const script = document.createElement('script');
    script.src = 'https://auth.privy.io/js/sdk.js';
    script.async = true;
    
    script.onload = () => {
      window.privyLoaded = true;
      console.log('✅ Privy SDK loaded and ready');
      resolve();
    };
    
    script.onerror = () => {
      console.warn('⚠️ Failed to load Privy SDK from CDN, using mock fallback');
      useMockPrivy();
      resolve(); // Resolve anyway since we have a fallback
    };
    
    // Add script to document
    document.head.appendChild(script);
    
    // Timeout fallback
    setTimeout(() => {
      if (!window.privyLoaded && !window.usingMockPrivy) {
        console.warn('⚠️ Privy SDK load timeout, using mock fallback');
        useMockPrivy();
        resolve(); // Resolve with mock
      }
    }, 5000); // Shorter timeout
  });
}

function useMockPrivy() {
  if (typeof MockPrivy !== 'undefined') {
    // Replace Privy with MockPrivy
    window.Privy = MockPrivy;
    window.privyLoaded = true;
    window.usingMockPrivy = true;
    console.log('🎭 Using Mock Privy for demo purposes');
  } else {
    window.privyLoadFailed = true;
    console.error('❌ Both real and mock Privy unavailable');
  }
}

// Start loading Privy SDK immediately
loadPrivySDK().catch(error => {
  console.error('Failed to load Privy SDK:', error);
  useMockPrivy();
});

// Make loader available globally
window.loadPrivySDK = loadPrivySDK;