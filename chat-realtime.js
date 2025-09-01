
// chat-realtime.js
const DEFAULTS = { container:'#chat-messages', form:'#chat-form', input:'#chat-input', userField:'#chat-user' };
function el(q){ return document.querySelector(q); }
function appendMsg(c,m){ const li=document.createElement('div'); li.className='chat-line'; const t=new Date(m.ts||Date.now()).toLocaleTimeString(); li.textContent=`[${t}] ${m.user||'Anon'}: ${m.text}`; c.appendChild(li); c.scrollTop=c.scrollHeight; }
async function loadHistory(sel){ try{ const c=el(sel); if(!c) return; const r=await fetch('/api/chat'); const d=await r.json(); c.innerHTML=''; d.reverse().forEach(m=>appendMsg(c,m)); }catch(e){ console.warn('chat history load failed', e); } }
function bindForm(fSel,iSel,uSel){ const f=el(fSel), i=el(iSel), u=el(uSel); if(!f||!i) return; f.addEventListener('submit', async (e)=>{ e.preventDefault(); const text=i.value.trim(); if(!text) return; const user=u?.value?.trim()||'Anonymous'; i.value=''; try{ await fetch('/api/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ user, text }) }); }catch(e){ console.warn('chat post failed', e); } }); }
function subscribePusher(cSel){ if(!window.Pusher){ console.warn('Pusher JS not loaded'); return; } const p=new window.Pusher(window.PUSHER_KEY||'', { cluster: window.PUSHER_CLUSTER || 'us2' }); const ch=p.subscribe('public-chat'); ch.bind('message', (msg)=>{ const c=el(cSel); if(c) appendMsg(c,msg); }); }
export const ChatRealtime = { init(opts={}){ const cfg={...DEFAULTS,...opts}; loadHistory(cfg.container); bindForm(cfg.form,cfg.input,cfg.userField); subscribePusher(cfg.container); } };
window.addEventListener('DOMContentLoaded', ()=>{ const ok=el(DEFAULTS.container)&&el(DEFAULTS.form)&&el(DEFAULTS.input); if(ok) ChatRealtime.init(); });
window.ChatRealtime = ChatRealtime;
