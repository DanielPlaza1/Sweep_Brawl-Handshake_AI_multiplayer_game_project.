import { randomUUID } from 'node:crypto';
import { ITEM_BY_ID, itemEnabled } from './items.js';
import { neighbors } from './board.js';
import { mineProbability,classify } from './solver.js';
import {BALANCE} from './balance.js';

const CHESS=['pawn','knight','rook','bishop','queen'];
const SCANS=['scan','risk_scanner','silent_scan','double_scan','super_scans','reticent_scans'];
const ELECTRICAL=['electrify','zap','galvanize','shocking_reanimation','batteries'];
const CUSTOM=new Set(['silent_scan','double_scan','super_scans','reticent_scans','duel','hide_two_numbers','hide_three_numbers','electrify','zap','galvanize','shocking_reanimation','batteries','hide','shadow','don_armor','scatter','scatter_2x']);
const fail=text=>{throw new Error(text);};

// The service owns turns, attribution, damage and protection. This module adds
// item-specific rules through explicit lifecycle hooks rather than a second loop.
export class ItemExpansion {
  constructor(service){this.service=service;}
  card(p,id){return p.inventory.find(c=>c.id===id&&!c.disabled&&!c.roundDisabled);}
  has(p,id){return !!this.card(p,id);}
  tracks(room,p,id){return this.has(p,id)&&itemEnabled(id,room.settings);}
  available(room,p,id,{ready=true}={}){
    const card=this.card(p,id);return card&&itemEnabled(id,room.settings)&&!this.service.blocked(p)&&(!ready||!card.used)?card:null;
  }
  glass(p){return p.healthItemsEnabled!==false&&this.has(p,'glass_cannon');}
  adaptiveMultiplier(p){return p.healthItemsEnabled!==false&&p.lives===1&&!this.service.blocked(p)&&this.has(p,'adaptive')?2:1;}
  cycleStarted(room){if(room.cycle<2)return;for(const p of this.service.eligible(room)){const card=this.available(room,p,'paranoid',{ready:false});if(!card||(p.paranoidAcquiredCycle??0)>=room.cycle-1||p.paranoidCycle===room.cycle)continue;p.paranoidCycle=room.cycle;this.service.spend(room,p,card);p.mineShields=(p.mineShields||0)+1;this.service.log(room,p.name+' gained a mine shield from a full turn cycle.','bonus',[],{playerId:p.id});}}
  counters(p){return p.expansionCounters??={reactive:0,adaptive:0,paranoid:0,grow:0,galvanize:0,batteries:0};}
  resetCard(item,room){
    const def=ITEM_BY_ID.get(item.id);if(!def)return;
    if(def.charges)item.charges=def.charges;
    item.passiveUsed=false;item.chessAnchor=null;item.chessTurn=null;item.refreshAfterTurn=null;
    const counter={reactive_barrier:'reactive',paranoid:'paranoid',adaptive:'adaptive',grow:'grow',galvanize:'galvanize',batteries:'batteries'}[item.id];
    if(counter){const owner=room?.players.find(p=>p.inventory.includes(item));if(owner)this.counters(owner)[counter]=0;}
  }
  refreshCard(item,room){this.resetCard(item,room);}
  consume(room,p,item){
    const maximum=ITEM_BY_ID.get(item.id)?.charges;
    if(maximum){
      item.charges??=maximum;if(item.charges<=0)fail('No charges remain.');item.charges--;
      const echo=item.echo;if(item.charges>0)item.echo=false;
      this.service.spend(room,p,item);item.echo=echo;
      if(item.charges>0)item.used=false;
      else if(!item.used)this.resetCard(item,room);
    }else this.service.spend(room,p,item);
  }
  pulse(room,p,item,text,{tone='positive'}={}){
    item.revealed=true;for(const stats of [p.stats,p.roundStats])stats.itemsUsed++;
    (room.actionQueue??=[]).push(p.id);
    this.service.log(room,text,'item',[],{playerId:p.id,itemUid:item.uid,tone});
  }
  addYellow(room,p,count=1,{temporary=false}={}){
    p.yellowBarriers??=[];
    for(let i=0;i<count;i++)p.yellowBarriers.push({expiresAfterTurn:temporary?(p.expansionTurnsEnded||0)+1:null});
    this.service.log(room,p.name+' gained '+count+' yellow barrier'+(count===1?'':'s')+'.','bonus',[],{playerId:p.id,tone:'positive'});
  }
  consumeYellow(room,p){
    if(this.service.blocked(p)||!p.yellowBarriers?.length)return false;
    // Spend a temporary barrier first so a lasting barrier is not wasted.
    p.yellowBarriers.sort((a,b)=>(a.expiresAfterTurn??Infinity)-(b.expiresAfterTurn??Infinity));p.yellowBarriers.shift();
    (room.actionQueue??=[]).push(p.id);
    this.service.log(room,p.name+' blocked a negative effect with a yellow barrier.','item',[],{playerId:p.id,tone:'positive'});return true;
  }
  beginRound(room){
    room.duels=[];
    for(const p of room.players){
      p.healthItemsEnabled=room.settings.lives!==0;
      p.yellowBarriers=[];p.hiddenUntil=0;p.hiddenBarrierOnEnd=false;p.adaptiveBonus=0;p.expansionTurnsEnded=0;p.expansionCounters={reactive:0,adaptive:0,paranoid:0,grow:0,galvanize:0,batteries:0};
      p.zapped=false;p.zapOrder=0;p.openingPriority=this.has(p,'queen')&&this.has(p,'knight')?2:this.has(p,'knight')?1:0;p.extraClears=p.openingPriority===2?1:0;
      for(const item of p.inventory){item.roundDisabled=false;item.growActivations=0;this.resetCard(item,room);}
      if(p.spectator)continue;
      // Starting health bonuses resolve before Glass Cannon's heart cost.
      const startOrder={rook:0,bishop:1,glass_cannon:3};
      for(const item of [...p.inventory].sort((a,b)=>(startOrder[a.id]??2)-(startOrder[b.id]??2)))this.obtained(room,p,item,{roundStart:true});
      this.damagePassives(room,p);
    }
  }
  obtained(room,p,item,{roundStart=false}={}){
    if(p.spectator||p.lives<=0||item.disabled||item.roundDisabled||!itemEnabled(item.id,room.settings)||this.service.blocked(p))return;
    if(ITEM_BY_ID.get(item.id)?.charges&&item.charges===undefined)item.charges=ITEM_BY_ID.get(item.id).charges;
    if(!roundStart){this.damagePassives(room,p);return;}
    if(item.id==='glass_cannon'){
      this.pulse(room,p,item,p.name+' starts the round as a Glass Cannon.');this.service.damage(room,p,1,{sourceId:null,reason:'Glass Cannon',nonlethal:true});
    }
    if(item.id==='rook'){
      if(this.has(p,'queen')){this.addYellow(room,p);this.pulse(room,p,item,p.name+' gained Rook’s upgraded barrier.');}
      else if(room.settings.lives!==0){this.service.heal(room,p,1,'Rook');this.pulse(room,p,item,p.name+' gained Rook’s starting bonus.');}
    }
    if(item.id==='bishop'){
      const id=this.has(p,'queen')?'silent_mine':'plant_mine';
      this.service.obtain(room,p,id,{duplicate:true,activate:false});this.pulse(room,p,item,p.name+' gained '+ITEM_BY_ID.get(id).name+' from Bishop.');
    }
  }
  damagePassives(room,p){
    if(p.lives<=0)return false;const counters=this.counters(p);let changed=false;
    const divine=this.available(room,p,'divine_barrier');
    if(divine&&p.lives===1){
      p.poisons=[];p.poisonFog=false;p.curseUntil=0;p.pending.skip=0;p.pending.fog=0;p.pending.delay=false;p.pending.zap=false;p.pending.halfTimer=false;p.pending.forcedDown=null;p.zapped=false;
      this.service.restoreTurnPosition?.(room,p);
      if(room.foggedId===p.id)room.foggedId=null;
      this.service.spend(room,p,divine);this.addYellow(room,p,2);
      changed=true;
      this.service.log(room,p.name+' cleared their debuffs with Divine Barrier.','bonus',[],{playerId:p.id,tone:'positive'});
    }
    const reactive=this.available(room,p,'reactive_barrier');
    if(reactive&&counters.reactive>=BALANCE.reactiveHearts){
      counters.reactive=0;this.service.spend(room,p,reactive);reactive.refreshAfterTurn=(p.expansionTurnsEnded||0)+1;
      changed=true;
      if(this.has(p,'divine_barrier'))this.addYellow(room,p);else{p.mineShields=(p.mineShields||0)+1;this.service.log(room,p.name+' gained a reactive mine shield.','bonus',[],{playerId:p.id,tone:'positive'});}
    }
    return changed;
  }
  afterDamage(room,p,{heartsLost=0}={}){
    if(!heartsLost)return;const counters=this.counters(p);
    if(this.tracks(room,p,'reactive_barrier'))counters.reactive+=heartsLost;
    this.damagePassives(room,p);
  }
  beforeNegative(room,p,{reason='effect'}={}){
    const card=this.available(room,p,'compensate');if(!card||p.lives<=0)return;
    this.service.heal(room,p,1,'Compensate');this.service.spend(room,p,card);
  }
  boardChanged(room,count=1){}
  afterAction(room,actor){
    const own=this.counters(actor);
    if(this.tracks(room,actor,'grow'))own.grow++;
    if(this.tracks(room,actor,'galvanize'))own.galvanize++;
    if(this.tracks(room,actor,'batteries'))own.batteries++;
    this.actionPassives(room,actor);
    for(const p of room.players){
      if(p.id===actor.id||p.spectator||p.lives<=0||!this.tracks(room,p,'paranoid'))continue;this.counters(p).paranoid++;
      this.actionPassives(room,p);
    }
  }
  actionPassives(room,actor){
    if(actor.spectator||actor.lives<=0||this.service.blocked(actor))return false;
    const own=this.counters(actor),before=room.eventId;
    const grow=this.available(room,actor,'grow');if(grow&&(grow.growActivations||0)<BALANCE.growThresholds.length&&own.grow>=BALANCE.growThresholds[grow.growActivations||0]&&actor.lives>0&&actor.lives<(room.settings.lives??3)+BALANCE.heartCapBonus){own.grow=0;grow.growActivations=(grow.growActivations||0)+1;this.service.spend(room,actor,grow,{quiet:true});grow.refreshAfterTurn=(actor.expansionTurnsEnded||0)+1;this.service.heal(room,actor,1,'Grow');}
    const galvanize=this.card(actor,'galvanize');if(galvanize&&galvanize.passiveUsed&&own.galvanize>=5&&!this.service.blocked(actor)){galvanize.passiveUsed=false;own.galvanize=0;this.service.log(room,actor.name+' recharged Galvanize.','bonus',[],{playerId:actor.id,tone:'positive'});}
    const battery=this.card(actor,'batteries');if(battery&&own.batteries>=5&&!this.service.blocked(actor)){
      own.batteries=0;const maximum=ITEM_BY_ID.get('batteries').charges;if((battery.charges??maximum)<maximum){battery.charges=(battery.charges??maximum)+1;battery.used=false;this.service.log(room,actor.name+' recovered a Batteries charge.','bonus',[],{playerId:actor.id,tone:'positive'});}
    }
    return room.eventId!==before;
  }
  afterTurn(room,p){
    p.expansionTurnsEnded=(p.expansionTurnsEnded||0)+1;if(!p.pending.delay&&!p.pending.zap)p.zapped=false;
    if(p.yellowBarriers?.length)p.yellowBarriers=p.yellowBarriers.filter(b=>b.expiresAfterTurn===null||b.expiresAfterTurn>p.expansionTurnsEnded);
    for(const item of p.inventory)if(item.refreshAfterTurn&&item.refreshAfterTurn<=p.expansionTurnsEnded&&!item.disabled&&!item.roundDisabled){item.used=false;item.refreshAfterTurn=null;if(item.id==='reactive_barrier')this.counters(p).reactive=0;if(item.id==='adaptive')this.counters(p).adaptive=0;if(item.id==='paranoid')this.counters(p).paranoid=0;}
    if(!room.board||!['playing','preparing'].includes(room.phase))return;
    const sources=room.board.cells.flatMap((c,i)=>c.electricOwner&&!c.revealed?[i]:[]);
    for(const index of sources){
      const cell=room.board.cells[index],owner=room.players.find(o=>o.id===cell.electricOwner),item=owner&&this.available(room,owner,'galvanize',{ready:false});
      if(!item||owner.lives<=0||this.service.pick(100)>=5)continue;
      const choices=neighbors(index,room.board.width,room.board.height).filter(i=>!room.board.cells[i].revealed&&!room.board.cells[i].electricOwner);
      if(choices.length){const next=choices[this.service.pick(choices.length)];this.electrify(room,owner,next);this.pulse(room,owner,item,owner.name+'’s electricity spread.');}
    }
  }
  onLethal(room,p){
    const reanimation=this.available(room,p,'shocking_reanimation',{ready:false});if(p.lives>0||!reanimation)return false;
    const rarity={common:0,rare:1,legendary:2},choices=p.inventory.filter(c=>ELECTRICAL.includes(c.id)&&!c.disabled&&!c.roundDisabled&&itemEnabled(c.id,room.settings));
    choices.sort((a,b)=>rarity[ITEM_BY_ID.get(a.id).rarity]-rarity[ITEM_BY_ID.get(b.id).rarity]);const sacrifice=choices[0];if(!sacrifice)return false;
    sacrifice.roundDisabled=true;sacrifice.used=true;sacrifice.revealed=true;p.lives=2;this.pulse(room,p,reanimation,p.name+' used Shocking Reanimation, sacrificed '+ITEM_BY_ID.get(sacrifice.id).name+' and returned with 2 hearts.');this.addYellow(room,p);return true;
  }
  chessMatch(id,anchor,index,width){
    const dx=Math.abs(index%width-anchor%width),dy=Math.abs(Math.floor(index/width)-Math.floor(anchor/width));if(!dx&&!dy)return false;
    if(id==='pawn')return dx===0&&(dy===1||dy===2)||dx===1&&dy===1;
    if(id==='knight')return dx===1&&dy===2||dx===2&&dy===1;
    if(id==='rook')return dx===0||dy===0;
    if(id==='bishop')return dx===dy;
    return dx===0||dy===0||dx===dy;
  }
  beforeScore(room,p,index,{forced=false}={}){
    let multiplier=1;
    if(!forced&&!this.service.blocked(p))for(const id of CHESS){
      const card=this.available(room,p,id);if(!card||card.chessAnchor===null||card.chessAnchor===undefined||room.turnSerial<=(card.chessTurn??-1))continue;
      if(this.chessMatch(id,card.chessAnchor,index,room.board.width))multiplier=Math.max(multiplier,id==='queen'||id==='pawn'&&this.has(p,'queen')?2:1.5);
    }
    return {additive:0,multiplier};
  }
  afterReveal(room,p,index,{forced=false,first=false,basePoints=0,opened=[],points=0}={}){
    const cell=room.board.cells[index];
    if(!forced&&!this.service.blocked(p))for(const id of CHESS){
      const card=this.available(room,p,id);if(!card)continue;
      if(card.chessAnchor===null||card.chessAnchor===undefined){if(!cell.mine){card.chessAnchor=index;card.chessTurn=room.turnSerial;card.revealed=true;}continue;}
      if(room.turnSerial<=(card.chessTurn??-1))continue;
      if(!cell.mine&&this.chessMatch(id,card.chessAnchor,index,room.board.width)){card.chessAnchor=index;card.chessTurn=room.turnSerial;}
      else {this.service.spend(room,p,card);if(!card.used)this.resetCard(card,room);}
    }
    if(!forced&&!first)for(const duel of room.duels||[]){
      if(duel.done||!duel.players.includes(p.id)||duel.clears[p.id]!==undefined)continue;duel.clears[p.id]=basePoints;
      if(duel.players.every(id=>duel.clears[id]!==undefined)){
        duel.done=true;const [a,b]=duel.players.map(id=>room.players.find(o=>o.id===id));if(!a||!b||a.lives<=0||b.lives<=0)continue;
        const av=duel.clears[a.id],bv=duel.clears[b.id];if(av===bv){this.service.log(room,'Duel ended in a draw.','item',[],{tone:'neutral'});continue;}
        const winner=av>bv?a:b,loser=av>bv?b:a,stolen=Math.min(loser.score,duel.clears[loser.id]);loser.score-=stolen;this.service.gain(room,winner,stolen,{underdog:true});
        this.service.damage(room,loser,1,{sourceId:winner.id,reason:'Duel',nonlethal:true});this.service.log(room,winner.name+' won the duel and stole '+stolen+' points.','bonus',[],{playerId:winner.id,targetId:loser.id,toneBy:{[winner.id]:'positive',[loser.id]:'negative'}});
      }
    }
    for(const i of opened){const ownerId=room.board.cells[i].electricOwner;if(!ownerId)continue;delete room.board.cells[i].electricOwner;const owner=room.players.find(o=>o.id===ownerId);this.zap(room,owner||p,p,{fromCell:true});}
  }
  personal(room,p){
    const chessTargets=[];
    if(room.board&&!this.service.blocked(p))for(let index=0;index<room.board.cells.length;index++)if(!room.board.cells[index].revealed&&CHESS.some(id=>{const card=this.available(room,p,id);return card&&card.chessAnchor!==null&&card.chessAnchor!==undefined&&this.chessMatch(id,card.chessAnchor,index,room.board.width);}))chessTargets.push(index);
    return {chessTargets};
  }
  electricityBonus(room){for(const p of room.players)if(!p.spectator&&p.lives>0&&this.available(room,p,'batteries',{ready:false})){this.service.gain(room,p,1);this.service.log(room,p.name+' gained +1 from Batteries.','bonus',[],{playerId:p.id,tone:'positive'});}}
  electrify(room,p,index){
    const cell=room.board.cells[index];if(cell.electricOwner)return false;cell.electricOwner=p.id;this.boardChanged(room);this.electricityBonus(room);
    this.service.log(room,p.name+' electrified a cell.','item',[index],{playerId:p.id,tone:'neutral'});return true;
  }
  zap(room,actor,target,{fromCell=false}={}){
    if(target.zapped)return false;
    let unreflected=true;if(!fromCell){const initial=target.id;target=this.service.redirect(room,target,actor,'zap');if(!target)return false;unreflected=target.id===initial&&room.effectSourceId===actor?.id;}
    else if(this.consumeYellow(room,target))return false;
    if(target.zapped)return false;
    const galvanize=this.available(room,target,'galvanize',{ready:false});
    if(galvanize&&!galvanize.passiveUsed){
      galvanize.passiveUsed=true;this.counters(target).galvanize=0;this.pulse(room,target,galvanize,target.name+' turned a zap into an early turn.');this.service.earlyTurn(room,target);
    }else {target.zapped=true;room.zapSerial=(room.zapSerial||0)+1;target.zapOrder=room.zapSerial;this.service.zapTurn(room,target,{sourceId:fromCell?actor?.id||null:this.service.sourceOf?.(room,actor?.id)||actor?.id||null,reason:'Zapped'});}
    if(unreflected&&actor)this.service.disruption(room,actor,target,fromCell?'Electrify':'Zap');this.electricityBonus(room);return true;
  }
  assertTarget(room,p,playerId,{other=false}={}){
    const target=room.players.find(o=>o.id===playerId&&o.connected&&!o.spectator&&o.lives>0);if(!target||other&&target.id===p.id)fail(other?'Choose another living player.':'Choose a living player.');
    if(target.id!==p.id&&(target.hiddenUntil||0)>this.service.now())fail('That player cannot be targeted right now.');return target;
  }
  use(room,p,item,index,playerId){
    const def=ITEM_BY_ID.get(item.id),isScan=SCANS.includes(item.id);
    if(!CUSTOM.has(item.id)&&!(['scan','risk_scanner'].includes(item.id)&&(this.has(p,'super_scans')||this.has(p,'reticent_scans'))))return false;
    if(item.roundDisabled)fail('This card is disabled for the round.');
    if(def.afterFirstClear&&room.board.openingPending)fail('Use this item after the first clear.');
    let target=null;
    if(def.target==='player'||def.target==='cell-or-player'&&playerId){target=this.assertTarget(room,p,playerId,{other:item.id==='duel'||item.id==='batteries'});}
    if(def.target==='hidden'||isScan||def.target==='cell-or-player'&&!target){this.service.validateCell(room,index);if(room.board.cells[index].revealed)fail('Choose a hidden cell.');}
    if(def.target==='revealed-cell'){
      this.service.validateCell(room,index);const cell=room.board.cells[index];if(!cell.revealed||cell.mine||cell.number<=0)fail('Choose a revealed numbered cell.');if(cell.hiddenBy===p.id)fail('You already hid that number.');
    }
    if(['scatter','scatter_2x'].includes(item.id)&&!room.board.cells.some(c=>!c.revealed&&!c.mine))fail('No hidden safe cells remain.');
    if(['scatter','scatter_2x'].includes(item.id)&&this.has(p,'silent_mine'))this.service.spend(room,p,item,{secret:true});else this.consume(room,p,item);
    if(isScan){
      if(item.id==='risk_scanner'){const preview=room.board.openingPending?{points:15,tier:'opening'}:classify(this.service.scoringView(room,p),index);p.notes.unshift({id:randomUUID(),round:room.round,index,kind:'postulate',name:'Risk Scanner points',points:preview.points,tier:preview.tier,stale:false});}
      const area=item.id==='super_scans'||this.has(p,'super_scans'),silent=['silent_scan','reticent_scans'].includes(item.id)||this.has(p,'reticent_scans');
      const indexes=[index,...(area?neighbors(index,room.board.width,room.board.height):[])].filter(i=>!room.board.cells[i].revealed),risk=item.id==='risk_scanner',view=risk?this.service.snapshot(room,p.id).board:null;
      for(const i of indexes){const cell=room.board.cells[i],probability=risk?mineProbability(view,i):null,result=risk?{p:probability.p,exact:probability.exact}:{isMine:cell.mine},kind=risk?'risk_scanner':'scan';
        if(silent){p.notes.unshift({id:randomUUID(),round:room.round,index:i,kind:risk?'risk_scanner':'silent_scan',name:def.name,...result,stale:false});}
        else {cell.publicMarks=(cell.publicMarks||[]).filter(m=>m.kind!==kind);cell.publicMarks.push({kind,name:def.name,by:p.id,...result,stale:false});}}
      p.notes=p.notes.slice(0,100);if(!silent)this.service.log(room,p.name+' scanned '+indexes.length+' cell'+(indexes.length===1?'':'s')+'.','item',indexes,{playerId:p.id,tone:'neutral'});
    }else if(item.id==='duel'){
      target=this.service.redirect(room,target,p,'Duel');if(!target)return true;
      if(target.id===p.id){this.service.log(room,p.name+'’s reflected Duel fizzled.','item',[],{playerId:p.id,tone:'neutral'});return true;}
      room.duels??=[];room.duels.push({id:randomUUID(),players:[p.id,target.id],clears:{},done:false});this.service.log(room,p.name+' challenged '+target.name+' to a duel.','item',[],{playerId:p.id,targetId:target.id,tone:'neutral'});
    }else if(['hide_two_numbers','hide_three_numbers'].includes(item.id)){
      room.board.cells[index].hiddenBy=p.id;this.boardChanged(room);
      for(const other of room.players)if(other.id!==p.id&&!other.spectator&&other.lives>0)this.service.negativeApplied?.(room,other,{sourceId:p.id,reason:'Hidden number'});
      this.service.disruption(room,p,room.players.filter(o=>o.id!==p.id&&!o.spectator&&o.lives>0).sort((a,b)=>b.score-a.score)[0],'Hidden number');this.service.log(room,p.name+' hid a number.','item',[index],{playerId:p.id,tone:'neutral'});
    }else if(['electrify','galvanize','shocking_reanimation','batteries'].includes(item.id)){
      if(target)this.zap(room,p,target);else this.electrify(room,p,index);
    }else if(item.id==='zap')this.zap(room,p,target);
    else if(['hide','shadow'].includes(item.id)){
      const seconds=item.id==='hide'?6+room.settings.timer*.1:10+room.settings.timer*.15;p.hiddenUntil=Math.max(p.hiddenUntil||0,this.service.now()+seconds*1000);
      p.hiddenBarrierOnEnd=item.id==='shadow'||this.has(p,'shadow');this.service.log(room,p.name+' is hidden for '+Number(seconds.toFixed(1))+' seconds.','bonus',[],{playerId:p.id,tone:'positive'});
    }else if(item.id==='don_armor')this.addYellow(room,p,1,{temporary:true});
    else if(['scatter','scatter_2x'].includes(item.id)){
      const count=item.id==='scatter'?2:4,choices=room.board.cells.flatMap((c,i)=>!c.revealed&&!c.mine?[i]:[]);let planted=0;
      for(let i=0;i<count&&choices.length;i++){const at=this.service.pick(choices.length),[chosen]=choices.splice(at,1),cell=room.board.cells[chosen];cell.mine=true;cell.silent=this.has(p,'silent_mine');cell.mineOwner=p.id;if(!cell.silent){room.board.mines++;for(const n of neighbors(chosen,room.board.width,room.board.height))room.board.cells[n].number++;cell.publicMarks=(cell.publicMarks||[]).filter(m=>m.kind!=='scan');for(const owner of room.players)for(const note of owner.notes)if(note.index===chosen)note.stale=true;}planted++;}
      if(!this.has(p,'silent_mine'))this.service.staleRisks(room);this.boardChanged(room,planted);if(!this.has(p,'silent_mine'))this.service.log(room,p.name+' scattered '+planted+' mines.','item',[],{playerId:p.id,tone:'neutral'});
    }
    return true;
  }
  tick(room){
    const before=room.eventId;this.cycleStarted(room);let changed=room.eventId!==before;for(const p of room.players){
      if(p.hiddenUntil&&this.service.now()>=p.hiddenUntil){p.hiddenUntil=0;if(p.hiddenBarrierOnEnd&&p.lives>0&&!this.service.blocked(p)){this.addYellow(room,p,1,{temporary:true});p.hiddenBarrierOnEnd=false;}changed=true;}
      else if(!p.hiddenUntil&&p.hiddenBarrierOnEnd&&p.lives>0&&!this.service.blocked(p)){this.addYellow(room,p,1,{temporary:true});p.hiddenBarrierOnEnd=false;changed=true;}
      if(this.damagePassives(room,p))changed=true;
      if(this.actionPassives(room,p))changed=true;
    }return changed;
  }
}
