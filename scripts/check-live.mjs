import assert from 'node:assert/strict';
import { io } from 'socket.io-client';

const url = process.argv[2];
if (!url || !/^https?:\/\//.test(url)) throw new Error('Usage: node scripts/check-live.mjs https://your-game-url');
const a = io(url, {transports:['websocket'],autoConnect:false,reconnection:false});
const b = io(url, {transports:['websocket'],autoConnect:false,reconnection:false});
const event = (s, name, match = () => true) => new Promise((resolve,reject) => {
  const handler = data => { if (match(data)) { clearTimeout(timer); s.off(name,handler); resolve(data); } };
  const timer=setTimeout(()=>{s.off(name,handler);reject(new Error(`Timed out: ${name}`));},10000);
  s.on(name,handler);
});
const rpc = (s,name,input) => new Promise((resolve,reject)=>s.timeout(10000).emit(name,input,(err,reply)=>err?reject(err):resolve(reply)));
try {
  const connected=[event(a,'connect'),event(b,'connect')];a.connect();b.connect();await Promise.all(connected);
  const created=await rpc(a,'create-room',{name:'Live test A'});assert.equal(created.ok,true);
  const joined=await rpc(b,'join-room',{name:'Live test B',code:created.code});assert.equal(joined.ok,true);
  assert.equal((await rpc(a,'action',{type:'settings',rounds:3,timer:0,preview:0})).ok,true);
  const started=[event(a,'state',s=>s.phase==='playing'),event(b,'state',s=>s.phase==='playing')];
  let drafts=new Map();a.on('state',s=>{if(s.phase==='draft')drafts.set(a,s.draft);});b.on('state',s=>{if(s.phase==='draft')drafts.set(b,s.draft);});
assert.equal((await rpc(a,'action',{type:'start'})).ok,true);
  for(const client of [a,b])for(let choice=0;choice<3;choice++){
    if(drafts.get(client)?.choice!==choice)await event(client,'state',s=>s.phase==='draft'&&s.draft?.choice===choice);
    const offer=drafts.get(client).offers[0];assert.equal((await rpc(client,'action',{type:'draft-pick',uid:offer.uid})).ok,true);
  }
  const [sa,sb]=await Promise.all(started);assert.deepEqual(sa.board,sb.board);
  assert.equal(sa.board.cells.some(c=>!c.revealed&&'value'in c),false);
  const active=sa.turnId===created.playerId?a:b,waiting=active===a?b:a;
  assert.equal((await rpc(waiting,'action',{type:'reveal',index:0})).ok,false);
  const index=0, revealed=[event(a,'state',s=>s.board?.cells[index].revealed),event(b,'state',s=>s.board?.cells[index].revealed)];
  assert.equal((await rpc(active,'action',{type:'reveal',index})).ok,true);
  const [ra,rb]=await Promise.all(revealed);assert.deepEqual(ra.board,rb.board);
  if (rb.phase === 'playing') assert.notEqual(rb.turnId,sa.turnId);
  else assert.equal(rb.board.safeRemaining,0);
  console.log('PASS: Two independent clients connected over public WebSockets, shared a room and board, rejected a wrong-turn action, and synchronized a reveal.');
} finally {a.disconnect();b.disconnect();}
