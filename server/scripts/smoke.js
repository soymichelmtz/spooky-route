// Simple smoke test using built-in fetch (Node 18+) or undici
import 'dotenv/config';
import fetch from 'node-fetch';

const base = 'http://localhost:' + (process.env.PORT || 3001);

async function run() {
  const rand = Math.random().toString(36).slice(2,7);
  const username = 'user_' + rand;
  const password = 'pass123';

  function log(step, data) { console.log(`STEP: ${step}`, data); }

  // Register
  let res = await fetch(base + '/auth/register', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ username, password }) });
  const reg = await res.json();
  if (!res.ok) throw new Error('Register failed: ' + JSON.stringify(reg));
  log('register', reg);

  // Login
  res = await fetch(base + '/auth/login', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ username, password }) });
  const login = await res.json();
  if (!res.ok || !login.token) throw new Error('Login failed: ' + JSON.stringify(login));
  log('login', login);
  const token = login.token;

  // Create house
  res = await fetch(base + '/houses/me', { method:'POST', headers:{ 'Content-Type':'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ lat:19.4326, lng:-99.1332, addressText:'Centro CDMX', givingCandy:true }) });
  const house = await res.json();
  if (!res.ok) throw new Error('House create failed: ' + JSON.stringify(house));
  log('house_upsert', house);

  // Public list
  res = await fetch(base + '/houses');
  const list = await res.json();
  if (!Array.isArray(list)) throw new Error('List not array');
  log('houses_list_count', list.length);

  console.log('SMOKE TEST OK');
}

run().catch(e => { console.error(e); process.exit(1); });
