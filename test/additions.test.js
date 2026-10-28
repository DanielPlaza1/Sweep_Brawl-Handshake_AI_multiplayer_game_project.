import test from 'node:test';
import assert from 'node:assert/strict';
import { GameService } from '../lib/game.js';
import { neighbors, publicBoard } from '../lib/board.js';
import { classify } from '../lib/solver.js';
import { ITEMS, ITEM_BY_ID, ownItem } from '../lib/items.js';

function fixture(width=7,height=7,shown=[1]){
  const mines=new Set(Array.from({length:width*height},(_,i)=>i).filter(i=>Math.floor(i/width)%3===0&&i%width%3===0));
  return {width,height,mines:mines.size,generated:true,openingPending:false,cells:Array.from({length:width*height},(_,i)=>({mine:mines.has(i),number:neighbors(i,width,height).filter(n=>mines.has(n)).length,revealed:shown.includes(i),flags:new Set()}))};
}
function setup(count=3,lives=6,preowned=[]){
  let time=1000;const game=new GameService({comeback:false,pick:()=>0,now:()=>time});
  const {room,player:a}=game.create({name:'A'},'s0'),players=[a];
  for(let n=1;n<count;n++)players.push(game.join({name:'P'+n,code:room.code},'s'+n).player);
  const act=(p,type,data={})=>game.action(room.code,p.id,p.socketId,{type,...data});
  act(a,'settings',{rounds:5,timer:0,preview:0,lives,debug:true});
  for(const id of preowned)game.obtain(room,a,id,{activate:false});
  const draftCardUids=new Set();
  const draftAll=()=>{for(const p of players)while(room.phase==='draft'&&!p.draft.ready){const uid=(p.draft.offers.find(c=>ITEM_BY_ID.get(c.id).rarity==='common')||p.draft.offers[0]).uid;draftCardUids.add(uid);act(p,'draft-pick',{uid});}};
  act(a,'start');draftAll();room.board=fixture();
  for(const p of players){p.inventory=p.inventory.filter(c=>!draftCardUids.has(c.uid));p.notes=[];p.score=0;}
  const card=(p,id)=>game.obtain(room,p,id,{activate:false});
  const use=(p,item,data={})=>act(p,'use-item',{uid:item.uid,...data});
  const cycleTo=p=>{let guard=players.length*3;while(room.turnId!==p.id&&guard-->0)game.nextTurn(room);assert.equal(room.turnId,p.id);};
  return {game,room,a,b:players[1],c:players[2],players,act,card,use,draftAll,cycleTo,advance:n=>{time+=n;}};
}

test('the new collection has all 29 additions with distinct IDs and compact descriptions',()=>{
  const expected={reactive_barrier:'common',paranoid:'rare',divine_barrier:'legendary',glass_cannon:'legendary',pawn:'common',knight:'rare',rook:'rare',bishop:'rare',queen:'legendary',silent_scan:'rare',double_scan:'rare',super_scans:'legendary',reticent_scans:'legendary',duel:'common',hide_two_numbers:'common',hide_three_numbers:'rare',adaptive:'legendary',electrify:'common',zap:'common',galvanize:'rare',shocking_reanimation:'legendary',grow:'common',compensate:'rare',batteries:'rare',hide:'rare',shadow:'legendary',don_armor:'rare',scatter:'common',scatter_2x:'rare'};
  for(const [id,rarity] of Object.entries(expected)){const definition=ITEM_BY_ID.get(id);assert.ok(definition,id);assert.equal(definition.rarity,rarity);assert.ok(definition.description.length<400,id+' is too verbose');}
  assert.equal(new Set(ITEMS.map(c=>c.id)).size,ITEMS.length);
});

test('heart removal credits the last hit and each distinct assist, while self harm and armor earn nothing',()=>{
  const s=setup(4);s.b.lives=3;s.b.armor=1;
  s.game.damage(s.room,s.b,1,{sourceId:s.a.id,reason:'Hit'});assert.equal(s.a.score,0);
  s.game.damage(s.room,s.b,2,{sourceId:s.a.id,reason:'Hit'});assert.equal(s.a.score,10);
  s.game.damage(s.room,s.b,1,{sourceId:s.c.id,reason:'Dagger'});s.game.settle(s.room);
  assert.equal(s.b.lives,0);assert.equal(s.a.score,20);assert.equal(s.c.score,55);
  s.game.damage(s.room,s.a,1,{sourceId:s.a.id,reason:'self'});assert.equal(s.a.score,20);
});

