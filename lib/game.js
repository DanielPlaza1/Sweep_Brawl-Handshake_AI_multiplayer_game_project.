import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import { ROUNDS, createRoundBoard, safeOpening, reveal, publicBoard, chooseBotMove, neighbors } from './board.js';
import { classify, mineProbability, SCORING } from './solver.js';
import { ITEMS, ITEM_BY_ID, rollProfiles, beginDraft, drawOffers, ownItem, publicItem, itemEnabled, lootPool } from './items.js';

import { ItemExpansion } from './item-expansion.js';
import { RoundTools, roundConfig, BOARD_DIFFICULTIES, comebackMultiplier } from './round-tools.js';
import { BotBrain, BOT_NAMES, BOT_LEVELS } from './bots.js';
import {BALANCE} from './balance.js';
import {isGhost,haunt} from './haunt.js';

export const SCORE_BONUSES=Object.freeze({heartDamage:5,elimination:50,assist:10,firstClear:15});
export function shadeColor(base,shade=50){const toward=shade<50?'#18202b':'#ffffff',amount=Math.abs(shade-50)/100;const parts=[1,3,5].map(i=>Math.round(parseInt(base.slice(i,i+2),16)*(1-amount)+parseInt(toward.slice(i,i+2),16)*amount).toString(16).padStart(2,'0'));return '#'+parts.join('');}
export const COLORS=['#b8ed65','#a899f4','#ffad7a','#69d6df','#f28ead','#ffd166'];
export const TIMERS=[0,10,15,20,30,45,60], PREVIEWS=[0,3,5,10];
const CODE_CHARS='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',MAX_PLAYERS=8;
const fail=message=>{throw new Error(message);};
const emptyStats=()=>({minesHit:0,safeCells:0,timeouts:0,bravestGuess:null,flagPoints:0,streak:0,maxStreak:0,itemsUsed:0});
export class GameService {
  constructor({emit=()=>{},emitState=null,emitPrivate=()=>{},evict=()=>{},now=Date.now,pick=randomInt,comeback=true}={}){
    this.rooms=new Map();this.acquireSeq=0;Object.assign(this,{emit,emitState,emitPrivate,evict,now,pick});this.expansion=new ItemExpansion(this);this.roundTools=new RoundTools(this);this.botBrain=new BotBrain(this);this.comebackEnabled=comeback;
  }
  profile(input={}){
    if(typeof input.name!=='string'||!input.name.trim())fail('Enter a name.');
    const name=input.name.trim().replace(/[\u0000-\u001f]/g,'').slice(0,20);if(!name)fail('Enter a name.');
    const baseColor=COLORS.includes(input.color)?input.color:COLORS[0],shade=input.shade??50;if(!Number.isInteger(shade)||shade<0||shade>100)fail('Choose a shade between dark and light.');return {name,baseColor,shade,color:shadeColor(baseColor,shade)};
  }
  makePlayer(profile,socketId,spectator=false){return {id:randomUUID(),token:randomBytes(24).toString('hex'),...profile,socketId,connected:true,spectator,bot:false,ghostActionUsed:false,eliminatedRound:null,lives:3,score:0,stats:emptyStats(),roundStats:emptyStats(),privateFlags:new Set(),inventory:[],notes:[],draft:null,effects:{},armor:0,mineShields:0,poisons:[],poisonFog:false,curseUntil:0,pending:{skip:0,fog:0,delay:false}};}
  create(input,socketId){
    if(this.rooms.size>=300)fail('Server full. Try again soon.');const profile=this.profile(input);let code;
    do{code=Array.from({length:6},()=>CODE_CHARS[randomInt(CODE_CHARS.length)]).join('');}while(this.rooms.has(code));
    const player=this.makePlayer(profile,socketId),room={code,players:[player],hostId:player.id,phase:'lobby',settings:{rounds:3,timer:15,preview:3,lives:3,debug:false,difficulty:'normal',itemPool:'party'},round:0,board:null,turnId:null,deadline:null,botAt:null,previewUntil:null,emptySince:null,log:[],eventId:0,turnSerial:0,endReason:'',roundWinnerId:null,multiplayerRound:false,flagsScored:false,direction:1,pendingFog:0,foggedId:null,forced:null,forceChooser:null,draftProfiles:[]};
    this.assignColor(room,player,profile.baseColor,profile.shade);this.rooms.set(code,room);this.log(room,`${player.name} created the room.`,'room');return {room,player};
  }
  join(input,socketId){
    const room=this.rooms.get(String(input.code||'').trim().toUpperCase());if(!room)fail('Room not found. Create a new room.');
    const profile=this.profile(input),tokenPlayer=typeof input.token==='string'?room.players.find(p=>!p.bot&&p.token===input.token):null;
    let player=tokenPlayer||room.players.find(p=>!p.bot&&p.name.toLowerCase()===profile.name.toLowerCase());
    if(player){if(!tokenPlayer&&player.connected)fail('Name already in use.');const old=player.socketId;player.connected=true;player.socketId=socketId;if(old&&old!==socketId)player.replacedSocket=old;this.log(room,`${player.name} reconnected.`,'room');}
    else{if(room.phase==='lobby'&&room.players.filter(p=>!p.spectator).length>=MAX_PLAYERS||room.players.length>=16)fail('Room full.');player=this.makePlayer(profile,socketId,room.phase!=='lobby');room.players.push(player);this.assignColor(room,player,profile.baseColor,profile.shade);this.log(room,`${player.name} joined${player.spectator?' as a spectator':''}.`,'room');}
    room.emptySince=null;this.assignHost(room);if(room.phase==='playing'&&!room.turnId)this.nextTurn(room);this.maybeFinishDraft(room);return {room,player};
  }
  assignColor(room,p,baseColor,shade=50){
    const occupied=room.players.filter(o=>o.id!==p.id&&(o.baseColor||o.color)===baseColor).map(o=>o.shade??50),choices=Array.from({length:101},(_,i)=>i).sort((a,b)=>Math.abs(a-shade)-Math.abs(b-shade));
    p.baseColor=baseColor;p.shade=choices.find(n=>occupied.every(o=>Math.abs(o-n)>=12))??choices.find(n=>!occupied.includes(n))??shade;p.color=shadeColor(baseColor,p.shade);
  }
  log(room,text,type='info',cells=[],details={}){
    const tone=details.tone||(['score','bonus','heal'].includes(type)?'positive':['mine','damage','poison','skip','timeout','curse'].includes(type)?'negative':'neutral');
    room.log.unshift({id:++room.eventId,text,type,tone,cells,at:this.now(),...details});room.log=room.log.slice(0,60);
  }
  personal(room,p){return {...this.expansion.personal(room,p),exposedFlags:p.exposedFlags||[],privateFlags:[...p.privateFlags],ownSharedFlags:(room.board?.cells||[]).flatMap((c,i)=>c.flags.has(p.id)?[i]:[]),inventory:p.inventory.map(ownItem),notes:p.notes.map(n=>({...n})),draft:p.draft?{choice:p.draft.choice,rerollsLeft:p.draft.rerollsLeft,ready:p.draft.ready,offers:p.draft.offers.map(ownItem)}:null};}
  snapshot(room,viewerId){
    const board=publicBoard(room.board,room.players,['round-end','finished'].includes(room.phase));
    if(board&&viewerId&&!['round-end','finished'].includes(room.phase))board.cells=board.cells.map((c,i)=>c.revealed&&typeof c.value==='number'&&room.board.cells[i].hiddenBy&&room.board.cells[i].hiddenBy!==viewerId?{...c,value:'?',concealed:true}:c);
    if(board&&room.foggedId===viewerId&&['playing','targeting'].includes(room.phase))board.cells=board.cells.map(c=>c.revealed&&typeof c.value==='number'?{...c,value:'?'}:c);
    const view={code:room.code,hostId:room.hostId,phase:room.phase,settings:{...room.settings},round:room.round,board,turnId:room.turnId,turnSerial:room.turnSerial,turnOrder:[room.turnId,...(room.turnQueue||[])].filter((id,i,all)=>id&&all.indexOf(id)===i&&room.players.some(p=>p.id===id&&p.connected&&!p.spectator&&p.lives>0)),completedTurns:[...(room.completedTurns||[])],cycle:room.cycle||0,deadline:room.deadline,previewUntil:room.previewUntil,serverTime:this.now(),endReason:room.endReason,roundWinnerId:room.roundWinnerId,nextRound:room.round<room.settings.rounds?roundConfig(room.round+1,room.settings.difficulty):null,replay:this.roundTools.publicReplay(room),boardDifficulties:BOARD_DIFFICULTIES,scoring:{...SCORING,...SCORE_BONUSES},catalog:ITEMS,direction:room.direction,forced:room.forced?{...room.forced}:null,forceChooser:room.forceChooser,foggedId:room.foggedId,draftProfiles:room.draftProfiles.map(p=>[...p]),players:room.players.map(p=>({id:p.id,name:p.name,color:p.color,baseColor:p.baseColor||p.color,shade:p.shade??50,connected:p.connected,spectator:p.spectator,bot:p.bot,ghost:isGhost(room,p),ghostActionUsed:!!p.ghostActionUsed,spookedUntil:p.spookedUntil||0,botDifficulty:p.botDifficulty||'normal',glassCannon:this.expansion.glass(p),forcedDown:!!p.pending.forcedDown,halfTimer:!!p.pending.halfTimer,comebackMultiplier:this.comebackEnabled?comebackMultiplier(room.players,p):1,comebackPoints:p.stats.comebackPoints||0,lives:room.settings.lives===0?null:p.lives,armor:p.armor||0,mineShields:p.mineShields||0,yellowBarriers:p.yellowBarriers?.length||0,hiddenUntil:p.hiddenUntil||0,adaptiveBonus:p.adaptiveBonus||0,curseUntil:p.curseUntil||0,poisons:(p.poisons||[]).map(e=>({actions:e.actions,threshold:e.threshold})),poisonFog:!!p.poisonFog,delayed:!!p.pending.delay,zapped:!!p.zapped,early:!!p.pending.early,multiplier:this.multiplier(p),score:p.score,stats:{...p.stats},roundStats:{...p.roundStats},items:p.inventory.map(publicItem),draftProgress:p.draft?.choice||0,draftReady:!!p.draft?.ready})),log:room.log.map(e=>({...e,cells:[...e.cells]}))};
    const player=room.players.find(p=>p.id===viewerId);if(player)Object.assign(view,this.personal(room,player));return view;
  }
  broadcast(room){
    this.roundTools.capture(room);
    if(this.emitState){for(const p of room.players)if(p.connected&&!p.bot)this.emitState(p.socketId,this.snapshot(room,p.id));}
    else{this.emit(room.code,this.snapshot(room));for(const p of room.players)if(p.connected&&!p.bot)this.sendPrivate(room,p);}
  }
  sendPrivate(room,p){const personal=this.personal(room,p);this.emitPrivate(p.socketId,{code:room.code,...personal,flags:personal.privateFlags,sharedFlags:personal.ownSharedFlags});}
  assignHost(room){if(!room.players.some(p=>p.id===room.hostId&&p.connected&&!p.bot))room.hostId=room.players.find(p=>p.connected&&!p.bot)?.id||null;}
  disconnect(socketId){
    for(const room of this.rooms.values()){
      const p=room.players.find(p=>p.socketId===socketId&&p.connected);if(!p)continue;p.connected=false;p.socketId=null;this.log(room,`${p.name} disconnected.`,'room');this.assignHost(room);
      if(room.forceChooser===p.id){room.phase='playing';room.forceChooser=null;}
      if(!room.players.some(p=>p.connected&&!p.bot)){room.emptySince=this.now();room.turnId=null;room.deadline=null;room.botAt=null;}
      else if(room.turnId===p.id)this.nextTurn(room,p.id);
      this.maybeFinishDraft(room);this.broadcast(room);
    }
  }
  eligible(room){return room.players.some(p=>p.connected&&!p.bot)?room.players.filter(p=>p.connected&&!p.spectator&&p.lives>0):[];}
  findNext(room,afterId){const eligible=this.eligible(room);if(afterId===room.turnId){const queued=(room.turnQueue||[]).map(id=>eligible.find(p=>p.id===id)).find(Boolean);if(queued)return queued;}const start=room.players.findIndex(p=>p.id===afterId);for(let offset=1;offset<=room.players.length;offset++){const index=start<0?offset-1:(start+offset*room.direction+room.players.length*2)%room.players.length;const p=room.players[index];if(eligible.includes(p))return p;}return null;}
  initialOrder(room){
    const eligible=this.eligible(room),has=(p,id)=>p.inventory.some(c=>c.id===id&&!c.disabled&&!c.roundDisabled);
    const priority=eligible.filter(p=>has(p,'queen')&&has(p,'knight')).sort((a,b)=>{const ca=a.inventory.find(c=>c.id==='queen'),cb=b.inventory.find(c=>c.id==='queen');return (ca.acquiredAt||0)-(cb.acquiredAt||0)||(this.pick(2)?1:-1);});
    const rest=eligible.filter(p=>!priority.includes(p)),weighted=[];
    if(rest.some(p=>has(p,'knight')))while(rest.length){const total=rest.reduce((n,p)=>n+(has(p,'knight')?2:1),0);let roll=this.pick(total),at=0;while(roll>=(has(rest[at],'knight')?2:1)){roll-=has(rest[at],'knight')?2:1;at++;}weighted.push(rest.splice(at,1)[0]);}
    else weighted.push(...rest);
    return [...priority,...weighted].map(p=>p.id);
  }
  orderQueue(room,ids,{reverse=false}={}){
    const player=id=>room.players.find(p=>p.id===id),early=ids.filter(id=>player(id).pending.early).sort((a,b)=>(player(b).pending.earlyOrder||0)-(player(a).pending.earlyOrder||0)),late=ids.filter(id=>player(id).pending.delay).sort((a,b)=>(player(a).pending.delayOrder||0)-(player(b).pending.delayOrder||0)),normal=ids.filter(id=>!early.includes(id)&&!late.includes(id));
    if(reverse)normal.reverse();for(let i=normal.length-2;i>=0;i--){const p=player(normal[i]);if(p.pending.zap&&p.pending.zapAppliedCycle!==room.cycle){[normal[i],normal[i+1]]=[normal[i+1],normal[i]];p.pending.zapAppliedCycle=room.cycle;}}return [...early,...normal,...late.filter(id=>!early.includes(id))];
  }
  fillCycle(room){
    const eligible=this.eligible(room).map(p=>p.id);if(!eligible.length){room.turnQueue=[];return;}
    let base=room.cycleBase?.filter(id=>eligible.includes(id))||eligible;
    for(const id of eligible)if(!base.includes(id))base.push(id);
    if(room.direction===-1&&base.length>1)base=[base[0],...base.slice(1).reverse()];
    room.cycle=(room.cycle||0)+1;room.turnQueue=this.orderQueue(room,base);room.completedTurns=[];this.expansion.cycleStarted(room);
  }
  nextTurn(room,afterId=room.turnId){
    const previous=room.players.find(p=>p.id===room.turnId);room.turnId=null;
    if(previous){this.expansion.afterTurn(room,previous);previous.effects={};previous.extraClears=0;previous.turnProtected=false;(room.completedTurns??=[]).push(previous.id);this.settle(room);if(!['preparing','playing'].includes(room.phase))return;}
    room.phase='playing';room.forceChooser=null;room.turnId=null;room.deadline=null;room.botAt=null;room.foggedId=null;room.forced=null;
    let remaining=room.players.length+room.players.reduce((n,p)=>n+(p.pending?.skip||0),0)+2;
    while(remaining-->0){
      room.turnQueue=(room.turnQueue||[]).filter(id=>this.eligible(room).some(p=>p.id===id));if(!room.turnQueue.length)this.fillCycle(room);
      const id=room.turnQueue.shift(),p=this.eligible(room).find(p=>p.id===id);if(!p)return;
      const protectedTurn=!!(p.pending.delay||p.pending.early||p.pending.zap);p.pending.delay=false;p.pending.early=false;p.pending.zap=false;if(protectedTurn)p.pending.skip=0;
      if(p.pending.skip&&!protectedTurn){p.pending.skip--;this.breakStreak(p);(room.completedTurns??=[]).push(p.id);this.log(room,p.name+': turn skipped.','skip',[],{playerId:p.id,targetId:p.id});continue;}
      p.effects={};if(p.pending.forcedDown){p.effects.multiplier=p.pending.forcedDown;p.effects.forcedDown=true;p.pending.forcedDown=null;this.log(room,p.name+' must play Quadruple Down this turn.','item',[],{targetId:p.id,feedback:'forced-down'});}p.turnProtected=protectedTurn;room.turnId=p.id;room.turnSerial++;const timerFactor=p.pending.halfTimer?BALANCE.zapTimerFactor:1;p.activeTimerFactor=timerFactor;p.pending.halfTimer=false;p.zapped=false;room.deadline=room.settings.timer?this.now()+room.settings.timer*1000*timerFactor:null;
      if(p.pending.fog){p.pending.fog--;room.foggedId=p.id;this.expansion.boardChanged(room,room.board.cells.filter(c=>c.revealed&&!c.mine&&c.number>0).length);this.log(room,p.name+"'s turn is fogged.",'item',[],{targetId:p.id,toneBy:{[p.id]:'negative'}});}
      this.log(room,p.name+"'s turn.",'turn',[],{playerId:p.id});if(p.bot)room.botAt=this.now()+1500;return;
    }
  }
  startRound(room){
    room.round++;room.roundReplay=null;room.boardEpoch=0;room.exposeAwards=new Set();room.cycleBase=null;room.cycle=0;room.completedTurns=[];room.cycleStartId=null;room.turnQueue=[];room.actionQueue=[];room.phase='draft';room.board=null;room.turnId=null;room.deadline=null;room.previewUntil=null;room.botAt=null;room.direction=1;room.pendingFog=0;room.foggedId=null;room.forced=null;room.forceChooser=null;room.endReason='';room.roundWinnerId=null;room.flagsScored=false;
    room.draftProfiles=rollProfiles(room.round,this.pick);
    for(const p of room.players){p.exposedFlags=[];p.paranoidAcquiredCycle=0;p.paranoidCycle=0;p.ghostActionUsed=false;p.eliminatedRound=null;p.spookedUntil=0;p.healthItemsEnabled=room.settings.lives!==0;p.privateFlags.clear();p.notes=[];p.effects={};p.roundStats=emptyStats();p.stats.streak=0;p.pending={skip:0,fog:0,delay:false};if(!p.inventory.some(c=>c.id==='plated_armor'&&!c.disabled))p.armor=0;p.mineShields=0;p.yellowBarriers=[];p.hiddenUntil=0;p.adaptiveBonus=0;p.damageContributors=new Set();p.eliminationAwarded=false;p.turnProtected=false;p.extraClears=0;p.poisons=[];p.poisonFog=false;p.curseUntil=0;for(const item of p.inventory){item.roundDisabled=false;this.expansion.resetCard(item,room);item.used=!!item.disabled;item.secretUsed=false;item.secretUses=0;item.echoSpent=false;if(item.id==='egg'&&!item.disabled&&room.round>(item.eggRound||1))item.eggRarity=item.eggRarity==='legendary'?'legendary':item.eggRarity==='rare'?'legendary':'rare';}if(p.spectator){p.draft=null;continue;}p.lives=room.settings.lives||1;p.draft=beginDraft(room.draftProfiles,this.pick,room.settings,p.inventory);this.advanceDraft(room,p);}
    this.log(room,`Round ${room.round}: choose 3 items.`,'draft');
    for(const p of room.players.filter(p=>p.bot&&!p.spectator))while(!p.draft.ready)this.chooseDraft(room,p,p.draft.offers[this.pick(p.draft.offers.length)].uid,false);
    this.maybeFinishDraft(room);
  }
  advanceDraft(room,p){
    while(!p.draft.ready&&!p.draft.offers.length){p.draft.choice++;if(p.draft.choice>=3)p.draft.ready=true;else p.draft.offers=drawOffers(p.draft,room.draftProfiles[p.draft.choice],this.pick);}
  }
  chooseDraft(room,p,uid,check=true){
    if(room.phase!=='draft'||p.spectator||!p.draft||p.draft.ready)fail('No draft choice is available.');
    const card=p.draft.offers.find(c=>c.uid===uid);if(!card)fail('Choose one of your current offers.');
    this.obtain(room,p,card.id,{uid:card.uid,activate:false});p.draft.owned=p.inventory.map(c=>c.id);p.draft.choice++;p.draft.offers=[];
    if(p.draft.choice>=3)p.draft.ready=true;else p.draft.offers=drawOffers(p.draft,room.draftProfiles[p.draft.choice],this.pick);
    this.advanceDraft(room,p);if(check)this.maybeFinishDraft(room);
  }
  maybeFinishDraft(room){if(room.phase!=='draft')return;const humans=room.players.filter(p=>p.connected&&!p.bot&&!p.spectator);if(humans.length&&humans.every(p=>p.draft?.ready))this.beginRound(room);}
  beginRound(room){
    room.baseConfig=roundConfig(room.round,room.settings.difficulty);room.board=createRoundBoard(room.baseConfig,this.pick);room.board.initialSafeCount=room.board.cells.filter(c=>!c.mine).length;this.roundTools.startReplay(room);room.multiplayerRound=room.players.filter(p=>!p.spectator).length>=2;
    room.previewUntil=room.settings.preview?this.now()+room.settings.preview*1000:null;room.phase=room.previewUntil?'preparing':'playing';
    for(const p of room.players)this.autoItems(room,p);this.expansion.beginRound(room);room.cycleBase=this.initialOrder(room);for(const p of room.players)if(p.inventory.some(c=>c.id==='queen'&&!c.disabled&&!c.roundDisabled)&&p.inventory.some(c=>c.id==='knight'&&!c.disabled&&!c.roundDisabled))p.extraClears=1;this.settle(room);
    this.log(room,'Round '+room.round+' ready.','round');if(room.phase==='playing')this.nextTurn(room,null);
  }
  finishRound(room,reason,winnerId=null){
    if(room.flagsScored)return;room.flagsScored=true;for(const p of room.players)for(const card of p.inventory)if(card.secretUsed){card.secretUsed=false;card.revealed=true;for(const stats of [p.stats,p.roundStats])stats.itemsUsed+=card.secretUses||1;this.log(room,p.name+' used '+ITEM_BY_ID.get(card.id).name+' this round.','item',[],{playerId:p.id,itemUid:card.uid});}room.roundWinnerId=winnerId;
    for(const p of room.players){if(p.spectator)continue;const correct=room.board.cells.filter(c=>c.mine&&c.flags.has(p.id)).length,points=this.gain(room,p,correct*SCORING.correctFlag).points;p.stats.flagPoints+=points;p.roundStats.flagPoints+=points;if(points)this.log(room,`${p.name}: ${correct} correct shared flags +${points}.`,'score');}
    room.phase=room.round>=room.settings.rounds?'finished':'round-end';room.endReason=reason;room.turnId=null;room.deadline=null;room.botAt=null;room.previewUntil=null;room.forced=null;room.forceChooser=null;room.foggedId=null;this.log(room,reason,'round');this.roundTools.capture(room);
  }
  checkRoundEnd(room){
    const alive=room.players.filter(p=>!p.spectator&&p.lives>0);
    if(room.board.generated&&!room.board.cells.some(c=>!c.mine&&!c.revealed)){this.finishRound(room,'Board cleared.');return true;}
    if(!alive.length){this.finishRound(room,'No lives remaining.');return true;}
    if(room.multiplayerRound&&alive.length===1){this.finishRound(room,`${alive[0].name} wins the round: last player alive.`,alive[0].id);return true;}return false;
  }
  blocked(p){return (p.curseUntil||0)>this.now();}
  multiplier(p){return this.expansion.glass(p)?2+(p.effects.multiplierAdd||0)+(p.effects.multiplier||0)+(p.effects.doubleDown?2:0):p.effects.multiplier||(p.effects.doubleDown?2:1); }
  obtain(room,p,id,{uid=randomUUID(),activate=true,duplicate=false}={}){
    if(!itemEnabled(id,room.settings))fail('This item is disabled by the lives setting.');
    if(!duplicate&&p.inventory.some(c=>c.id===id))fail('This player already owns '+ITEM_BY_ID.get(id).name+'.');
    if(id==='paranoid')p.paranoidAcquiredCycle=room.cycle||0;const item={uid,id,used:false,acquiredAt:this.now(),acquireSeq:++this.acquireSeq,...(id==='egg'?{eggRarity:'common',eggRound:room.round||1}:{})};this.expansion.resetCard(item,room);p.inventory.push(item);
    if(p.draft){p.draft.owned=p.inventory.map(c=>c.id);p.draft.offers=p.draft.offers.filter(c=>c.id!==id);}
    if(activate&&['preparing','playing'].includes(room.phase)){this.autoItems(room,p);this.expansion.obtained?.(room,p,item);}
    return item;
  }
  autoItems(room,p){
    if(p.spectator||p.lives<=0||this.blocked(p))return;
    for(const item of p.inventory)if(item.id==='extra_heart'&&!item.used&&!item.disabled&&itemEnabled(item.id,room.settings)){
      this.heal(room,p,1,'Extra Heart');this.spend(room,p,item);if(!item.used){this.heal(room,p,1,'Extra Heart');this.spend(room,p,item);}
    }
  }
  spend(room,p,item,{secret=false,quiet=false}={}){
    item.used=true;item.secretUsed=secret;if(secret)item.secretUses=(item.secretUses||0)+1;
    if(ITEM_BY_ID.get(item.id).permanent)item.disabled=true;
    if(!secret){item.revealed=true;for(const stats of [p.stats,p.roundStats])stats.itemsUsed++;if(!quiet)this.log(room,p.name+' used '+ITEM_BY_ID.get(item.id).name+'.','item',[],{playerId:p.id,itemUid:item.uid});}
    (room.actionQueue??=[]).push(p.id);
    if(item.echo&&!item.echoSpent&&!item.disabled&&!item.roundDisabled&&!this.blocked(p)){item.echoSpent=true;this.expansion.resetCard(item,room);item.used=false;(room.actionQueue??=[]).push(p.id);if(!secret)this.log(room,item.name||ITEM_BY_ID.get(item.id).name+' refreshed by Echo Shard.','item',[],{playerId:p.id});}
  }
  sourceOf(room,fallbackId){return room.effectSourceId||fallbackId||null;}
  negativeApplied(room,p,{sourceId=null,reason='effect'}={}){this.expansion.beforeNegative(room,p,{sourceId,reason});}
  heal(room,p,amount,reason='healing'){
    if(p.lives<=0||room.settings.lives===0)return 0;const before=p.lives;p.lives=Math.max(before,Math.min((room.settings.lives??3)+BALANCE.heartCapBonus,p.lives+amount));const gained=p.lives-before;
    if(gained)this.log(room,reason==='Grow'?p.name+' grew a heart.':p.name+' gained '+gained+' heart'+(gained===1?'':'s')+' ('+reason+').','heal',[],{playerId:p.id,targetId:p.id,heartsGained:gained});return gained;
  }
  gain(room,p,basePoints,{underdog=false,safe=false,itemMultiplier=1}={}){
    if(!p||basePoints<=0)return {points:0,comebackPoints:0};itemMultiplier*=this.expansion.adaptiveMultiplier(p);const comeback=this.comebackEnabled?(underdog?comebackMultiplier(room.players,p):safe?Math.min(BALANCE.safeComebackCap,comebackMultiplier(room.players,p)):1):1;
    const totalMultiplier=Math.min(BALANCE.totalAwardCap,itemMultiplier*comeback),withoutComeback=Math.round(basePoints*Math.min(BALANCE.totalAwardCap,itemMultiplier)),points=Math.round(basePoints*totalMultiplier),extra=Math.max(0,points-withoutComeback);p.score+=points;
    if(extra){for(const stats of [p.stats,p.roundStats])stats.comebackPoints=(stats.comebackPoints||0)+extra;this.log(room,p.name+': Underdog bonus +'+extra+'.','bonus',[],{playerId:p.id,comebackPoints:extra});}return {points,comebackPoints:extra,totalMultiplier};
  }
  award(room,p,basePoints,label,details={},options={}){if(!p||!basePoints)return;const {points,comebackPoints}=this.gain(room,p,basePoints,options);this.log(room,p.name+': '+label+' +'+points+'.','score',[],{playerId:p.id,basePoints,comebackPoints,...details});}
  disruption(room,actor,target,reason){
    if(!actor||!target||actor.id===target.id||target.spectator||target.lives<=0)return;const leaders=room.players.filter(o=>!o.spectator),top=Math.max(...leaders.map(o=>o.score)),bounty=target.score===top?BALANCE.leaderBounty:0;
    this.award(room,actor,BALANCE.disruptionPoints+bounty,'disruption'+(bounty?' + leader bounty':''),{targetId:target.id,reason},{underdog:true});
  }
  scoringView(room,p){const view=this.snapshot(room,p.id).board;view.knownSafe=[];for(let i=0;i<view.cells.length;i++){const c=view.cells[i];if(!c.revealed&&(c.marks||[]).some(m=>!m.stale&&(m.isMine===false||m.exact&&m.p===0)))view.knownSafe.push(i);}for(const n of p.notes)if(!n.stale&&!view.cells[n.index]?.revealed&&(n.isMine===false||n.exact&&n.p===0))view.knownSafe.push(n.index);return view;}
  damage(room,p,amount,{nonlethal=false,sourceId=null,reason='damage',lethalMine=false}={}){
    if(room.settings.lives===0||p.lives<=0||amount<=0)return 0;
    if(!this.blocked(p)&&this.expansion.consumeYellow(room,p))return 0;
    this.negativeApplied(room,p,{sourceId,reason});if(lethalMine)amount=Math.max(amount,p.lives+(p.armor||0));
    const absorbed=Math.min(p.armor||0,amount);p.armor=(p.armor||0)-absorbed;
    const lost=Math.min(Math.max(0,p.lives-(nonlethal?1:0)),amount-absorbed);p.lives-=lost;
    const source=sourceId&&sourceId!==p.id?room.players.find(o=>o.id===sourceId&&!o.spectator):null;
    if(lost){
      if(source){(p.damageContributors??=new Set()).add(source.id);for(const stats of [source.stats,source.roundStats])stats.heartsRemoved=(stats.heartsRemoved||0)+lost;this.award(room,source,lost*SCORE_BONUSES.heartDamage,'hearts removed',{targetId:p.id,toneBy:{[p.id]:'negative'}},{underdog:true});}
      this.expansion.afterDamage(room,p,{heartsLost:lost,sourceId,reason});
    }
    if(lost||absorbed)this.log(room,p.name+' lost '+(lost?lost+' heart'+(lost===1?'':'s'):'')+(absorbed?(lost?' and ':'')+absorbed+' armor':'')+'.','damage',[],{targetId:p.id,playerId:sourceId,reason,heartsLost:lost,armorLost:absorbed,toneBy:{[p.id]:'negative',...(source?{[source.id]:'positive'}:{})}});
    if(p.lives<=0&&!this.expansion.onLethal(room,p)&&!p.eliminationAwarded){
      p.eliminationAwarded=true;p.eliminatedRound=room.round;p.nextGhostAt=this.now()+2500;if(source){for(const stats of [source.stats,source.roundStats])stats.eliminations=(stats.eliminations||0)+1;this.award(room,source,SCORE_BONUSES.elimination,'elimination',{targetId:p.id},{underdog:true});}
      for(const id of p.damageContributors||[])if(id!==source?.id&&id!==p.id){const assist=room.players.find(o=>o.id===id);if(assist){for(const stats of [assist.stats,assist.roundStats])stats.assists=(stats.assists||0)+1;this.award(room,assist,SCORE_BONUSES.assist,'elimination assist',{targetId:p.id});}}
      this.log(room,p.name+' was eliminated.','damage',[],{targetId:p.id,playerId:sourceId});
    }
    return lost+absorbed;
  }
  addPoison(room,p,{fog=false,sourceId=null}={}){
    if(!p)return;this.negativeApplied(room,p,{sourceId,reason:'poison'});
    p.poisons??=[];const threshold=p.poisons.length?p.poisons.at(-1).threshold+1:3;
    p.poisons.push({actions:0,threshold,sourceId});if(fog)p.poisonFog=true;
    this.log(room,p.name+' is poisoned: '+threshold+' actions until the next hit.','item',[],{targetId:p.id});
  }
  settle(room){
    while(room.actionQueue?.length){
      const id=room.actionQueue.shift(),p=room.players.find(p=>p.id===id);if(!p||p.lives<=0||!['preparing','playing'].includes(room.phase))continue;
      this.expansion.afterAction(room,p);
      for(const effect of p.poisons||[]){
        effect.actions++;if(effect.actions<effect.threshold)continue;
        effect.actions=0;effect.threshold++;const dealt=this.damage(room,p,1,{sourceId:effect.sourceId,reason:'poison',nonlethal:true});if(p.poisonFog&&p.lives>0&&dealt>0)p.pending.fog++;
        this.log(room,p.name+': '+(dealt?'poison hit.':'poison caused no damage.')+' Next hit after '+effect.threshold+' actions.'+(p.poisonFog&&dealt>0?' Next turn fogged.':''),'poison',[],{playerId:effect.sourceId,targetId:p.id});
        if(p.lives<=0)break;
      }
    }
    if(room.board&&!room.board.openingPending&&!room.board.dangerZone){const safe=room.board.cells.filter(c=>!c.mine&&!c.revealed).length,total=room.board.initialSafeCount??room.board.cells.filter(c=>!c.mine).length;if(safe>0&&safe<=total*BALANCE.dangerFraction){room.board.dangerZone=true;this.log(room,'Danger zone! Unblocked mines cost +1 heart.','danger',[],{tone:'negative'});}}
    if(['preparing','playing'].includes(room.phase)&&room.board&&!this.checkRoundEnd(room)){
      if(room.board?.openingOwner&&!room.players.some(p=>p.id===room.board.openingOwner&&p.lives>0))delete room.board.openingOwner;const active=room.players.find(p=>p.id===room.turnId);if(active&&active.lives<=0)this.nextTurn(room,active.id);
    }
  }
  delayTurn(room,target,{sourceId=null,reason='delay'}={}){
    this.negativeApplied(room,target,{sourceId,reason});target.pending.delay=true;target.pending.early=false;target.pending.delayOrder=++room.eventId;
    if(room.turnQueue?.includes(target.id)){room.turnQueue=room.turnQueue.filter(id=>id!==target.id);room.turnQueue.push(target.id);}
    this.log(room,target.name+' will take their turn last.','item',[],{targetId:target.id,toneBy:{[target.id]:'negative'}});
  }
  zapTurn(room,target,{sourceId=null,reason='Zapped'}={}){
    this.negativeApplied(room,target,{sourceId,reason});target.zapped=true;
    if(room.settings.timer)target.pending.halfTimer=true;else if(!target.pending.delay&&!target.pending.early){target.pending.zap=true;const at=(room.turnQueue||[]).indexOf(target.id);if(at>=0&&at<room.turnQueue.length-1)[room.turnQueue[at],room.turnQueue[at+1]]=[room.turnQueue[at+1],room.turnQueue[at]];target.pending.zapAppliedCycle=room.cycle;}
    this.log(room,target.name+' was Zapped! '+(room.settings.timer?'Their next turn timer is halved.':'Their next turn moves back one place.'),'item',[],{playerId:sourceId,targetId:target.id,feedback:'zap',toneBy:{[target.id]:'negative'}});
  }
  earlyTurn(room,target){
    target.pending.zap=false;target.pending.early=true;target.pending.earlyOrder=++room.eventId;target.pending.delay=false;
    if(room.turnQueue?.includes(target.id)){room.turnQueue=room.turnQueue.filter(id=>id!==target.id);room.turnQueue.unshift(target.id);}
    this.log(room,target.name+' will take their turn early.','bonus',[],{targetId:target.id});
  }
  restoreTurnPosition(room,p){
    if(!room.turnQueue?.includes(p.id))return;
    let base=[...(room.cycleBase||room.players.map(o=>o.id))];if(room.direction===-1&&base.length>1)base=[base[0],...base.slice(1).reverse()];
    const waiting=new Set(room.turnQueue);room.turnQueue=this.orderQueue(room,base.filter(id=>waiting.has(id)));
  }
  breakStreak(p){p.stats.streak=0;p.roundStats.streak=0;}
  revealFor(room,p,index,{advance=true,forced=false,sourceId=null}={}){
    if(room.board.openingPending&&room.board.openingOwner&&room.board.openingOwner!==p.id)fail('The Reset player has the first clear.');
    const first=room.board.openingPending===true,classification=first?{tier:'opening',points:0,p:0,exact:true}:classify(this.scoringView(room,p),index),opened=[];
    if(first){const block=safeOpening(room.board,index,this.pick);for(const i of block)opened.push(...reveal(room.board,i));for(const c of room.board.cells)for(const mark of c.publicMarks||[])if(mark.kind==='scan')mark.isMine=c.mine;for(const player of room.players)for(const note of player.notes)note.stale=true;}
    else opened.push(...reveal(room.board,index));if(!opened.length)return;
    const cell=room.board.cells[index],clearEvent=(room.clearEvent||0)+1;room.clearEvent=clearEvent;
    for(const i of opened){const c=room.board.cells[i];c.flags.clear();c.clearedBy=p.id;c.clearColor=p.color;c.clearEvent=clearEvent;c.clearAt=this.now();c.cascadeDepth=i===index?0:Math.max(Math.abs(i%room.board.width-index%room.board.width),Math.abs(Math.floor(i/room.board.width)-Math.floor(index/room.board.width)));for(const player of room.players)player.privateFlags.delete(i);}
    let points=0;
    if(cell.mine){
      this.breakStreak(p);for(const stats of [p.stats,p.roundStats])stats.minesHit++;
      const yellow=!this.blocked(p)&&this.expansion.consumeYellow(room,p),shield=yellow||room.settings.lives===0||this.blocked(p)?null:p.inventory.find(i=>i.id==='shield'&&!i.used&&!i.disabled&&!i.roundDisabled),charge=!yellow&&!shield&&room.settings.lives!==0&&!this.blocked(p)&&(p.mineShields||0)>0,damage=room.settings.lives===0||yellow||shield||charge?0:this.multiplier(p)+(room.board.dangerZone?BALANCE.dangerMineBonus:0);
      if(shield)this.spend(room,p,shield);else if(charge){p.mineShields--; (room.actionQueue??=[]).push(p.id);}this.damage(room,p,damage,{sourceId:cell.mineOwner||sourceId,reason:'mine',lethalMine:this.expansion.glass(p)});
      this.log(room,p.name+' hit a mine'+(yellow?' — yellow barrier blocked it':shield||charge?' — Mine Shield blocked it':'')+'.','mine',opened,{damage,playerId:p.id,targetId:p.id,forced,tone:yellow||shield||charge?'positive':'negative'});
    }else{
      const cascade=(opened.length-1)*SCORING.cascade,last=first||room.board.cells.some(c=>!c.mine&&!c.revealed)?0:SCORING.lastSafe,bonus=this.expansion.beforeScore(room,p,index,{first,forced,basePoints:classification.points}),multiplier=this.multiplier(p)*(bonus?.multiplier||1),base=first?SCORE_BONUSES.firstClear:classification.points;
      const denied=forced&&sourceId&&sourceId!==p.id,underdog=!first&&(classification.tier==='guess'||this.multiplier(p)>1&&!this.expansion.glass(p)||p.effects.multiplier||p.effects.multiplierAdd||p.effects.forcedDown);
      const result=this.gain(room,p,denied?0:base+(bonus?.additive||0)+cascade+last,{safe:!underdog,underdog:!!underdog,itemMultiplier:multiplier});points=result.points;const appliedMultiplier=result.totalMultiplier||0;
      const leader=Math.max(...room.players.filter(o=>!o.spectator&&o.id!==p.id).map(o=>o.score),p.score-points),hailMary=!denied&&classification.guessKind==='forced'&&classification.p>=BALANCE.hailMaryRisk&&p.score-points<leader;if(hailMary)this.log(room,p.name+': HAIL MARY! +'+points+'.','bonus',opened,{playerId:p.id,hailMary:true,points});
      for(const stats of [p.stats,p.roundStats]){stats.safeCells+=opened.length;if(!first){stats.streak++;stats.maxStreak=Math.max(stats.maxStreak,stats.streak);}if(classification.tier==='guess'&&(stats.bravestGuess===null||classification.p>stats.bravestGuess))stats.bravestGuess=classification.p;}
      this.log(room,p.name+': '+(first?'first clear':{obvious:'clear',pattern:'pattern',deep:'deep',guess:'guess'}[classification.tier])+' +'+points+(cascade?' (cascade +'+cascade+')':'')+(appliedMultiplier>1?' ×'+Math.round(appliedMultiplier*100)/100:'')+'.','reveal',opened,{tier:classification.tier,probability:classification.p,guessKind:classification.guessKind,exact:classification.exact,basePoints:classification.points,points,cascadePoints:cascade,lastSafePoints:last,multiplier:appliedMultiplier,itemMultiplier:multiplier,playerId:p.id,forced,tone:first||cascade||multiplier>1||bonus?.additive?'positive':'neutral'});
    }
    this.expansion.afterReveal(room,p,index,{first,forced,basePoints:cell.mine?0:classification.points,opened,points});this.staleRisks(room);(room.actionQueue??=[]).push(p.id);this.settle(room);
    if(!['preparing','playing'].includes(room.phase))return;
    if(advance&&room.turnId===p.id){if(p.extraClears>0){p.extraClears--;this.log(room,p.name+' may clear one more cell.','bonus',[],{playerId:p.id});}else this.nextTurn(room,p.id);}
  }
  staleRisks(room){for(const c of room.board.cells)for(const m of c.publicMarks||[])if(m.kind==='risk_scanner')m.stale=true;for(const player of room.players)for(const note of player.notes)if(['risk_scanner','postulate'].includes(note.kind))note.stale=true;}
  protectedTarget(room,target,actor,kind){
    if(!target)return true;
    if(actor?.id!==target.id&&(target.hiddenUntil||0)>this.now()){this.log(room,target.name+' cannot be targeted right now.','item',[],{targetId:target.id});return true;}
    if(!this.blocked(target)&&this.expansion.consumeYellow(room,target)){this.log(room,target.name+' blocked '+kind+' with a yellow barrier.','bonus',[],{targetId:target.id});return true;}return false;
  }
  redirect(room,target,actor=null,kind='item'){
    room.effectSourceId=actor?.id||null;if(this.protectedTarget(room,target,actor,kind))return null;
    const card=this.blocked(target)?null:target.inventory.find(i=>i.id==='ricochet'&&!i.used&&!i.disabled&&!i.roundDisabled),others=this.eligible(room).filter(p=>p.id!==target.id);
    if(!card||!others.length)return target;
    this.spend(room,target,card);const redirected=others[this.pick(others.length)];room.effectSourceId=target.id;
    this.log(room,target.name+' redirected the item to '+redirected.name+'.','item',[],{playerId:target.id,targetId:redirected.id});return this.protectedTarget(room,redirected,target,kind)?null:redirected;
  }
  debugGrant(room,p,id){
    if(!room.settings.debug||room.hostId!==p.id)fail('Only the host can grant items in Debug mode.');
    if(p.spectator)fail('Spectators cannot obtain items.');
    this.obtain(room,p,id);if(room.phase==='draft'){this.advanceDraft(room,p);this.maybeFinishDraft(room);}this.settle(room);
    this.log(room,p.name+' obtained a debug item.','debug',[],{playerId:p.id});
  }
  useItem(room,p,uid,index,playerId,targetUid){
    if(!['preparing','playing'].includes(room.phase)||p.spectator||p.lives<=0&&!isGhost(room,p))fail('Items are available to participants during an active round.');
    if(this.blocked(p))fail('Curse has locked your items.');
    const item=p.inventory.find(i=>i.uid===uid);if(!item)fail('Item not owned.');if(item.disabled)fail('This item is permanently disabled.');if(item.roundDisabled)fail('This item is disabled for this round.');if(item.used)fail('This item was already used this round.');const def=ITEM_BY_ID.get(item.id);
    if(!itemEnabled(item.id,room.settings))fail('This item is disabled by the lives setting.');
    if(def.when==='passive')fail(def.name+' activates automatically.');
    if(def.when==='your-turn'&&(room.phase!=='playing'||room.turnId!==p.id))fail('Use this item on your turn.');
    if(def.afterFirstClear&&room.board.openingPending)fail('Use this item after the first clear.');
    if(['reset','spin'].includes(def.id)){this.spend(room,p,item);this.roundTools[def.id==='reset'?'reset':'spin'](room,p);if(def.id==='reset')room.board.openingOwner=p.id;this.settle(room);return;}
    if(this.expansion.use(room,p,item,index,playerId,targetUid)){this.settle(room);return;}
    if(['double_down','triple_down','quadruple_down'].includes(def.id)&&((!this.expansion.glass(p)&&this.multiplier(p)>1)||room.board.openingPending))fail('Down needs a scored reveal; it cannot stack.');
    let target=null;
    if(['player','player-cell'].includes(def.target)){target=room.players.find(other=>other.id===playerId&&other.connected&&!other.spectator&&other.lives>0);if(!target)fail('Choose a living player, including yourself.');if(target.id!==p.id&&target.hiddenUntil>this.now())fail('This player cannot be targeted right now.');if(def.id==='skip'&&(p.turnProtected||target.turnProtected||target.pending.delay||target.pending.early||target.pending.zap))fail('A moved turn cannot be skipped.');}
    if(['hidden','flag','player-cell'].includes(def.target)){
      this.validateCell(room,index);const cell=room.board.cells[index];if(cell.revealed)fail('Choose a hidden cell.');
      if(def.target==='flag'&&!cell.flags.size&&!p.privateFlags.has(index)&&!p.exposedFlags?.some(f=>f.index===index))fail('Choose a flagged cell visible to you.');
      if(['plant_mine','silent_mine'].includes(def.id)&&!cell.mine&&room.board.openingPending&&room.board.cells.filter(c=>!c.mine).length<=4)fail('Leave room for the safe 2 × 2 opening.');
    }
    if(def.id==='trip'){target=this.findNext(room,room.turnId);if(!target)fail('No living target is available.');}
    if(def.id==='trip'&&!room.board.cells.some(c=>!c.revealed))fail('No hidden cells remain.');
    let linked=null,reward=null;const refreshable=p.inventory.filter(c=>c.used&&!c.disabled&&!c.roundDisabled&&c.uid!==item.uid);
    if(def.id==='echo_shard'){linked=p.inventory.find(c=>c.uid===targetUid);if(!linked||linked.uid===item.uid||linked.disabled||linked.roundDisabled||!itemEnabled(linked.id,room.settings)||ITEM_BY_ID.get(linked.id).permanent||linked.echo)fail('Choose an eligible card without a permanent-use limit or existing Echo link.');}
    if(def.id==='egg'){const pool=lootPool(p.inventory,item.eggRarity||'common',room.settings);if(!pool.length)fail('You own every enabled item of this egg’s rarity. Keep it for a later round.');reward=pool[this.pick(pool.length)].id;}
    if(def.id==='jest'&&(target.id===p.id||target.pending.forcedDown))fail('Choose another player without a pending forced Down.');
    if(['trip','force_hand'].includes(def.id)&&room.board.openingPending&&room.board.openingOwner&&target.id!==room.board.openingOwner)fail('The Reset player has the first clear.');
    this.spend(room,p,item,{secret:def.id==='silent_mine'||['plant_mine','scatter','scatter_2x'].includes(def.id)&&this.expansion.has(p,'silent_mine')});
    room.effectSourceId=p.id;if(['skip','trip','force_hand','hit','dagger','delay','poison','curse','jest'].includes(def.id)){target=this.redirect(room,target,p,def.name);if(!target){this.settle(room);return;}}
    if(['scan','risk_scanner'].includes(def.id)){
      const cell=room.board.cells[index],risk=def.id==='risk_scanner'?mineProbability(this.scoringView(room,p),index):null;const preview=risk?(room.board.openingPending?{points:SCORE_BONUSES.firstClear,tier:'opening'}:classify(this.scoringView(room,p),index)):null;if(preview)p.notes.unshift({id:randomUUID(),round:room.round,index,kind:'postulate',name:'Risk Scanner points',points:preview.points,tier:preview.tier,stale:false});
      const mark={kind:def.id,name:def.name,by:p.id,...(risk?{p:risk.p,exact:risk.exact}:{isMine:cell.mine}),stale:false};
      cell.publicMarks=(cell.publicMarks||[]).filter(m=>m.kind!==def.id);cell.publicMarks.push(mark);
      this.log(room,p.name+': '+def.name+' at row '+(Math.floor(index/room.board.width)+1)+', column '+(index%room.board.width+1)+' — '+(risk?Math.round(risk.p*100)+'% counted mine risk':cell.mine?'mine':'safe')+'.','item',[index],{playerId:p.id});
    }else if(['truth_check','postulate'].includes(def.id)){
      const score=def.id==='postulate'?(room.board.openingPending?{points:0,tier:'opening'}:classify(publicBoard(room.board,room.players),index)):null;
      p.notes.unshift({id:randomUUID(),round:room.round,index,kind:def.id,name:def.name,...(score?{points:score.points*this.multiplier(p),tier:score.tier}:{isMine:room.board.cells[index].mine}),stale:false});p.notes=p.notes.slice(0,50);
    }else if(def.id==='reverse'){room.direction*=-1;room.turnQueue=this.orderQueue(room,room.turnQueue,{reverse:true});}
    else if(def.id==='fog'){for(const other of this.eligible(room).filter(o=>o.id!==p.id)){const victim=this.redirect(room,other,p,'Fog');if(victim){this.negativeApplied(room,victim,{sourceId:this.sourceOf(room,p.id),reason:'fog'});victim.pending.fog++;if(victim.id===other.id&&room.effectSourceId===p.id)this.disruption(room,p,victim,'Fog');this.log(room,victim.name+"'s next turn will be fogged.",'item',[],{playerId:p.id,targetId:victim.id});}}}
    else if(def.id==='skip'){
      this.log(room,target.name+': '+(room.turnId===target.id?'active turn ended by Skip.':'next turn will be skipped.'),'item',[],{playerId:p.id,targetId:target.id});
      this.negativeApplied(room,target,{sourceId:this.sourceOf(room,p.id),reason:'skip'});if(room.turnId===target.id&&!target.turnProtected){this.breakStreak(target);this.nextTurn(room,target.id);}else target.pending.skip++;if(room.effectSourceId===p.id)this.disruption(room,p,target,'Skip');
    }else if(['double_down','triple_down','quadruple_down'].includes(def.id)){const factor={double_down:2,triple_down:3,quadruple_down:4}[def.id];if(this.expansion.glass(p))p.effects.multiplierAdd=(p.effects.multiplierAdd||0)+factor;else p.effects.multiplier=factor;}
    else if(['trip','force_hand'].includes(def.id)){
      if(def.id==='trip'){const hidden=room.board.cells.flatMap((c,i)=>!c.revealed?[i]:[]);index=hidden[this.pick(hidden.length)];}
      this.log(room,target.name+' must make an extra reveal ('+def.name+').','item',[index],{playerId:p.id,targetId:target.id});
      const source=this.sourceOf(room,p.id);this.revealFor(room,target,index,{advance:false,forced:true,sourceId:source});if(source===p.id)this.disruption(room,p,target,def.name);
    }else if(['plant_mine','silent_mine'].includes(def.id)){
      const cell=room.board.cells[index],added=!cell.mine;if(added){
        cell.mine=true;cell.silent=def.id==='silent_mine'||this.expansion.has(p,'silent_mine');cell.mineOwner=p.id;this.expansion.boardChanged(room,1);
        if(!cell.silent){room.board.mines++;for(const i of neighbors(index,room.board.width,room.board.height))room.board.cells[i].number++;this.staleRisks(room);}
        if(!cell.silent){cell.publicMarks=(cell.publicMarks||[]).filter(m=>m.kind!=='scan');for(const player of room.players)for(const note of player.notes)if(note.index===index)note.stale=true;}
      }
      p.notes.unshift({id:randomUUID(),round:room.round,index,kind:def.id,name:def.name,added,stale:false});
    }else if(def.id==='expose'){
      let wrong=0;p.exposedFlags=[];room.exposeAwards??=new Set();room.board.cells.forEach((cell,index)=>{if(cell.revealed)return;const shared=[...cell.flags],privateOwners=room.players.filter(o=>o.privateFlags.has(index));if(!shared.length&&!privateOwners.length)return;p.exposedFlags.push({index,sharedColors:shared.map(id=>room.players.find(o=>o.id===id)?.color).filter(Boolean),privateColors:privateOwners.map(o=>o.color)});p.notes.unshift({id:randomUUID(),round:room.round,index,kind:'expose',name:'Expose',isMine:cell.mine,stale:false});if(!cell.mine)for(const key of [...shared.map(id=>'shared:'+id),...privateOwners.map(o=>'private:'+o.id)]){const token=p.id+':'+(room.boardEpoch||0)+':'+index+':'+key;if(!room.exposeAwards.has(token)){room.exposeAwards.add(token);wrong++;}}});
      if(wrong)this.award(room,p,wrong*BALANCE.wrongFlagPoints,'wrong flags exposed');this.log(room,'Exposed! '+p.name+' privately inspected all flags.','item',[],{playerId:p.id,feedback:'exposed'});
    }else if(['hit','dagger'].includes(def.id)){
      this.damage(room,target,1,{nonlethal:def.id==='hit',sourceId:this.sourceOf(room,p.id),reason:def.name});this.log(room,target.name+' was hit by '+def.name+'.','damage',[],{playerId:p.id,targetId:target.id});
    }else if(def.id==='scythe'){
      let reflected=null;for(const other of this.eligible(room).filter(o=>o.id!==p.id)){
        if(this.protectedTarget(room,other,p,'Scythe'))continue;const rico=this.blocked(other)?null:other.inventory.find(c=>c.id==='ricochet'&&!c.used&&!c.disabled&&!c.roundDisabled);
        if(rico){this.spend(room,other,rico);reflected??=other.id;this.log(room,other.name+' reflected Scythe back to '+p.name+'.','item',[],{playerId:other.id});}
        else this.damage(room,other,1,{nonlethal:true,sourceId:p.id,reason:'Scythe'});
      }
      if(reflected&&!this.protectedTarget(room,p,room.players.find(o=>o.id===reflected),'Scythe'))this.damage(room,p,1,{nonlethal:true,sourceId:reflected,reason:'reflected Scythe'});
    }else if(def.id==='jest'){target.pending.forcedDown=4;this.negativeApplied(room,target,{sourceId:this.sourceOf(room,p.id),reason:'Jest'});this.log(room,target.name+' must use Quadruple Down on their next turn.','item',[],{playerId:p.id,targetId:target.id,feedback:'forced-down'});if(room.effectSourceId===p.id)this.disruption(room,p,target,'Jest');}
    else if(def.id==='delay'){const source=this.sourceOf(room,p.id);this.delayTurn(room,target,{sourceId:source});if(source===p.id)this.disruption(room,p,target,'Delay');}
    else if(def.id==='double_mine_shield')p.mineShields=(p.mineShields||0)+2;
    else if(def.id==='double_hearts')this.heal(room,p,2,'Double Hearts');
    else if(def.id==='plated_armor'){p.armor=(p.armor||0)+3;this.log(room,p.name+' gained 3 armor.','heal',[],{playerId:p.id});}
    else if(def.id==='echo_shard'){linked.echo=true;linked.echoSpent=false;this.log(room,p.name+' linked Echo Shard to '+ITEM_BY_ID.get(linked.id).name+'.','item',[],{playerId:p.id});}
    else if(def.id==='refresher'){for(const card of refreshable){this.expansion.resetCard(card,room);card.used=false;}this.autoItems(room,p);}
    else if(def.id==='egg'){this.obtain(room,p,reward);this.log(room,p.name+' opened '+(item.eggRarity||'common')+' Egg and received '+ITEM_BY_ID.get(reward).name+'.','item',[],{playerId:p.id});}
    else if(def.id==='poison')this.addPoison(room,target,{sourceId:this.sourceOf(room,p.id)});
    else if(def.id==='noxious_cloud')for(const other of this.eligible(room).filter(o=>o.id!==p.id)){const victim=this.redirect(room,other,p,def.name);if(victim)this.addPoison(room,victim,{fog:true,sourceId:this.sourceOf(room,p.id)});}
    else if(def.id==='curse'){
      this.negativeApplied(room,target,{sourceId:this.sourceOf(room,p.id),reason:'curse'});if(!target.turnProtected&&!target.pending.delay&&!target.pending.early&&!target.pending.zap)target.pending.skip++;target.curseUntil=Math.max(target.curseUntil||0,this.now()+5000+(room.settings.timer>10?room.settings.timer*100:0));
      if(room.effectSourceId===p.id)this.disruption(room,p,target,'Curse');this.log(room,target.name+' is cursed: next turn skipped; items locked.','item',[],{playerId:p.id,targetId:target.id});
    }
    this.settle(room);
  }
  action(code,playerId,socketId,input={}){
    const room=this.rooms.get(code);if(!room)fail('Room expired. Create a new room.');const p=room.players.find(p=>p.id===playerId&&p.socketId===socketId&&p.connected);if(!p)fail('Reconnect to play.');
    if(['settings','bot','bot-difficulty','start','next','again','kick'].includes(input.type)&&room.hostId!==playerId)fail('Only the host can do that.');
    if(['reveal','use-item','force-target'].includes(input.type)&&['playing','targeting'].includes(room.phase)&&room.deadline!==null&&this.now()>=room.deadline){this.timeout(room);this.broadcast(room);fail('Time ran out. The turn was skipped.');}
    switch(input.type){
      case 'settings':{if(room.phase!=='lobby')fail('Change settings in the lobby.');const preview=input.preview??room.settings.preview;if(![3,5].includes(input.rounds)||!TIMERS.includes(input.timer)||!PREVIEWS.includes(preview))fail('Choose a valid setting.');const lives=input.lives??room.settings.lives,debug=input.debug??room.settings.debug;if(!Number.isInteger(lives)||lives<0||lives>10||typeof debug!=='boolean')fail('Choose valid lives and Debug settings.');const difficulty=input.difficulty??room.settings.difficulty??'normal';if(!Object.hasOwn(BOARD_DIFFICULTIES,difficulty))fail('Choose a valid board difficulty.');const itemPool=input.itemPool??room.settings.itemPool??'party';if(!['party','all'].includes(itemPool))fail('Choose Party or All items.');room.settings={rounds:input.rounds,timer:input.timer,preview,lives,debug,difficulty,itemPool};for(const person of room.players)person.healthItemsEnabled=lives!==0;break;}
      case 'color':if(room.phase!=='lobby')fail('Change color in the lobby.');if(!COLORS.includes(input.color))fail('Choose a valid color.');if(!Number.isInteger(input.shade??50)||(input.shade??50)<0||(input.shade??50)>100)fail('Choose a valid shade.');this.assignColor(room,p,input.color,input.shade??50);break;
      case 'bot':{if(room.phase!=='lobby')fail('Change bots in the lobby.');if(room.players.filter(p=>p.bot).length>=4)fail('All four bots are already added.');if(room.players.filter(p=>!p.spectator).length>=MAX_PLAYERS)fail('Room full.');const name=BOT_NAMES.find(name=>!room.players.some(p=>p.name===name)),index=BOT_NAMES.indexOf(name),base=COLORS[(index+1)%COLORS.length],bot={...this.makePlayer({name,baseColor:base,shade:50,color:base},null),bot:true,botDifficulty:'normal'};room.players.push(bot);this.assignColor(room,bot,base,50);break;}
      case 'bot-difficulty':{if(room.phase!=='lobby')fail('Change bot difficulty in the lobby.');const target=room.players.find(o=>o.id===input.playerId&&o.bot);if(!target||!BOT_LEVELS.includes(input.difficulty))fail('Choose a bot and valid difficulty.');target.botDifficulty=input.difficulty;break;}
      case 'kick':{const target=room.players.find(p=>p.id===input.playerId);if(!target||target.id===p.id)fail('Choose another player.');const wasTurn=room.turnId===target.id,after=room.players[(room.players.indexOf(target)+room.players.length-room.direction)%room.players.length]?.id;room.players=room.players.filter(p=>p.id!==target.id);for(const c of room.board?.cells||[])c.flags.delete(target.id);this.evict(target.socketId,'The host removed you from the room.');this.log(room,`${target.name} was removed.`,'room');if(['playing','targeting','preparing'].includes(room.phase)&&!this.checkRoundEnd(room)&&wasTurn)this.nextTurn(room,after);this.maybeFinishDraft(room);break;}
      case 'start':if(room.phase!=='lobby')fail('Game already started.');this.startRound(room);break;
      case 'next':if(room.phase!=='round-end')fail('Finish the round first.');this.startRound(room);break;
      case 'again':if(room.phase!=='finished')fail('Finish the game first.');room.phase='lobby';room.round=0;room.board=null;room.players=room.players.filter(p=>p.connected).slice(0,MAX_PLAYERS);for(const player of room.players){player.spectator=false;player.score=0;player.lives=room.settings.lives||1;player.pending={skip:0,fog:0,delay:false};player.armor=0;player.mineShields=0;player.poisons=[];player.poisonFog=false;player.curseUntil=0;player.stats=emptyStats();player.roundStats=emptyStats();player.privateFlags.clear();player.inventory=[];player.notes=[];player.draft=null;player.effects={};}this.assignHost(room);room.endReason='';room.roundWinnerId=null;this.log(room,'New game.','room');break;
      case 'draft-pick':this.chooseDraft(room,p,input.uid);break;
      case 'draft-reroll':if(room.phase!=='draft'||p.spectator||!p.draft||p.draft.ready)fail('No draft choice is available.');if(p.draft.rerollsLeft<=0)fail('No rerolls left for this draft.');p.draft.rerollsLeft--;p.draft.offers=drawOffers(p.draft,room.draftProfiles[p.draft.choice],this.pick);this.advanceDraft(room,p);this.maybeFinishDraft(room);break;
      case 'ghost-action':haunt(this,room,p,input);break;
      case 'use-item':this.useItem(room,p,input.uid,input.index,input.playerId,input.targetUid);break;
      case 'debug-grant':this.debugGrant(room,p,input.itemId);break;
      case 'flag':{if(!['playing','preparing','targeting'].includes(room.phase)||p.spectator||p.lives<=0)fail('Flags are available while you are playing.');this.validateCell(room,input.index);const cell=room.board.cells[input.index];if(cell.revealed)fail('Cell already open.');if(!['shared','private'].includes(input.visibility))fail('Choose shared or private flags.');const flags=input.visibility==='private'?p.privateFlags:cell.flags,key=input.visibility==='private'?input.index:p.id;if(input.visibility==='shared'&&!flags.has(key)){const count=room.board.cells.filter(c=>!c.revealed&&c.flags.has(p.id)).length,limit=room.board.mines-room.board.cells.filter(c=>c.revealed&&c.mine).length;if(count>=limit)fail(`Shared flag limit: ${limit}. Remove one or use a private flag.`);}if(flags.has(key))flags.delete(key);else flags.add(key);if(input.visibility==='private'){this.sendPrivate(room,p);return room;}break;}
      case 'reveal':if(room.phase!=='playing'||p.spectator||p.lives<=0||room.turnId!==p.id)fail('Wait for your turn.');this.validateCell(room,input.index);if(room.board.cells[input.index].revealed)fail('Cell already open.');this.revealFor(room,p,input.index);break;
      default:fail('Unknown action.');
    }
    this.broadcast(room);return room;
  }
  validateCell(room,index){if(!room.board||!Number.isInteger(index)||index<0||index>=room.board.cells.length)fail('Choose a cell on the board.');}
  timeout(room){const p=room.players.find(p=>p.id===room.turnId);if(p){for(const s of [p.stats,p.roundStats])s.timeouts++;this.breakStreak(p);this.log(room,`${p.name}: time out. Turn skipped +0.`,'timeout');this.nextTurn(room,p.id);}}
  botTurn(room,p){this.botBrain.turn(room,p);}
  tick(){
    const now=this.now();for(const [code,room]of this.rooms){
      if(room.emptySince!==null&&now-room.emptySince>=300000){this.rooms.delete(code);continue;}
      if(['preparing','playing'].includes(room.phase)){let changed=false;for(const p of room.players)if(p.curseUntil&&now>=p.curseUntil){p.curseUntil=0;this.autoItems(room,p);changed=true;}if(changed){this.settle(room);this.broadcast(room);}}
      if(['preparing','playing'].includes(room.phase)){const before=room.eventId,changed=this.expansion.tick(room);if(changed||room.eventId!==before){this.settle(room);this.broadcast(room);}}
      if(room.phase==='preparing'&&now>=room.previewUntil&&room.players.some(p=>p.connected&&!p.bot)){room.previewUntil=null;this.nextTurn(room,null);this.broadcast(room);}
      if(room.phase==='playing')for(const ghost of room.players.filter(p=>p.bot&&isGhost(room,p)&&now>=(p.nextGhostAt||0))){ghost.nextGhostAt=now+4000;const before=room.eventId;this.botBrain.ghostTurn(room,ghost);if(room.eventId!==before){this.settle(room);this.broadcast(room);}}
      if(!['playing','targeting'].includes(room.phase)||!room.turnId)continue;
      if(room.deadline!==null&&now>=room.deadline){this.timeout(room);this.broadcast(room);}
      else if(room.botAt!==null&&now>=room.botAt){const p=room.players.find(p=>p.id===room.turnId);this.botTurn(room,p);this.broadcast(room);}
    }
  }
}



