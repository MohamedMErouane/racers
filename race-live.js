
// race-live.js
async function fetchState() {
  try {
    const r = await fetch('/api/race/state');
    return await r.json();
  } catch (e) { console.warn('race state error', e); return null; }
}
function updateHUD(state){
  const t = document.getElementById('rf-timer');
  const r = document.getElementById('rf-round');
  if (!state || !t || !r) return;
  const now = Date.now();
  const msLeft = Math.max(0, state.endsAt - now);
  const sLeft = Math.ceil(msLeft/1000);
  t.textContent = (state.phase==='running'? 'race: ' : 'settle: ') + sLeft + 's';
  r.textContent = 'round: ' + state.roundId;
}
(async () => {
  let state = await fetchState(); updateHUD(state);
  // Broadcast to any custom code that wants the schedule
  if (state) window.dispatchEvent(new CustomEvent('race:update', { detail: state }));
  setInterval(async () => { state = await fetchState(); updateHUD(state); if (state) window.dispatchEvent(new CustomEvent('race:update', { detail: state })); }, 1000);
})();