test('actual nonlethal heart removal awards points, but attempting to hit a last heart awards none',()=>{
  const s=setup();s.b.lives=2;const hit=s.card(s.a,'hit');s.use(s.a,hit,{playerId:s.b.id});assert.equal(s.a.score,5);
  s.use(s.c,s.card(s.c,'hit'),{playerId:s.b.id});assert.equal(s.c.score,0);assert.equal(s.b.lives,1);
});

test('a counted mine credits its planter for damage and an eventual elimination',()=>{
  const s=setup();s.b.lives=1;s.use(s.a,s.card(s.a,'plant_mine'),{index:2});assert.equal(s.room.board.cells[2].mineOwner,s.a.id);
  s.cycleTo(s.b);s.act(s.b,'reveal',{index:2});assert.equal(s.b.lives,0);assert.equal(s.a.score,55);
});

test('placement effects are rejected before the opening without spending their cards',()=>{
  const s=setup();s.room.board.openingPending=true;s.room.board.cells.forEach(c=>c.revealed=false);
  for(const id of ['plant_mine','silent_mine','scatter','scatter_2x','electrify']){const item=s.card(s.a,id);assert.throws(()=>s.use(s.a,item,{index:2}),/first|opening|clear/i);assert.equal(item.used,false);}
});

test('the first clear earns its bonus and cascade points and attributes every opened tile',()=>{
  const s=setup(1);s.game.finishRound(s.room,'Fixture complete');s.act(s.a,'next');s.draftAll();s.a.inventory=[];s.a.score=0;
  s.act(s.a,'reveal',{index:48});const opened=s.room.board.cells.filter(c=>c.revealed&&!c.mine);
  assert.ok(opened.length>=4);assert.equal(s.a.score,15+opened.length-1);
  const view=s.game.snapshot(s.room,s.a.id);for(const c of view.board.cells.filter(c=>c.revealed)){assert.equal(c.clearedBy,s.a.id);assert.equal(c.clearColor,s.a.color);}
});

test('Reactive Barrier counts actual heart loss and refreshes after its owner turn',()=>{const s=setup(3,6,['reactive_barrier']);s.a.armor=1;s.game.damage(s.room,s.a,1,{sourceId:s.b.id,reason:'Hit'});assert.equal(s.a.mineShields,0);s.game.damage(s.room,s.a,1,{sourceId:s.b.id,reason:'Hit'});assert.equal(s.a.mineShields,1);s.game.nextTurn(s.room);s.game.damage(s.room,s.a,1,{sourceId:s.b.id,reason:'Hit'});assert.equal(s.a.mineShields,2);});

test('Paranoid ignores action spam and rewards a completed full cycle',()=>{const s=setup(3,6,['paranoid']);for(let i=0;i<20;i++)s.game.expansion.afterAction(s.room,s.b);assert.equal(s.a.mineShields,0);s.room.cycle=2;s.game.expansion.cycleStarted(s.room);assert.equal(s.a.mineShields,1);s.game.expansion.cycleStarted(s.room);assert.equal(s.a.mineShields,1);});

test('Divine Barrier cleans debuffs at one heart and upgrades Reactive Barrier to yellow protection',()=>{
  const s=setup(3,3,['divine_barrier','reactive_barrier']);s.a.poisons=[{actions:0,threshold:3,sourceId:s.b.id}];s.a.pending.skip=1;s.a.pending.fog=1;
  s.game.damage(s.room,s.a,2,{sourceId:s.b.id,reason:'Dagger'});s.game.settle(s.room);
  assert.equal(s.a.lives,1);assert.equal(s.a.poisons.length,0);assert.equal(s.a.pending.skip,0);assert.equal(s.a.pending.fog,0);assert.equal(s.a.yellowBarriers.length,3);assert.equal(s.a.mineShields,0);
});

