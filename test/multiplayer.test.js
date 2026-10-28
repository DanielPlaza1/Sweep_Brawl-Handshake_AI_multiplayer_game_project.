import test from 'node:test';
import assert from 'node:assert/strict';
import { io } from 'socket.io-client';
import { createApp } from '../server.js';
const rpc=(socket,event,input)=>new Promise((resolve,reject)=>socket.timeout(3000).emit(event,input,(err,reply)=>err?reject(err):resolve(reply)));
const waitFor=(socket,event,match=()=>true)=>new Promise((resolve,reject)=>{
  const handler=data=>{if(match(data)){clearTimeout(timer);socket.off(event,handler);resolve(data);}};
  const timer=setTimeout(()=>{socket.off(event,handler);reject(new Error('Event timed out: '+event));},3000);socket.on(event,handler);
});
test('real WebSocket clients share a board, keep private flags isolated, flag while waiting and enforce kicks',async t=>{
  const app=createApp();await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));const url=`http://127.0.0.1:${app.server.address().port}`;
  const a=io(url,{transports:['websocket'],autoConnect:false}),b=io(url,{transports:['websocket'],autoConnect:false});
  t.after(async()=>{a.disconnect();b.disconnect();await app.close();});
  const connected=[waitFor(a,'connect'),waitFor(b,'connect')];a.connect();b.connect();await Promise.all(connected);
  const created=await rpc(a,'create-room',{name:'Alice'}),joined=await rpc(b,'join-room',{name:'Bob',code:created.code,color:'#69d6df'});assert.equal(joined.ok,true);
  await rpc(a,'action',{type:'settings',rounds:3,timer:0,preview:0});
  let drafts=new Map();a.on('state',s=>{if(s.phase==='draft')drafts.set(a,s.draft);});b.on('state',s=>{if(s.phase==='draft')drafts.set(b,s.draft);});
const started=[waitFor(a,'state',s=>s.phase==='playing'),waitFor(b,'state',s=>s.phase==='playing')];assert.equal((await rpc(a,'action',{type:'start'})).ok,true);
  for(const client of [a,b])for(let choice=0;choice<3;choice++){const offer=drafts.get(client).offers[0];assert.equal((await rpc(client,'action',{type:'draft-pick',uid:offer.uid})).ok,true);}
  const [sa,sb]=await Promise.all(started);assert.deepEqual(sa.board,sb.board);assert.equal(sb.turnId,created.playerId);
  const first=0;
  let leaked=false;a.on('private-state',s=>{if(s.flags.includes(first))leaked=true;});
  const personal=waitFor(b,'private-state',s=>s.flags.includes(first));assert.equal((await rpc(b,'action',{type:'flag',visibility:'private',index:first})).ok,true);await personal;
  const marked=waitFor(a,'state',s=>s.board.cells[first].flagged);assert.equal((await rpc(b,'action',{type:'flag',visibility:'shared',index:first})).ok,true);
  assert.deepEqual((await marked).board.cells[first].flagColors,['#69d6df']);assert.equal(leaked,false);
  const authoritative=app.game.rooms.get(created.code),bob=authoritative.players.find(p=>p.id===joined.playerId);
  bob.inventory.push({uid:'private-scan-test',id:'scan',used:false});
  const scanStates=[waitFor(a,'state',s=>s.board.cells[first].marks.some(m=>m.kind==='scan')),waitFor(b,'state',s=>s.board.cells[first].marks.some(m=>m.kind==='scan'))];
  assert.equal((await rpc(b,'action',{type:'use-item',uid:'private-scan-test',index:first})).ok,true);
  const [scanA,scanB]=await Promise.all(scanStates);assert.equal(scanA.notes.length,0);assert.equal(typeof scanB.board.cells[first].marks[0].isMine,'boolean');assert.deepEqual(scanA.board.cells[first].marks,scanB.board.cells[first].marks);
  assert.equal(scanA.players.find(p=>p.id===joined.playerId).items.at(-1).id,'scan');
  assert.equal((await rpc(b,'action',{type:'reveal',index:first})).ok,false);
  const revealed=[waitFor(a,'state',s=>s.board.cells[first].revealed),waitFor(b,'state',s=>s.board.cells[first].revealed)];
  assert.equal((await rpc(a,'action',{type:'reveal',index:first})).ok,true);const [ra,rb]=await Promise.all(revealed);assert.deepEqual(ra.board,rb.board);
  assert.notEqual(ra.board.cells[first].value,'mine');assert.equal(ra.players.find(p=>p.id===created.playerId).lives,sa.players.find(p=>p.id===created.playerId).lives);assert.equal(leaked,false);assert.ok(ra.board.cells.filter(c=>c.revealed).length>=4);
  const removed=waitFor(b,'kicked');assert.equal((await rpc(a,'action',{type:'kick',playerId:joined.playerId})).ok,true);assert.match(await removed,/removed/);
  assert.equal((await rpc(b,'action',{type:'flag',visibility:'shared',index:1})).ok,false);
  assert.equal((await fetch(`${url}/lib/solver.js`)).status,404);assert.equal((await fetch(`${url}/health`)).status,200);assert.equal((await fetch(url)).status,200);
});
