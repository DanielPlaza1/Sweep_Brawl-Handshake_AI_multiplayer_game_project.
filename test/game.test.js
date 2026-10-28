import {ITEM_BY_ID} from '../lib/items.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { GameService } from '../lib/game.js';
import { neighbors } from '../lib/board.js';

function fixture(width,height,mines,shown=[]){
  const mineSet=new Set(mines),revealed=new Set(shown);
  return {width,height,mines:mines.length,opening:null,generated:true,cells:Array.from({length:width*height},(_,i)=>({mine:mineSet.has(i),number:neighbors(i,width,height).filter(n=>mineSet.has(n)).length,revealed:revealed.has(i),flags:new Set()}))};
}
function setup(two=false,preview=0){
  let time=1000;const privateEvents=[],evictions=[],game=new GameService({comeback:false,now:()=>time,pick:()=>0,emitPrivate:(id,state)=>privateEvents.push({id,state}),evict:(id,message)=>evictions.push({id,message})});
  const {room,player:alex}=game.create({name:'Alex'},'s1'),sam=two?game.join({name:'Sam',code:room.code,color:'#69d6df'},'s2').player:null;
  const act=(p,type,extra={})=>{const result=game.action(room.code,p.id,p.socketId,{type,...extra});if(['start','next'].includes(type))for(const person of room.players.filter(p=>p.connected&&!p.bot&&!p.spectator))while(room.phase==='draft'&&!person.draft.ready)game.action(room.code,person.id,person.socketId,{type:'draft-pick',uid:(person.draft.offers.find(c=>ITEM_BY_ID.get(c.id).rarity==='common')||person.draft.offers[0]).uid});if(['start','next'].includes(type)){for(const person of room.players){person.inventory=[];person.lives=room.settings.lives||1;}}return result;};
  act(alex,'settings',{rounds:3,timer:10,preview});
  return {game,room,alex,sam,act,privateEvents,evictions,advance:ms=>{time+=ms;}};
}
test('preparation shows an entirely hidden board and locks reveals until the server countdown ends',()=>{
  const {game,room,alex,act,advance}=setup(false,3);act(alex,'start');
  assert.equal(room.phase,'preparing');assert.equal(room.turnId,null);assert.equal(room.deadline,null);
  assert.equal(game.snapshot(room).board.cells.every(c=>!c.revealed&&!('value'in c)),true);
  assert.throws(()=>act(alex,'reveal',{index:0}),/turn/);
  act(alex,'flag',{index:0,visibility:'private'});
  advance(2999);game.tick();assert.equal(room.phase,'preparing');advance(1);game.tick();
  assert.equal(room.phase,'playing');assert.equal(room.deadline,14000);
});
test('solo first reveal is safe, earns an opening bonus, and does not end the round just because only one player exists',()=>{
  const {game,room,alex,act}=setup();act(alex,'start');assert.equal(alex.lives,3);assert.equal(room.board.openingPending,true);
  act(alex,'reveal',{index:0});assert.equal(room.board.cells[0].mine,false);assert.equal(alex.lives,3);assert.equal(alex.score,15+room.board.cells.filter(c=>c.revealed).length-1);
  assert.equal(game.snapshot(room).board.firstMove,false);if(room.phase==='playing')assert.equal(room.turnId,alex.id);
});
test('host settings accept all new timers and a true no-timer option',()=>{
  const {game,room,alex,sam,act,advance}=setup(true);
  assert.throws(()=>act(sam,'settings',{rounds:5,timer:60,preview:0}),/host/);
  for(const timer of [10,15,20,30,45,60,0]){act(alex,'settings',{rounds:5,timer,preview:10});assert.equal(room.settings.timer,timer);}
  assert.throws(()=>act(alex,'settings',{rounds:99,timer:20}),/valid/);
  act(alex,'settings',{rounds:3,timer:0,preview:0});act(alex,'start');advance(3600000);game.tick();
  assert.equal(room.turnId,alex.id);assert.equal(room.deadline,null);assert.equal(alex.stats.timeouts,0);
});
test('wrong-turn reveals, malformed cells, unknown actions and invalid visibility are rejected',()=>{
  const {room,alex,sam,act}=setup(true);act(alex,'start');assert.throws(()=>act(sam,'reveal',{index:0}),/turn/);
  for(const index of [-1,999,'1',1.2])assert.throws(()=>act(alex,'reveal',{index}),/cell/);
  assert.throws(()=>act(alex,'flag',{index:0,visibility:'everyone'}),/shared or private/);
  assert.throws(()=>act(alex,'cheat'),/Unknown/);assert.equal(room.turnId,alex.id);
});
test('waiting players can flag, ownership is independent, colors are public and private flags remain private',()=>{
  const {game,room,alex,sam,act,privateEvents}=setup(true);act(alex,'start');const deadline=room.deadline;
  act(sam,'flag',{index:0,visibility:'private'});assert.equal(game.snapshot(room).board.cells[0].flagged,false);
  assert.equal('privateFlags'in game.snapshot(room),false);assert.deepEqual(game.snapshot(room,sam.id).privateFlags,[0]);
  assert.deepEqual(game.snapshot(room,alex.id).privateFlags,[]);assert.equal(privateEvents.at(-1).id,'s2');
  act(sam,'flag',{index:1,visibility:'shared'});act(alex,'flag',{index:1,visibility:'shared'});
  assert.deepEqual(game.snapshot(room).board.cells[1].flagColors,[sam.color,alex.color]);
  act(alex,'flag',{index:1,visibility:'shared'});assert.equal(room.board.cells[1].flags.has(sam.id),true);
  assert.equal(room.deadline,deadline);assert.equal(room.turnId,alex.id);
});
test('shared flags have a per-player mine-count cap while private notes are unlimited',()=>{
  const {room,alex,act}=setup();act(alex,'start');room.board=fixture(4,2,[0,1]);
  act(alex,'flag',{index:2,visibility:'shared'});act(alex,'flag',{index:3,visibility:'shared'});
  assert.throws(()=>act(alex,'flag',{index:4,visibility:'shared'}),/limit/);
  for(const index of [2,3,4,5,6])act(alex,'flag',{index,visibility:'private'});
  assert.equal(alex.privateFlags.size,5);act(alex,'flag',{index:2,visibility:'shared'});act(alex,'flag',{index:4,visibility:'shared'});
});
test('reveals ignore hints, and clear every shared/private flag on opened cells',()=>{
  const {room,alex,sam,act}=setup(true);act(alex,'start');
  act(sam,'flag',{index:0,visibility:'shared'});act(sam,'flag',{index:0,visibility:'private'});
  act(alex,'reveal',{index:0});assert.equal(room.board.cells[0].flags.size,0);assert.equal(sam.privateFlags.has(0),false);
});
test('timeout skips without opening a cell, changing score or costing a life',()=>{
  const {game,room,alex,sam,act,advance}=setup(true);act(alex,'start');const before=JSON.stringify(game.snapshot(room).board);
  advance(10000);game.tick();assert.equal(room.turnId,sam.id);assert.equal(alex.score,0);assert.equal(alex.stats.timeouts,1);assert.equal(alex.lives,3);
  assert.equal(JSON.stringify(game.snapshot(room).board),before);
});
test('late reveal cannot bypass an expired deadline',()=>{
  const {room,alex,sam,act,advance}=setup(true);act(alex,'start');advance(10001);
  assert.throws(()=>act(alex,'reveal',{index:0}),/Time ran out/);assert.equal(room.turnId,sam.id);assert.equal(room.board.openingPending,true);
});
test('50/50 guess and final safe cell use the supplied score table',()=>{
  const {room,alex,act}=setup();act(alex,'start');room.board=fixture(3,1,[0],[1]);
  act(alex,'reveal',{index:2});assert.equal(alex.score,70);
  const move=room.log.find(e=>e.type==='reveal');assert.equal(move.tier,'guess');assert.equal(move.probability,.5);assert.equal(move.lastSafePoints,30);
  assert.equal(alex.stats.bravestGuess,.5);assert.equal(room.phase,'round-end');
});
test('cascade awards 1 for each extra safe cell and 30 once for clearing the board',()=>{
  const {room,alex,act}=setup();act(alex,'start');room.board=fixture(3,3,[0],[1,3,4]);
  act(alex,'reveal',{index:8});const move=room.log.find(e=>e.type==='reveal');
  assert.equal(move.cascadePoints,4);assert.equal(move.lastSafePoints,30);assert.equal(move.tier,'pattern');assert.equal(alex.score,64);
});
test('correct shared flags pay each owner once; private notes do not double-count',()=>{
  const {game,room,alex,sam,act}=setup(true);act(alex,'start');room.board=fixture(4,1,[0],[1]);
  act(alex,'flag',{index:0,visibility:'shared'});act(sam,'flag',{index:0,visibility:'shared'});act(sam,'flag',{index:0,visibility:'private'});
  act(alex,'reveal',{index:3});assert.equal(alex.stats.flagPoints,5);assert.equal(sam.stats.flagPoints,5);
  const before=sam.score;
  game.finishRound(room,'Ignored duplicate.');assert.equal(sam.score,before);
});

