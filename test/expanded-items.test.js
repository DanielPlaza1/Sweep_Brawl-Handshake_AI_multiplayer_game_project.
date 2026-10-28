import test from 'node:test';
import assert from 'node:assert/strict';
import { GameService } from '../lib/game.js';
import { neighbors } from '../lib/board.js';
import { ITEMS, ITEM_BY_ID, beginDraft, drawOffers, lootPool } from '../lib/items.js';

function setup(count=3,lives=3){
  let time=1000;const game=new GameService({comeback:false,pick:()=>0,now:()=>time});
  const {room,player:a}=game.create({name:'A'},'s0'),players=[a];
  for(let i=1;i<count;i++)players.push(game.join({name:'P'+i,code:room.code},'s'+i).player);
  const act=(p,type,data={})=>game.action(room.code,p.id,p.socketId,{type,...data});
  act(a,'settings',{rounds:5,timer:0,preview:0,lives,debug:true});
  const draftAll=()=>{for(const p of players)while(room.phase==='draft'&&!p.draft.ready)act(p,'draft-pick',{uid:(p.draft.offers.find(c=>ITEM_BY_ID.get(c.id).rarity==='common')||p.draft.offers[0]).uid});};
  act(a,'start');draftAll();
  room.board={width:5,height:2,mines:2,generated:true,opening:null,cells:Array.from({length:10},(_,i)=>({mine:[0,4].includes(i),number:neighbors(i,5,2).filter(n=>[0,4].includes(n)).length,revealed:[1,3].includes(i),flags:new Set()}))};
  for(const p of players){p.inventory=[];p.notes=[];p.lives=lives||1;}
  const card=(p,id)=>game.obtain(room,p,id,{activate:false});
  const use=(p,item,data={})=>act(p,'use-item',{uid:item.uid,...data});
  return {game,room,a,b:players[1],c:players[2],players,act,card,use,draftAll,advance:ms=>{time+=ms;}};
}

test('new item rarities match all sixteen additions',()=>{
  const expected={hit:'common',dagger:'rare',scythe:'legendary',triple_down:'rare',quadruple_down:'legendary',jest:'legendary',delay:'rare',double_mine_shield:'rare',double_hearts:'rare',plated_armor:'legendary',echo_shard:'rare',refresher:'legendary',egg:'common',poison:'rare',noxious_cloud:'legendary',curse:'legendary'};
  for(const [id,rarity] of Object.entries(expected))assert.equal(ITEM_BY_ID.get(id).rarity,rarity);
});
test('Hit cannot eliminate, Dagger can, and Mine Shield does not block either',()=>{
  const s=setup(),shield=s.card(s.b,'shield');s.b.lives=1;
  s.use(s.a,s.card(s.a,'hit'),{playerId:s.b.id});assert.equal(s.b.lives,1);assert.equal(shield.used,false);
  s.use(s.a,s.card(s.a,'dagger'),{playerId:s.b.id});assert.equal(s.b.lives,0);assert.equal(s.room.phase,'playing');assert.equal(shield.used,false);
});
test('Dagger takes one heart from a healthier target and never applies extra effects',()=>{const s=setup();s.use(s.a,s.card(s.a,'dagger'),{playerId:s.b.id});assert.equal(s.b.lives,2);assert.equal(s.b.pending.skip,0);assert.equal(s.b.poisons.length,0);});
test('Scythe hits every other player nonlethally and multiple Ricochets hit the caster only once',()=>{
  const s=setup(5),r1=s.card(s.b,'ricochet'),r2=s.card(s.c,'ricochet'),casterRico=s.card(s.a,'ricochet');s.players[3].lives=1;
  s.use(s.a,s.card(s.a,'scythe'));assert.deepEqual(s.players.map(p=>p.lives),[2,3,3,1,2]);assert.ok(r1.used&&r2.used);assert.equal(casterRico.used,false);
});
test('Triple and Quadruple Down multiply points and mine damage, without immediate heart cost',()=>{
  for(const [id,multiplier] of [['triple_down',3],['quadruple_down',4]]){
    const safe=setup(1,6);safe.room.board={width:3,height:1,mines:1,generated:true,cells:[{mine:true,number:0},{mine:false,number:1,revealed:true},{mine:false,number:0}].map(c=>({...c,flags:new Set()}))};
    safe.use(safe.a,safe.card(safe.a,id));assert.equal(safe.a.lives,6);safe.act(safe.a,'reveal',{index:2});assert.equal(safe.a.score,70*multiplier);
    const hit=setup(3,6);hit.use(hit.a,hit.card(hit.a,id));hit.act(hit.a,'reveal',{index:0});assert.equal(hit.a.lives,6-multiplier);
  }
});
test('Down cards cannot stack, activate out of turn, or multiply the free opening',()=>{
  const s=setup(),triple=s.card(s.a,'triple_down'),quad=s.card(s.a,'quadruple_down');s.room.board.openingPending=true;
  assert.throws(()=>s.use(s.a,triple),/cannot stack/);s.room.board.openingPending=false;s.use(s.a,triple);assert.throws(()=>s.use(s.a,quad),/cannot stack/);assert.equal(quad.used,false);
  assert.throws(()=>s.use(s.b,s.card(s.b,'triple_down')),/your turn/);
});
test('Jest forces a future Down without a gift and rejects a duplicate pending curse',()=>{const s=setup(),jest=s.card(s.a,'jest');assert.throws(()=>s.use(s.a,jest,{playerId:s.a.id}),/another player/);s.use(s.a,jest,{playerId:s.b.id});assert.equal(s.b.pending.forcedDown,4);assert.equal(s.b.inventory.length,0);const other=s.card(s.c,'jest');assert.throws(()=>s.use(s.c,other,{playerId:s.b.id}),/pending/);assert.equal(other.used,false);s.game.nextTurn(s.room);assert.equal(s.game.multiplier(s.b),4);});