test('one yellow barrier blocks a whole multiplied mine hit or a harmful item before Ricochet',()=>{
  const mine=setup(1);mine.use(mine.a,mine.card(mine.a,'don_armor'));mine.use(mine.a,mine.card(mine.a,'quadruple_down'));mine.act(mine.a,'reveal',{index:0});assert.equal(mine.a.lives,6);assert.equal(mine.a.yellowBarriers.length,0);
  const attack=setup();const rico=attack.card(attack.b,'ricochet');attack.use(attack.b,attack.card(attack.b,'don_armor'));const hit=attack.card(attack.a,'hit');attack.use(attack.a,hit,{playerId:attack.b.id});assert.equal(attack.b.lives,6);assert.equal(attack.b.yellowBarriers.length,0);assert.equal(rico.used,false);assert.equal(hit.used,true);assert.equal(attack.a.score,0);
});

test('Glass Cannon pays a nonlethal starting heart and an unblocked mine eliminates it',()=>{const s=setup(3,10,['glass_cannon']);assert.equal(s.a.lives,9);s.use(s.a,s.card(s.a,'double_down'));assert.equal(s.game.multiplier(s.a),4);s.use(s.a,s.card(s.a,'triple_down'));assert.equal(s.game.multiplier(s.a),7);s.act(s.a,'reveal',{index:0});assert.equal(s.a.lives,0);assert.equal(s.game.snapshot(s.room,s.a.id).players[0].ghost,true);});

test('matching Pawn and Rook bonuses apply once and both matching cards stay active',()=>{
  const s=setup(3,6,['pawn','rook']);s.act(s.a,'reveal',{index:25});s.cycleTo(s.a);
  const before=s.a.score,base=classify(publicBoard(s.room.board,s.players),11).points;s.act(s.a,'reveal',{index:11});
  assert.equal(s.a.score-before,Math.round(base*1.5));assert.equal(s.a.inventory.find(c=>c.id==='pawn').used,false);assert.equal(s.a.inventory.find(c=>c.id==='rook').used,false);
});

test('a failed chess follow-up uses the card and Refresher can arm it again',()=>{
  const s=setup(3,6,['pawn']);s.act(s.a,'reveal',{index:25});s.cycleTo(s.a);s.act(s.a,'reveal',{index:5});const pawn=s.a.inventory.find(c=>c.id==='pawn');assert.equal(pawn.used,true);
  s.use(s.a,s.card(s.a,'refresher'));assert.equal(pawn.used,false);
});

test('Bishop grants its specified duplicate plant card, and Queen upgrades that grant to Silent Mine',()=>{
  const bishop=setup(3,6,['bishop','plant_mine']);assert.equal(bishop.a.inventory.filter(c=>c.id==='plant_mine').length,2);
  const queen=setup(3,6,['bishop','queen']);assert.equal(queen.a.inventory.filter(c=>c.id==='silent_mine').length,1);
});

test('Queen with Rook substitutes a yellow barrier for the Rook heart bonus',()=>{
  const rook=setup(3,6,['rook']);assert.equal(rook.a.lives,7);
  const queen=setup(3,6,['rook','queen']);assert.equal(queen.a.lives,6);assert.equal(queen.a.yellowBarriers.length,1);
});

test('Double Scan spends two charges and a refresh restores used capacity without recharging a partial Super Scans',()=>{
  const s=setup(),scan=s.card(s.a,'double_scan'),superScan=s.card(s.a,'super_scans');s.use(s.a,scan,{index:2});assert.equal(scan.charges,1);assert.equal(scan.used,false);
  s.use(s.a,scan,{index:5});assert.equal(scan.charges,0);assert.equal(scan.used,true);s.use(s.a,superScan,{index:24});assert.equal(superScan.charges,1);
  s.use(s.a,s.card(s.a,'refresher'));assert.equal(scan.charges,2);assert.equal(scan.used,false);assert.equal(superScan.charges,1);
});

