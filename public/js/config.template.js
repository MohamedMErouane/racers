// Configuration for Racers.fun
// Auto-detect URLs from current location if not explicitly set
(function() {
  const loc = window.location;
  const wsProtocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
  const baseWsUrl = `${wsProtocol}//${loc.host}`;
  const baseApiUrl = `${loc.protocol}//${loc.host}/api`;
  
  // Use configured values or auto-detect from current location
  // Empty string or placeholder means auto-detect
  const configuredWsUrl = '<WS_URL>';
  const configuredApiUrl = '<API_URL>';
  
  const isPlaceholder = (val) => !val || val.startsWith('<') || val === '';
  
  window.CONFIG = {
    WS_URL: isPlaceholder(configuredWsUrl) ? baseWsUrl : configuredWsUrl,
    API_URL: isPlaceholder(configuredApiUrl) ? baseApiUrl : configuredApiUrl,
    PRIVY_APP_ID: '<YOUR_PRIVY_APP_ID>',
    RACE_DURATION: 12000,
    COUNTDOWN_DURATION: 10000,
    TICK_INTERVAL_MS: 16
  };
})();