test('Delay moves an upcoming turn last, without losing a move or changing later cycles',()=>{
  const s=setup();s.use(s.a,s.card(s.a,'delay'),{playerId:s.b.id});s.game.nextTurn(s.room,s.a.id);assert.equal(s.room.turnId,s.c.id);
  s.game.nextTurn(s.room,s.c.id);assert.equal(s.room.turnId,s.b.id);assert.equal(s.b.pending.delay,false);s.game.nextTurn(s.room,s.b.id);assert.equal(s.room.turnId,s.a.id);
});
test('delaying yourself postpones your next cycle, while your current turn remains playable',()=>{
  const s=setup();s.use(s.a,s.card(s.a,'delay'),{playerId:s.a.id});assert.equal(s.room.turnId,s.a.id);
  const turns=[];for(let i=0;i<5;i++){s.game.nextTurn(s.room);turns.push(s.room.turnId);}assert.deepEqual(turns,[s.b.id,s.c.id,s.b.id,s.c.id,s.a.id]);
});
test('Double Mine Shield blocks two full Down mine hits, then runs out, and never blocks attacks',()=>{
  const s=setup(1,6);s.use(s.a,s.card(s.a,'double_mine_shield'));s.use(s.a,s.card(s.a,'quadruple_down'));s.act(s.a,'reveal',{index:0});assert.equal(s.a.lives,6);assert.equal(s.a.mineShields,1);
  s.act(s.a,'reveal',{index:4});assert.equal(s.a.lives,6);assert.equal(s.a.mineShields,0);
  s.use(s.a,s.card(s.a,'hit'),{playerId:s.a.id});assert.equal(s.a.lives,5);
});
test('Double Hearts adds two hearts; Plated Armor absorbs general damage before hearts',()=>{
  const s=setup();s.use(s.b,s.card(s.b,'double_hearts'));assert.equal(s.b.lives,5);s.use(s.b,s.card(s.b,'plated_armor'));assert.equal(s.b.armor,3);
  s.use(s.a,s.card(s.a,'dagger'),{playerId:s.b.id});assert.equal(s.b.lives,5);assert.equal(s.b.armor,2);
  s.room.turnId=s.b.id;s.use(s.b,s.card(s.b,'quadruple_down'));s.act(s.b,'reveal',{index:0});assert.equal(s.b.armor,0);assert.equal(s.b.lives,3);
});
test('armor can protect a one-heart player from Dagger and is shown separately from mine shields',()=>{const s=setup();s.b.lives=1;s.use(s.b,s.card(s.b,'plated_armor'));s.use(s.a,s.card(s.a,'dagger'),{playerId:s.b.id});assert.equal(s.b.lives,1);assert.equal(s.b.armor,2);const view=s.game.snapshot(s.room,s.a.id).players[1];assert.equal(view.armor,2);assert.equal(view.mineShields,0);});
test('Echo Shard permanently links one automatic refresh each round, and cannot be reused',()=>{
  const s=setup(),echo=s.card(s.a,'echo_shard'),scan=s.card(s.a,'scan');s.use(s.a,echo,{targetUid:scan.uid});assert.equal(echo.disabled,true);
  s.use(s.a,scan,{index:2});assert.equal(scan.used,false);assert.equal(scan.echoSpent,true);s.use(s.a,scan,{index:2});assert.equal(scan.used,true);
  assert.throws(()=>s.use(s.a,echo,{targetUid:scan.uid}),/permanently disabled/);s.game.finishRound(s.room,'Test');s.act(s.a,'next');assert.equal(scan.echo,true);assert.equal(scan.echoSpent,false);assert.equal(echo.disabled,true);assert.equal(echo.used,true);
  s.draftAll();s.use(s.a,scan,{index:0});assert.equal(scan.used,false);
});
test('Echo excludes Egg, permanently disabled cards, other Echo Shards and foreign card IDs',()=>{
  const s=setup(),echo=s.card(s.a,'echo_shard'),egg=s.card(s.a,'egg'),disabled=s.card(s.a,'scan'),foreign=s.card(s.b,'scan');disabled.disabled=true;
  for(const targetUid of [egg.uid,disabled.uid,foreign.uid,echo.uid,'forged'])assert.throws(()=>s.use(s.a,echo,{targetUid}),/eligible card/);assert.equal(echo.used,false);
});
test('Echo can link used or automatic items and does not retroactively refresh a used card',()=>{
  const s=setup(),scan=s.card(s.a,'scan'),echo=s.card(s.a,'echo_shard');s.use(s.a,scan,{index:0});s.use(s.a,echo,{targetUid:scan.uid});assert.equal(scan.used,true);
  const auto=setup(),shield=auto.card(auto.a,'shield');auto.use(auto.a,auto.card(auto.a,'echo_shard'),{targetUid:shield.uid});auto.act(auto.a,'reveal',{index:0});assert.equal(shield.used,false);auto.a.lives=3;auto.room.turnId=auto.a.id;auto.act(auto.a,'reveal',{index:4});assert.equal(shield.used,true);assert.equal(auto.a.lives,3);
});
test('Refresher restores only prior used eligible cards, with no charge added to unused cards',()=>{
  const s=setup(),scan=s.card(s.a,'scan'),risk=s.card(s.a,'risk_scanner'),egg=s.card(s.a,'egg'),refresh=s.card(s.a,'refresher');
  s.use(s.a,scan,{index:0});egg.disabled=true;egg.used=true;s.use(s.a,refresh);assert.equal(scan.used,false);assert.equal(risk.used,false);assert.equal(egg.used,true);assert.equal(refresh.used,true);
  s.use(s.a,risk,{index:2});assert.throws(()=>s.use(s.a,risk,{index:2}),/already used/);
});
test('Echo-linked Refresher has a bounded second use and does not reset its own Echo budget',()=>{
  const s=setup(),refresh=s.card(s.a,'refresher'),scan=s.card(s.a,'scan');s.use(s.a,s.card(s.a,'echo_shard'),{targetUid:refresh.uid});
  s.use(s.a,scan,{index:0});s.use(s.a,refresh);assert.equal(scan.used,false);assert.equal(refresh.used,false);s.use(s.a,scan,{index:0});s.use(s.a,refresh);assert.equal(refresh.used,true);assert.equal(scan.used,false);assert.throws(()=>s.use(s.a,refresh),/already used/);
});
test('Egg opens into an unowned same-rarity item and remains permanently disabled after refreshes and rounds',()=>{
  const s=setup(),egg=s.card(s.a,'egg');s.use(s.a,egg);assert.equal(egg.disabled,true);assert.equal(s.a.inventory[1].id,'scan');assert.equal(s.a.inventory[1].used,false);
  s.use(s.a,s.card(s.a,'refresher'));assert.equal(egg.used,true);s.game.finishRound(s.room,'Test');s.act(s.a,'next');assert.equal(egg.used,true);assert.equal(egg.eggRarity,'common');assert.ok(!s.a.draft.offers.some(c=>c.id==='egg'));
});
test('unopened Egg grows once per later round and caps at legendary; pregame Egg starts common',()=>{
  const s=setup(),egg=s.card(s.a,'egg');for(const rarity of ['rare','legendary','legendary']){s.game.finishRound(s.room,'Test');s.act(s.a,'next');assert.equal(egg.eggRarity,rarity);s.draftAll();}
  const g=new GameService({comeback:false,pick:()=>0}),{room,player}=g.create({name:'A'},'s');const pre=g.obtain(room,player,'egg');g.startRound(room);assert.equal(pre.eggRarity,'common');
});
test('Egg rewards Extra Heart automatically, and respects personal rarity exhaustion without being spent',()=>{
  const s=setup();for(const c of ITEMS.filter(c=>c.rarity==='common'&&!['egg','extra_heart'].includes(c.id)))s.card(s.a,c.id);
  const egg=s.card(s.a,'egg');s.use(s.a,egg);assert.equal(s.a.lives,4);assert.equal(s.a.inventory.find(c=>c.id==='extra_heart').used,true);
  const full=setup();for(const c of ITEMS.filter(c=>c.rarity==='common'))full.card(full.a,c.id);const unopened=full.a.inventory.find(c=>c.id==='egg');assert.throws(()=>full.use(full.a,unopened),/every enabled item/);assert.equal(unopened.disabled,undefined);
});
test('Poison counters are independent, staggered, and each threshold grows after triggering',()=>{
  const s=setup(3,10);s.use(s.a,s.card(s.a,'poison'),{playerId:s.b.id});s.use(s.c,s.card(s.c,'poison'),{playerId:s.b.id});assert.deepEqual(s.b.poisons.map(p=>p.threshold),[3,4]);
  for(const id of ['scan','risk_scanner','silent_scan'])s.use(s.b,s.card(s.b,id),{index:2});assert.equal(s.b.lives,9);assert.deepEqual(s.b.poisons.map(({actions,threshold})=>({actions,threshold})),[{actions:0,threshold:4},{actions:3,threshold:4}]);
  s.use(s.b,s.card(s.b,'reverse'));assert.equal(s.b.lives,8);assert.deepEqual(s.b.poisons.map(({actions,threshold})=>({actions,threshold})),[{actions:1,threshold:4},{actions:0,threshold:5}]);
  s.use(s.a,s.card(s.a,'noxious_cloud'));assert.equal(s.b.poisons.at(-1).threshold,6);
});
test('forced reveals and automatic Mine Shield each count as a poisoned player action; flags do not',()=>{
  const s=setup();s.use(s.a,s.card(s.a,'poison'),{playerId:s.b.id});s.card(s.b,'shield');s.act(s.b,'flag',{index:2,visibility:'private'});assert.equal(s.b.poisons[0].actions,0);
  s.use(s.a,s.card(s.a,'force_hand'),{playerId:s.b.id,index:0});assert.equal(s.b.lives,3);assert.equal(s.b.poisons[0].actions,2);s.use(s.b,s.card(s.b,'scan'),{index:2});assert.equal(s.b.lives,2);
});
test('automatic Extra Heart and Echo refreshes count, poison damage itself does not recurse',()=>{
  const s=setup();s.use(s.c,s.card(s.c,'poison'),{playerId:s.a.id});const heart=s.card(s.a,'extra_heart');heart.echo=true;s.game.autoItems(s.room,s.a);s.game.settle(s.room);
  assert.equal(s.a.lives,4);assert.deepEqual(s.a.poisons.map(({actions,threshold})=>({actions,threshold})),[{actions:0,threshold:4}]);assert.equal(heart.used,true);
});
test('Poison cannot eliminate or skip an active turn and armor still absorbs poison',()=>{const s=setup(4);s.a.lives=1;s.a.poisons=[{actions:2,threshold:3}];s.use(s.a,s.card(s.a,'scan'),{index:2});assert.equal(s.a.lives,1);assert.equal(s.room.turnId,s.a.id);const armored=setup();armored.b.armor=1;armored.b.poisons=[{actions:2,threshold:3}];armored.use(armored.b,armored.card(armored.b,'scan'),{index:2});assert.equal(armored.b.armor,0);assert.equal(armored.b.lives,3);});