test('Super and Reticent scan passives combine into a private area scan without leaking mines',()=>{
  const s=setup();s.card(s.a,'super_scans');s.card(s.a,'reticent_scans');s.use(s.a,s.card(s.a,'scan'),{index:24});
  assert.equal(s.a.notes.filter(n=>n.kind==='silent_scan').length,9);assert.equal(s.b.notes.length,0);const other=s.game.snapshot(s.room,s.b.id);
  assert.ok(other.board.cells.every(c=>!(c.marks||[]).length));assert.ok(other.board.cells.filter(c=>!c.revealed).every(c=>!('value'in c)));
});

test('Silent Scan reveals a mine only in its owner private results',()=>{
  const s=setup();s.use(s.a,s.card(s.a,'silent_scan'),{index:0});assert.equal(s.a.notes[0].isMine,true);assert.equal(s.game.snapshot(s.room,s.b.id).notes.length,0);assert.deepEqual(s.game.snapshot(s.room,s.b.id).board.cells[0].marks,[]);
});

test('hiding numbers masks other viewers, keeps the owner number, and bypasses Ricochet and yellow barriers',()=>{
  const s=setup();s.room.board.cells[4].revealed=true;const hide=s.card(s.a,'hide_two_numbers'),rico=s.card(s.b,'ricochet');s.use(s.b,s.card(s.b,'don_armor'));
  s.use(s.a,hide,{index:1});assert.equal(hide.charges,1);s.use(s.a,hide,{index:4});assert.equal(hide.used,true);
  assert.equal(typeof s.game.snapshot(s.room,s.a.id).board.cells[1].value,'number');assert.equal(s.game.snapshot(s.room,s.b.id).board.cells[1].value,'?');assert.equal(rico.used,false);assert.equal(s.b.yellowBarriers.length,1);
});

test('Grow triggers after six owner actions while Compensate reacts once to a negative effect',()=>{const s=setup(3,6,['grow']);for(let i=0;i<5;i++)s.game.expansion.afterAction(s.room,s.a);assert.equal(s.a.lives,6);s.game.expansion.afterAction(s.room,s.a);assert.equal(s.a.lives,7);const c=s.card(s.b,'compensate');s.use(s.c,s.card(s.c,'poison'),{playerId:s.b.id});assert.equal(s.b.lives,7);assert.equal(c.used,true);s.use(s.a,s.card(s.a,'poison'),{playerId:s.b.id});assert.equal(s.b.lives,7);});

test('Hide prevents other players selecting the owner without spending their item',()=>{
  const s=setup();s.use(s.a,s.card(s.a,'hide'));const hit=s.card(s.b,'hit');assert.throws(()=>s.use(s.b,hit,{playerId:s.a.id}),/hidden|hide|target|untarget/i);assert.equal(hit.used,false);assert.equal(s.a.lives,6);
  s.advance(6000);s.game.tick();s.use(s.b,hit,{playerId:s.a.id});assert.equal(s.a.lives,5);
});

test('Shadow expiry grants a temporary barrier and upgrades Hide expiry too',()=>{
  const s=setup();s.card(s.a,'shadow');s.use(s.a,s.card(s.a,'hide'));s.advance(6000);s.game.tick();assert.equal(s.a.yellowBarriers.length,1);
  s.game.nextTurn(s.room);assert.equal(s.a.yellowBarriers.length,0);
});

test('Shocking Reanimation disables a common electric card before itself and prevents an elimination award',()=>{
  const s=setup();const shock=s.card(s.b,'shocking_reanimation'),common=s.card(s.b,'electrify');s.b.lives=1;s.use(s.a,s.card(s.a,'dagger'),{playerId:s.b.id});
  assert.equal(s.b.lives,2);assert.equal(s.b.yellowBarriers.length,1);assert.equal(common.roundDisabled,true);assert.ok(!shock.roundDisabled);assert.equal(s.a.score,5);assert.equal(s.room.phase,'playing');
  assert.throws(()=>s.use(s.b,common,{index:2}),/disabled/i);
});

