// Configuration for Racers.fun
// Auto-detect URLs from current location if not explicitly set
(function() {
  const loc = window.location;
  const wsProtocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
  const baseWsUrl = `${wsProtocol}//${loc.host}`;
  const baseApiUrl = `${loc.protocol}//${loc.host}/api`;
  
  // Use configured values or auto-detect from current location
  const configuredWsUrl = '<WS_URL>';
  const configuredApiUrl = '<API_URL>';
  
  window.CONFIG = {
    WS_URL: configuredWsUrl || baseWsUrl,
    API_URL: configuredApiUrl || baseApiUrl,
    PRIVY_APP_ID: '<YOUR_PRIVY_APP_ID>',
    RACE_DURATION: 12000,
    COUNTDOWN_DURATION: 10000,
    TICK_INTERVAL_MS: 16
  };
})();
