import { createRoundBoard } from './board.js';
import {BALANCE} from './balance.js';

export const BOARD_DIFFICULTIES=Object.freeze({
  easy:[{width:6,height:6,mines:5},{width:8,height:8,mines:9},{width:10,height:10,mines:15},{width:12,height:12,mines:23},{width:14,height:14,mines:32}],
  normal:[{width:8,height:8,mines:10},{width:10,height:10,mines:18},{width:12,height:12,mines:28},{width:14,height:14,mines:38},{width:16,height:16,mines:50}],
  hard:[{width:10,height:10,mines:22},{width:12,height:12,mines:34},{width:14,height:14,mines:48},{width:16,height:16,mines:64},{width:18,height:18,mines:82}],
  extreme:[{width:12,height:12,mines:40},{width:14,height:14,mines:58},{width:16,height:16,mines:80},{width:18,height:18,mines:104},{width:20,height:20,mines:132}],
});
export const roundConfig=(round,difficulty='normal')=>({...BOARD_DIFFICULTIES[difficulty in BOARD_DIFFICULTIES?difficulty:'normal'][Math.max(0,Math.min(4,round-1))]});
export function comebackMultiplier(players,p){const leader=Math.max(0,...players.filter(o=>!o.spectator).map(o=>o.score)),gap=Math.max(0,leader-p.score);return Math.min(BALANCE.underdogCap,Math.exp(BALANCE.comebackExponent*gap/Math.max(BALANCE.comebackFloor,leader)));}
export function shuffled(list,pick){const result=[...list];for(let i=result.length-1;i>0;i--){const j=pick(i+1);[result[i],result[j]]=[result[j],result[i]];}return result;}

export class RoundTools{
  constructor(service){this.service=service;}
  reset(room,p){
    room.board=createRoundBoard(room.baseConfig||roundConfig(room.round,room.settings.difficulty),this.service.pick);room.board.initialSafeCount=room.board.cells.filter(c=>!c.mine).length;room.boardEpoch=(room.boardEpoch||0)+1;room.exposeAwards=new Set();room.duels=[];room.foggedId=null;room.previewUntil=null;
    for(const other of room.players){
      if(other.spectator)continue;if(other.lives<=0)other.lives=room.settings.lives===0?1:3;
      other.exposedFlags=[];other.eliminatedRound=null;other.spookedUntil=0;other.armor=0;other.mineShields=0;other.yellowBarriers=[];other.hiddenUntil=0;other.hiddenBarrierOnEnd=false;other.poisons=[];other.poisonFog=false;other.curseUntil=0;other.pending={skip:0,fog:0,delay:false,zap:false};other.zapped=false;other.adaptiveBonus=0;other.extraClears=0;other.effects={};other.privateFlags.clear();other.notes=[];other.damageContributors=new Set();other.eliminationAwarded=false;other.turnProtected=false;
      other.expansionCounters={reactive:0,adaptive:0,paranoid:0,grow:0,galvanize:0,batteries:0};
      for(const card of other.inventory){card.chessAnchor=null;card.chessTurn=null;}
    }
    this.service.log(room,p.name+' reset the board. Eliminated players return with 3 hearts.','item',[],{playerId:p.id});this.randomizeTurns(room,p.id);
  }
  randomizeTurns(room,firstId=null){
    const previous=room.players.find(p=>p.id===room.turnId);if(previous){this.service.expansion.afterTurn(room,previous);previous.effects={};previous.turnProtected=false;previous.extraClears=0;}
    const ids=shuffled(this.service.eligible(room).map(p=>p.id),this.service.pick);if(firstId&&ids.includes(firstId)){ids.splice(ids.indexOf(firstId),1);ids.unshift(firstId);}
    room.cycleBase=[...ids];room.turnQueue=[...ids];room.completedTurns=[];room.direction=1;room.cycle=(room.cycle||0)+1;room.turnId=null;room.deadline=null;room.botAt=null;this.service.nextTurn(room,null);
  }
  spin(room,p){
    const rotations=1+this.service.pick(3),clockwise=this.service.pick(2)===0,turns=clockwise?rotations:(4-rotations)%4;
    let map=Array.from({length:room.board.cells.length},(_,i)=>i);
    for(let turn=0;turn<turns;turn++){
      const {width,height,cells}=room.board,next=Array(cells.length),transform=i=>(i%width)*height+height-1-Math.floor(i/width);
      for(let i=0;i<cells.length;i++)next[transform(i)]=cells[i];map=map.map(transform);room.board.cells=next;room.board.width=height;room.board.height=width;
    }
    if(Number.isInteger(room.board.opening))room.board.opening=map[room.board.opening];
    for(const player of room.players){player.privateFlags=new Set([...player.privateFlags].map(i=>map[i]));for(const note of player.notes)note.index=map[note.index];for(const flag of player.exposedFlags||[])flag.index=map[flag.index];for(const item of player.inventory)if(Number.isInteger(item.chessAnchor))item.chessAnchor=map[item.chessAnchor];}
    this.service.log(room,p.name+' rotated the board '+rotations*90+'° '+(clockwise?'clockwise':'counterclockwise')+' and shuffled the turn order.','item',[],{playerId:p.id});this.randomizeTurns(room);
    return map;
  }
  replayBoard(room){return {width:room.board.width,height:room.board.height,mines:room.board.mines,cells:room.board.cells.map(c=>({revealed:!!c.revealed,value:c.mine?'mine':c.number,silent:!!c.silent,flagColors:[...(c.flags||[])].map(id=>room.players.find(p=>p.id===id)?.color).filter(Boolean),clearedBy:c.clearedBy||null,clearColor:c.clearColor||null,ghostFlags:c.ghostFlags||[],electrified:!!c.electricOwner}))};}
  startReplay(room){const initial=this.replayBoard(room);room.roundReplay={round:room.round,initial,frames:[],previous:initial,lastLogId:room.eventId};}
  capture(room){
    if(!room.board||!room.roundReplay||!['preparing','playing','round-end','finished'].includes(room.phase))return;
    const history=room.roundReplay,board=this.replayBoard(room),logs=room.log.filter(e=>e.id>history.lastLogId).reverse().map(e=>({text:e.text,tone:e.tone||'neutral',playerId:e.playerId,targetId:e.targetId,toneBy:e.toneBy||{}}));
    const resized=history.previous.width!==board.width||history.previous.height!==board.height,changes=board.cells.flatMap((cell,index)=>JSON.stringify(cell)!==JSON.stringify(history.previous.cells[index])?[{index,cell}]:[]);
    if(logs.length||changes.length||resized)history.frames.push({at:this.service.now(),logs,...(resized?{board}:{changes}),mines:board.mines});
    history.previous=board;history.lastLogId=room.eventId;
  }
  publicReplay(room){if(!['round-end','finished'].includes(room.phase)||!room.roundReplay)return null;const {round,initial,frames}=room.roundReplay;return {round,initial,frames};}
}