test('reanimation may disable itself and Refresher cannot restore a card disabled for the round',()=>{
  const s=setup(),shock=s.card(s.b,'shocking_reanimation');s.b.lives=1;s.use(s.a,s.card(s.a,'dagger'),{playerId:s.b.id});assert.equal(shock.roundDisabled,true);
  s.use(s.b,s.card(s.b,'refresher'));assert.equal(shock.roundDisabled,true);
});

test('Scatter adds two counted owned mines without privately identifying their random locations',()=>{
  const s=setup(),before=s.room.board.mines;s.use(s.a,s.card(s.a,'scatter'));assert.equal(s.room.board.mines,before+2);assert.equal(s.room.board.cells.filter(c=>c.mineOwner===s.a.id).length,2);
  assert.ok(s.room.log.filter(e=>/scatter/i.test(e.text)).every(e=>e.cells.length===0));assert.equal(s.a.notes.length,0);
});

test('electrifying your own cell can Zap you and repeated Zap keeps only one delayed turn',()=>{
  const s=setup(),electrify=s.card(s.a,'electrify');s.use(s.a,electrify,{index:2});assert.equal(electrify.charges,1);s.act(s.a,'reveal',{index:2});
  assert.equal(s.a.pending.zap,true);s.use(s.b,s.card(s.b,'zap'),{playerId:s.a.id});assert.equal(s.a.pending.zap,true);
});

test('turn reordering preserves one owed turn per cycle and a moved player cannot be skipped',()=>{
  const s=setup(4);s.use(s.a,s.card(s.a,'delay'),{playerId:s.b.id});s.b.pending.skip=1;
  const seen=[s.room.turnId];for(let n=0;n<3;n++){s.game.nextTurn(s.room);seen.push(s.room.turnId);}assert.deepEqual(seen,[s.a.id,s.c.id,s.players[3].id,s.b.id]);
  assert.equal(new Set(seen).size,4);assert.equal(s.b.pending.skip,0);
  const skip=s.card(s.b,'skip');assert.throws(()=>s.use(s.b,skip,{playerId:s.b.id}),/skip|moved|early|delayed/i);assert.equal(skip.used,false);assert.equal(s.room.turnId,s.b.id);
});

test('turn snapshots expose the current queue and completed side of the cycle divider',()=>{
  const s=setup();s.game.nextTurn(s.room);const view=s.game.snapshot(s.room,s.a.id);assert.equal(view.turnOrder[0],s.b.id);assert.ok(view.completedTurns.includes(s.a.id));assert.ok(!view.turnOrder.includes(s.a.id));
});

test('players sharing a base color receive distinct actual shades and a shade choice survives reconnect',()=>{
  const s=setup();assert.equal(s.a.baseColor,s.b.baseColor);assert.notEqual(s.a.color,s.b.color);
  s.room.phase='lobby';s.act(s.a,'color',{color:s.a.baseColor,shade:80});const chosen=s.a.color;s.game.disconnect(s.a.socketId);const restored=s.game.join({name:'A',code:s.room.code,token:s.a.token},'new').player;assert.equal(restored.color,chosen);assert.equal(restored.shade,80);
});

test('Adaptive doubles all rewards only at one heart and no longer grows from board changes',()=>{const s=setup(3,6,['adaptive']);s.game.damage(s.room,s.a,2,{sourceId:s.b.id,reason:'Hit'});assert.equal(s.a.adaptiveBonus,0);assert.equal(s.a.yellowBarriers.length,0);s.a.lives=1;assert.equal(s.game.gain(s.room,s.a,20).points,40);s.use(s.b,s.card(s.b,'plant_mine'),{index:2});assert.equal(s.a.adaptiveBonus,0);});

test('Duel ignores forced clears and resolves from base points rather than multiplied rewards',()=>{
  const s=setup();s.use(s.a,s.card(s.a,'duel'),{playerId:s.b.id});s.a.score=80;s.b.score=100;
  s.game.expansion.afterReveal(s.room,s.b,22,{forced:true,first:false,basePoints:1000,points:1000});assert.equal(s.room.duels[0].clears[s.b.id],undefined);
  s.game.expansion.afterReveal(s.room,s.a,25,{forced:false,first:false,basePoints:40,points:80});assert.equal(s.room.duels[0].done,false);
  s.game.expansion.afterReveal(s.room,s.b,11,{forced:false,first:false,basePoints:10,points:100});s.game.settle(s.room);
  assert.equal(s.room.duels[0].done,true);assert.equal(s.a.lives,6);assert.equal(s.b.lives,5);assert.equal(s.a.score,95);assert.equal(s.b.score,90);
});

