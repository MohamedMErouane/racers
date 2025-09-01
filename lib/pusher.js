
// lib/pusher.js
import Pusher from 'pusher';
export const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID || '2045074',
  key: process.env.PUSHER_KEY || '33af4f3507ff062a6dec',
  secret: process.env.PUSHER_SECRET || '989b8e9c20c3b20b6ec7',
  cluster: process.env.PUSHER_CLUSTER || 'us2',
  useTLS: true
});
