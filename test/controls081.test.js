import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import{readFileSync}from'node:fs';
import{GameService}from'../lib/game.js';

test('new lobbies default to fifteen-second turns',()=>{
  const game=new GameService(),{room}=game.create({name:'Host'},'host');assert.equal(room.settings.timer,15);
});

test('pending flags render immediately without changing the authoritative board and roll back cleanly',()=>{
  const code=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
  const start=code.indexOf('function ownFlagAt('),end=code.indexOf('async function action(',start);
  const pendingFlags=new Map(),privateFlags=new Set(),ownSharedFlags=new Set(),color='#b8ed65';
  const ctx={pendingFlags,privateFlags,ownSharedFlags,color};vm.runInNewContext(code.slice(start,end),ctx);
  const cell={revealed:false,flagged:true,flagColors:['#a899f4']};
  pendingFlags.set(2,{visibility:'private',placed:true});assert.equal(ctx.ownFlagAt(2,'private'),true);assert.equal(privateFlags.size,0);
  pendingFlags.clear();assert.equal(ctx.ownFlagAt(2,'private'),false);
  pendingFlags.set(2,{visibility:'shared',placed:true});const preview=ctx.visibleCell(cell,2);
  assert.deepEqual(Array.from(preview.flagColors),['#a899f4',color]);assert.deepEqual(cell.flagColors,['#a899f4']);
  pendingFlags.clear();assert.equal(ctx.visibleCell(cell,2),cell);
  ownSharedFlags.add(2);pendingFlags.set(2,{visibility:'shared',placed:false});
  assert.equal(ctx.ownFlagAt(2,'shared'),false);assert.equal(ctx.visibleCell(cell,2).flagColors[0],'#a899f4');
});