test('Queen and Knight play first and grant exactly one additional normal clear',()=>{
  const s=setup(3,6,['queen','knight']);assert.equal(s.room.turnId,s.a.id);const serial=s.room.turnSerial;
  s.act(s.a,'reveal',{index:25});assert.equal(s.room.turnId,s.a.id);assert.equal(s.room.turnSerial,serial);
  s.act(s.a,'reveal',{index:11});assert.equal(s.room.turnId,s.b.id);assert.equal(s.a.extraClears,0);
});

test('earlier acquired Queens break Queen-Knight opening priority before later Queens',()=>{
  const s=setup(3,6,['queen','knight']);s.advance(1);s.card(s.b,'queen');s.card(s.b,'knight');s.game.finishRound(s.room,'Fixture complete');s.act(s.a,'next');s.draftAll();assert.equal(s.room.turnId,s.a.id);assert.equal(s.game.snapshot(s.room,s.a.id).turnOrder[1],s.b.id);
});

test('Batteries scores global electrical events and recharges one spent charge after owner actions',()=>{
  const s=setup(),batteries=s.card(s.a,'batteries');s.use(s.a,batteries,{playerId:s.b.id});s.use(s.a,batteries,{playerId:s.c.id});assert.equal(s.a.score,27);assert.equal(batteries.charges,0);assert.equal(batteries.used,true);
  for(const id of ['scan','risk_scanner','silent_scan'])s.use(s.a,s.card(s.a,id),{index:2});assert.equal(batteries.charges,1);assert.equal(batteries.used,false);
  s.use(s.b,s.card(s.b,'zap'),{playerId:s.a.id});assert.equal(s.a.score,28);
});

test('Galvanize converts Zap to an early turn and its passive refreshes after five counted actions',()=>{
  const s=setup(),galvanize=s.card(s.c,'galvanize');s.use(s.b,s.card(s.b,'zap'),{playerId:s.c.id});assert.equal(galvanize.passiveUsed,true);assert.equal(s.game.snapshot(s.room,s.a.id).turnOrder[1],s.c.id);
  for(const id of ['scan','risk_scanner','silent_scan','reverse'])s.use(s.c,s.card(s.c,id),{index:2});assert.equal(galvanize.passiveUsed,false);
  s.use(s.a,s.card(s.a,'zap'),{playerId:s.c.id});assert.equal(galvanize.passiveUsed,true);assert.equal(s.c.pending.early,true);assert.equal(s.c.pending.delay,false);
});

test('the latest distinct Zap goes last without duplicating either affected player in the cycle',()=>{
  const s=setup(4);s.use(s.a,s.card(s.a,'zap'),{playerId:s.c.id});s.use(s.b,s.card(s.b,'zap'),{playerId:s.players[3].id});
  const turns=[s.room.turnId];for(let i=0;i<3;i++){s.game.nextTurn(s.room);turns.push(s.room.turnId);}assert.deepEqual(turns,s.players.map(p=>p.id));
});

test('Galvanize electricity spreads at turn end, while Curse prevents automatic spread',()=>{
  const s=setup(3,6,['galvanize']);s.use(s.a,s.a.inventory.find(c=>c.id==='galvanize'),{index:2});s.game.nextTurn(s.room);assert.equal(s.room.board.cells.filter(c=>c.electricOwner===s.a.id).length,2);
  const cursed=setup(3,6,['galvanize']);cursed.use(cursed.a,cursed.a.inventory.find(c=>c.id==='galvanize'),{index:2});cursed.use(cursed.c,cursed.card(cursed.c,'curse'),{playerId:cursed.a.id});cursed.game.nextTurn(cursed.room);assert.equal(cursed.room.board.cells.filter(c=>c.electricOwner===cursed.a.id).length,1);
});