test('incorrect shared flags and correct private-only flags earn no bonus',()=>{
  const {game,room,alex,sam,act}=setup(true);act(alex,'start');room.board=fixture(4,1,[0],[1]);
  act(alex,'flag',{index:2,visibility:'shared'});act(sam,'flag',{index:0,visibility:'private'});
  game.finishRound(room,'Test round ended.');
  assert.equal(alex.score,0);assert.equal(sam.score,0);assert.equal(alex.stats.flagPoints,0);assert.equal(sam.stats.flagPoints,0);
});
test('last living player automatically wins a multiplayer round; solo still uses all three lives',()=>{
  const {room,alex,sam,act}=setup(true);act(alex,'start');room.board=fixture(4,2,[0,1,2]);alex.lives=1;
  act(alex,'reveal',{index:0});assert.equal(room.phase,'round-end');assert.equal(room.roundWinnerId,sam.id);assert.equal(room.turnId,null);
  act(alex,'next');assert.equal(alex.lives,3);assert.equal(room.round,2);assert.equal(room.board.width,10);
  const solo=setup();solo.act(solo.alex,'start');solo.room.board=fixture(4,2,[0,1,2]);
  for(const index of [0,1,2])solo.act(solo.alex,'reveal',{index});assert.equal(solo.room.phase,'round-end');
});
test('mid-game spectators join only after Play Again, and next-round metadata is correct',()=>{
  const {game,room,alex,act}=setup();act(alex,'start');const late=game.join({code:room.code,name:'Late'},'s3').player;
  for(let round=1;round<=3;round++){
    room.board=fixture(4,2,[0,1,2]);alex.inventory=[];alex.lives=3;for(const index of [0,1,2])act(alex,'reveal',{index});
    assert.equal(late.spectator,true);if(round<3){assert.equal(game.snapshot(room).nextRound.width,round===1?10:12);act(alex,'next');}
  }
  assert.equal(room.phase,'finished');act(alex,'again');assert.equal(late.spectator,false);assert.equal(alex.score,0);assert.equal(room.phase,'lobby');
});
test('room color changes survive reconnect without resetting private flags or scores',()=>{
  const {game,room,alex,sam,act}=setup(true);act(alex,'color',{color:'#ffd166'});act(alex,'start');act(alex,'flag',{index:0,visibility:'private'});alex.score=17;alex.lives=2;
  game.disconnect('s1');assert.equal(room.hostId,sam.id);assert.equal(room.turnId,sam.id);
  const restored=game.join({code:room.code,name:'Alex',color:'#b8ed65'},'new').player;
  assert.equal(restored.id,alex.id);assert.equal(restored.color,'#ffd166');assert.equal(restored.score,17);assert.equal(restored.lives,2);assert.ok(restored.privateFlags.has(0));
  assert.throws(()=>game.join({code:room.code,name:'Alex'},'intruder'),/in use/);
});
test('host can kick, non-host cannot, removed socket cannot act, and private ownership is cleared',()=>{
  const {room,alex,sam,act,evictions}=setup(true);assert.throws(()=>act(sam,'kick',{playerId:alex.id}),/host/);assert.throws(()=>act(alex,'kick',{playerId:alex.id}),/another/);
  act(alex,'start');act(sam,'flag',{index:0,visibility:'shared'});act(alex,'kick',{playerId:sam.id});
  assert.equal(room.players.includes(sam),false);assert.equal(room.board.cells[0].flags.has(sam.id),false);assert.equal(evictions[0].id,'s2');
  assert.throws(()=>act(sam,'reveal',{index:0}),/Reconnect/);assert.equal(room.phase,'round-end');
});
test('token replacement ignores stale disconnects and empty rooms expire after five minutes',()=>{
  const {game,room,alex,act,advance}=setup();act(alex,'bot');act(alex,'start');
  game.join({code:room.code,name:'Alex',token:alex.token},'new');game.disconnect('s1');assert.equal(alex.connected,true);
  game.disconnect('new');assert.equal(room.turnId,null);advance(299999);game.tick();assert.ok(game.rooms.has(room.code));
  game.join({code:room.code,name:'Alex'},'new2');assert.ok(room.turnId);game.disconnect('new2');advance(300000);game.tick();assert.equal(game.rooms.has(room.code),false);
});
test('bot acts on a scheduled turn from a sanitized board',()=>{
  const {game,room,alex,act,advance}=setup();act(alex,'bot');act(alex,'start');room.board=fixture(4,3,[0,2],[1]);act(alex,'reveal',{index:3});
  const bot=room.players.find(p=>p.bot);assert.equal(room.turnId,bot.id);const before=room.board.cells.filter(c=>c.revealed).length;
  advance(1500);game.tick();assert.ok(room.board.cells.filter(c=>c.revealed).length>before);
});
test('shared snapshots contain no connection IDs, tokens, private flags or mine locations',()=>{
  const {game,room,alex,act}=setup();act(alex,'start');act(alex,'flag',{index:0,visibility:'private'});
  const serialized=JSON.stringify(game.snapshot(room));for(const secret of [alex.token,'socketId','privateFlags','ownSharedFlags'])assert.equal(serialized.includes(secret),false);
  assert.equal(game.snapshot(room).board.cells.some(c=>!c.revealed&&'value'in c),false);
});
