// Configuration for Racers.fun
window.CONFIG = {
  WS_URL: window.location.hostname === 'racers.fun' 
    ? 'wss://racers.fun' 
    : 'ws://localhost:3001',
  API_URL: window.location.hostname === 'racers.fun' 
    ? 'https://racers.fun/api' 
    : 'http://localhost:3001/api',
  PRIVY_APP_ID: '<YOUR_PRIVY_APP_ID>',
  RACE_DURATION: 12000,
  COUNTDOWN_DURATION: 10000,
  TICK_INTERVAL_MS: 16
};