test('poison credits lost hearts but cannot claim a last-heart elimination',()=>{const s=setup(3,3);s.b.lives=2;s.use(s.a,s.card(s.a,'poison'),{playerId:s.b.id});for(let n=0;n<3;n++){s.room.actionQueue=[s.b.id];s.game.settle(s.room);}assert.equal(s.b.lives,1);assert.equal(s.a.score,5);for(let n=0;n<4;n++){s.room.actionQueue=[s.b.id];s.game.settle(s.room);}assert.equal(s.b.lives,1);assert.equal(s.a.score,5);assert.equal(s.a.stats.eliminations||0,0);});

test('Risk Scanner keeps its probability result private under Reticent and gains Super area coverage',()=>{
  const s=setup();s.card(s.a,'super_scans');s.card(s.a,'reticent_scans');s.use(s.a,s.card(s.a,'risk_scanner'),{index:24});const notes=s.a.notes.filter(n=>n.kind==='risk_scanner');
  assert.equal(notes.length,9);assert.ok(notes.every(n=>typeof n.p==='number'&&!('isMine'in n)));assert.ok(s.game.snapshot(s.room,s.b.id).board.cells.every(c=>!(c.marks||[]).length));
});

test('health-dependent Glass Cannon cannot retain its multiplier after switching to Unlimited in the lobby',()=>{
  const game=new GameService({comeback:false,pick:()=>0}),{room,player}=game.create({name:'A'},'s');game.obtain(room,player,'glass_cannon',{activate:false});game.action(room.code,player.id,'s',{type:'settings',rounds:3,timer:0,preview:0,lives:0});game.action(room.code,player.id,'s',{type:'start'});
  while(room.phase==='draft')game.action(room.code,player.id,'s',{type:'draft-pick',uid:player.draft.offers[0].uid});assert.equal(game.multiplier(player),1);assert.equal(player.lives,1);
});

test('a newly obtained Grow starts counting actions at acquisition',()=>{const s=setup();for(let n=0;n<8;n++)s.game.expansion.afterAction(s.room,s.a);s.card(s.a,'grow');for(let n=0;n<5;n++)s.game.expansion.afterAction(s.room,s.a);assert.equal(s.a.lives,6);s.game.expansion.afterAction(s.room,s.a);assert.equal(s.a.lives,7);});

test('new Batteries cannot use actions taken before obtaining it to refill the first charge',()=>{
  const s=setup();for(const id of ['scan','risk_scanner','silent_scan','reverse'])s.use(s.a,s.card(s.a,id),{index:2});const batteries=s.card(s.a,'batteries');s.use(s.a,batteries,{playerId:s.b.id});assert.equal(batteries.charges,1);
});

test('new Reactive Barrier ignores losses before acquisition',()=>{const s=setup();s.game.damage(s.room,s.a,2,{sourceId:s.b.id,reason:'Hit'});s.card(s.a,'reactive_barrier');assert.equal(s.a.mineShields,0);s.game.damage(s.room,s.a,1,{sourceId:s.b.id,reason:'Hit'});assert.equal(s.a.mineShields,1);});

test('Reverse changes normal queued turns while preserving early and delayed priorities',()=>{
  const s=setup(5);s.use(s.a,s.card(s.a,'delay'),{playerId:s.b.id});s.card(s.players[3],'galvanize');s.use(s.c,s.card(s.c,'zap'),{playerId:s.players[3].id});s.use(s.a,s.card(s.a,'reverse'));
  assert.deepEqual(s.game.snapshot(s.room,s.a.id).turnOrder,[s.a.id,s.players[3].id,s.players[4].id,s.c.id,s.b.id]);
});

test('a yellow barrier blocks a Duel before any duel state is created',()=>{
  const s=setup();s.use(s.b,s.card(s.b,'don_armor'));const duel=s.card(s.a,'duel');s.use(s.a,duel,{playerId:s.b.id});assert.equal(duel.used,true);assert.equal(s.b.yellowBarriers.length,0);assert.equal(s.room.duels.length,0);
});