test('Noxious Cloud poisons all opponents, and every poison source on them fogs their next turn',()=>{
  const s=setup(3,10);s.use(s.a,s.card(s.a,'noxious_cloud'));assert.equal(s.a.poisons.length,0);assert.equal(s.b.poisons.length,1);assert.equal(s.c.poisons.length,1);
  s.use(s.a,s.card(s.a,'poison'),{playerId:s.b.id});for(const id of ['scan','risk_scanner','silent_scan','double_hearts'])s.use(s.b,s.card(s.b,id),{index:2});assert.equal(s.b.pending.fog,2);s.game.nextTurn(s.room,s.a.id);assert.equal(s.room.foggedId,s.b.id);assert.equal(s.b.pending.fog,1);
});
test('Ricochet redirects attacks, poison, curse and delay; Noxious redirects separately without chaining',()=>{
  for(const id of ['hit','dagger','poison','curse','delay']){const s=setup(),rico=s.card(s.b,'ricochet');s.use(s.a,s.card(s.a,id),{playerId:s.b.id});assert.equal(rico.used,true);if(id==='hit'||id==='dagger')assert.equal(s.a.lives,2);if(id==='poison')assert.equal(s.a.poisons.length,1);if(id==='curse')assert.ok(s.a.curseUntil>0);if(id==='delay')assert.equal(s.a.pending.delay,true);}
  const s=setup();s.card(s.b,'ricochet');s.card(s.c,'ricochet');s.use(s.a,s.card(s.a,'noxious_cloud'));assert.equal(s.a.poisons.length,2);assert.equal(s.b.poisons.length,0);assert.equal(s.c.poisons.length,0);assert.equal(s.a.poisonFog,true);
});
test('Curse skips the next turn, blocks manual and automatic items immediately and expires on time',()=>{
  const s=setup();s.card(s.b,'shield');s.card(s.b,'ricochet').used=true;const scan=s.card(s.b,'scan');s.use(s.a,s.card(s.a,'curse'),{playerId:s.b.id});assert.equal(s.b.curseUntil,6000);
  assert.throws(()=>s.use(s.b,scan,{index:2}),/Curse/);s.use(s.a,s.card(s.a,'force_hand'),{playerId:s.b.id,index:0});assert.equal(s.b.lives,2);assert.equal(s.b.inventory.find(c=>c.id==='shield').used,false);
  s.card(s.b,'extra_heart');s.game.autoItems(s.room,s.b);assert.equal(s.b.lives,2);s.game.nextTurn(s.room,s.a.id);assert.equal(s.room.turnId,s.c.id);assert.equal(s.b.pending.skip,0);
  s.advance(4999);s.game.tick();assert.throws(()=>s.use(s.b,scan,{index:2}),/Curse/);s.advance(1);s.game.tick();assert.equal(s.b.lives,3);s.use(s.b,scan,{index:2});assert.equal(scan.used,true);
});
test('Curse uses five seconds at 0/10 second timers, adds ten percent only for longer timers, and never ends the active turn immediately',()=>{
  for(const timer of [0,10,15,60]){const s=setup();s.room.settings.timer=timer;s.use(s.b,s.card(s.b,'curse'),{playerId:s.a.id});assert.equal(s.a.curseUntil,6000+(timer>10?timer*100:0));assert.equal(s.room.turnId,s.a.id);assert.equal(s.a.pending.skip,1);}
});
test('round resets health resources, poison, curse, and delay but preserves unique cards and Echo links',()=>{
  const s=setup();s.use(s.a,s.card(s.a,'double_hearts'));s.use(s.a,s.card(s.a,'plated_armor'));s.use(s.a,s.card(s.a,'double_mine_shield'));s.use(s.b,s.card(s.b,'poison'),{playerId:s.a.id});s.use(s.b,s.card(s.b,'curse'),{playerId:s.a.id});s.a.pending.delay=true;
  s.game.finishRound(s.room,'Test');s.act(s.a,'next');assert.equal(s.a.lives,3);assert.equal(s.a.armor,3);assert.equal(s.a.mineShields,0);assert.equal(s.a.poisons.length,0);assert.equal(s.a.curseUntil,0);assert.equal(s.a.pending.delay,false);assert.ok(s.a.inventory.every(c=>!c.used));
});
test('unique collection excludes owned types from drafts, rerolls, rewards and Debug even when disabled',()=>{
  const s=setup(),scan=s.card(s.a,'scan');scan.disabled=true;assert.throws(()=>s.act(s.a,'debug-grant',{itemId:'scan'}),/already owns/);assert.ok(!lootPool(s.a.inventory,'common').some(c=>c.id==='scan'));
  s.game.finishRound(s.room,'Test');s.act(s.a,'next');for(let n=0;n<2;n++){assert.ok(!s.a.draft.offers.some(c=>c.id==='scan'));s.act(s.a,'draft-reroll');}s.draftAll();assert.equal(new Set(s.a.inventory.map(c=>c.id)).size,s.a.inventory.length);
});
test('partially exhausted slots stay distinct and retain rarity; fully exhausted drafts finish without duplicates or hangs',()=>{
  const commons=ITEMS.filter(c=>c.rarity==='common'),owned=commons.slice(1).map(c=>({id:c.id}));const d=beginDraft([['common','common','common']],()=>0,{},owned);assert.equal(d.offers.length,1);assert.equal(d.offers[0].id,commons[0].id);assert.equal(drawOffers(d,['common','common','common'],()=>0).length,1);
  const s=setup(1);for(const c of ITEMS)s.card(s.a,c.id);s.game.finishRound(s.room,'Test');s.act(s.a,'next');assert.equal(s.room.phase,'playing');assert.equal(new Set(s.a.inventory.map(c=>c.id)).size,ITEMS.length);assert.equal(s.a.inventory.length,ITEMS.length+1);assert.equal(s.a.draft.ready,true);
});
test('unlimited lives excludes all new health-dependent items while retaining Curse, Delay, Egg and refreshes',()=>{
  const s=setup(3,0);for(const id of ['hit','dagger','scythe','triple_down','quadruple_down','jest','double_hearts','double_mine_shield','plated_armor','poison','noxious_cloud'])assert.throws(()=>s.card(s.a,id),/disabled/);
  for(const id of ['curse','delay','egg','echo_shard','refresher'])assert.ok(s.card(s.a,id));
});
test('a known Silent Mine with Echo still hides its current usage and private refresh budget',()=>{
  const s=setup(),silent=s.card(s.a,'silent_mine');silent.revealed=true;silent.echo=true;const before=s.game.snapshot(s.room,s.b.id).players[0].items[0];s.use(s.a,silent,{index:2});assert.deepEqual(s.game.snapshot(s.room,s.b.id).players[0].items[0],before);
});