test('Ricochet redirects Duel into a pair of distinct living players',()=>{
  for(const chooseLast of [false,true]){const s=setup(),rico=s.card(s.b,'ricochet');if(chooseLast)s.game.pick=n=>n-1;s.use(s.a,s.card(s.a,'duel'),{playerId:s.b.id});assert.equal(rico.used,true);assert.equal(s.room.duels.length,chooseLast?1:0);if(chooseLast){const duel=s.room.duels[0];assert.equal(new Set(duel.players).size,2);assert.deepEqual(new Set(duel.players),new Set([s.a.id,s.c.id]));}}
});

test('reanimation reveals the triggering passive and disabled sacrifice while counting one activation',()=>{
  const s=setup(),shock=s.card(s.b,'shocking_reanimation'),common=s.card(s.b,'electrify');s.b.lives=1;s.use(s.a,s.card(s.a,'dagger'),{playerId:s.b.id});
  const items=s.game.snapshot(s.room,s.a.id).players.find(p=>p.id===s.b.id).items;assert.equal(items.find(c=>c.uid===shock.uid).id,'shocking_reanimation');assert.equal(items.find(c=>c.uid===common.uid).roundDisabled,true);assert.equal(s.b.stats.itemsUsed,1);
});

test('Pawn includes the cell immediately above its origin and does not stack with Rook',()=>{
  const s=setup(3,6,['pawn','rook']);s.act(s.a,'reveal',{index:25});s.cycleTo(s.a);const before=s.a.score,base=classify(publicBoard(s.room.board,s.players),18).points;s.act(s.a,'reveal',{index:18});assert.equal(s.a.score-before,Math.round(base*1.5));assert.ok(s.a.inventory.filter(c=>['pawn','rook'].includes(c.id)).every(c=>!c.used));
});

test('Divine Barrier removes the actual delayed position as well as its status flag',()=>{
  const s=setup(4);s.card(s.b,'divine_barrier');s.use(s.a,s.card(s.a,'delay'),{playerId:s.b.id});assert.equal(s.game.snapshot(s.room,s.a.id).turnOrder.at(-1),s.b.id);
  s.game.damage(s.room,s.b,5,{sourceId:s.c.id,reason:'Dagger'});s.game.settle(s.room);assert.equal(s.b.lives,1);assert.equal(s.b.pending.delay,false);assert.deepEqual(s.game.snapshot(s.room,s.a.id).turnOrder,s.players.map(p=>p.id));
});

test('Grow defers its six-action trigger until Curse expires',()=>{const s=setup(3,6,['grow']);s.a.curseUntil=7000;for(let n=0;n<6;n++)s.game.expansion.afterAction(s.room,s.a);assert.equal(s.a.lives,6);s.advance(6000);s.game.tick();assert.equal(s.a.lives,7);});

test('Paranoid defers a completed cycle reward until Curse expires',()=>{const s=setup(3,6,['paranoid']);s.a.curseUntil=7000;s.room.cycle=2;s.game.expansion.cycleStarted(s.room);assert.equal(s.a.mineShields,0);s.advance(6000);s.game.tick();assert.equal(s.a.mineShields,1);});

test('Batteries recovers an earned charge immediately after Curse ends',()=>{
  const s=setup(),batteries=s.card(s.a,'batteries');s.use(s.a,batteries,{playerId:s.b.id});s.a.curseUntil=6000;
  for(let i=0;i<4;i++)s.game.expansion.afterAction(s.room,s.a);assert.equal(batteries.charges,1);s.advance(5000);s.game.tick();assert.equal(batteries.charges,2);
});

test('Galvanize becomes ready at Curse expiry after its five cooldown actions have occurred',()=>{
  const s=setup(),galvanize=s.card(s.a,'galvanize');s.use(s.b,s.card(s.b,'zap'),{playerId:s.a.id});assert.equal(galvanize.passiveUsed,true);s.a.curseUntil=6000;
  for(let i=0;i<4;i++)s.game.expansion.afterAction(s.room,s.a);assert.equal(galvanize.passiveUsed,true);s.advance(5000);s.game.tick();assert.equal(galvanize.passiveUsed,false);
});
