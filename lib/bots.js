import { deduce, mineProbability } from './solver.js';
import { chooseBotMove } from './board.js';
import { ITEM_BY_ID, itemEnabled } from './items.js';
import {isGhost,haunt} from './haunt.js';

export const BOT_NAMES=['Dusty','Misty','Rusty','Sparky'];
export const BOT_LEVELS=['easy','normal','hard'];
export class BotBrain{
  constructor(service){this.service=service;}
  roll(n){return this.service.pick(n);}
  information(room,p){
    const view=this.service.snapshot(room,p.id).board,proof=deduce(view,true),mines=new Set(proof.mines),safe=new Set(proof.safe);
    for(const note of p.notes)if(!note.stale&&typeof note.isMine==='boolean')(note.isMine?mines:safe).add(note.index);
    view.cells.forEach((c,i)=>{for(const m of c.marks||[])if(!m.stale&&typeof m.isMine==='boolean')(m.isMine?mines:safe).add(i);});return {view,mines,safe};
  }
  chooseCell(room,p){
    const {view,mines,safe}=this.information(room,p),hidden=view.cells.flatMap((c,i)=>!c.revealed&&!mines.has(i)?[i]:[]);if(!hidden.length)return chooseBotMove(view,n=>this.roll(n)).index;
    const errors={easy:35,normal:12,hard:0}[p.botDifficulty||'normal'];if(this.roll(100)<errors)return hidden[this.roll(hidden.length)];
    const certain=[...safe].filter(i=>!view.cells[i].revealed);if(certain.length)return certain[this.roll(certain.length)];
    if(p.botDifficulty==='hard'&&!view.firstMove){const sample=[chooseBotMove(view,n=>this.roll(n)).index,...Array.from({length:3},()=>hidden[this.roll(hidden.length)])].filter(i=>i!==undefined&&!mines.has(i));let best=sample[0],risk=Infinity;for(const index of sample){const value=mineProbability(view,index).p;if(value<risk){risk=value;best=index;}}return best;}
    const chosen=chooseBotMove(view,n=>this.roll(n)).index;return mines.has(chosen)?hidden[this.roll(hidden.length)]:chosen;
  }
  flags(room,p){
    const {view,mines,safe}=this.information(room,p);for(const i of [...mines].filter(i=>!view.cells[i].revealed).slice(0,2))p.privateFlags.add(i);
    const deception={easy:8,normal:22,hard:40}[p.botDifficulty||'normal'],bluff=this.roll(100)<deception,candidates=[...(bluff?safe:mines)].filter(i=>!view.cells[i].revealed&&!room.board.cells[i].flags.has(p.id));
    if(!candidates.length)return;const count=room.board.cells.filter(c=>!c.revealed&&c.flags.has(p.id)).length,limit=room.board.mines-room.board.cells.filter(c=>c.revealed&&c.mine&&!c.silent).length;
    if(count>=Math.max(0,limit))return;const index=candidates[this.roll(candidates.length)];room.board.cells[index].flags.add(p.id);this.service.log(room,p.name+' placed a shared flag.','flag',[index],{playerId:p.id});
  }
  useCards(room,p,{ghost=false}={}){
    const budget={easy:1,normal:2,hard:3}[p.botDifficulty||'normal'];if(p.botDifficulty==='easy'&&this.roll(100)<35)return;
    for(let step=0;step<budget;step++){
      if(room.phase!=='playing'||(ghost?!isGhost(room,p):room.turnId!==p.id||p.lives<=0)||this.service.blocked(p))return;
      const cards=p.inventory.filter(c=>!c.used&&!c.disabled&&!c.roundDisabled&&itemEnabled(c.id,room.settings)&&ITEM_BY_ID.get(c.id).when!=='passive'&&(!ghost||ITEM_BY_ID.get(c.id).when==='anytime'&&!['double_hearts','plated_armor','double_mine_shield','don_armor','hide','shadow'].includes(c.id))&&(!ITEM_BY_ID.get(c.id).afterFirstClear||!room.board.openingPending));
      const preferred=['scan','silent_scan','double_scan','super_scans','reticent_scans','risk_scanner','extra_heart','double_hearts','shield','double_mine_shield','plated_armor','don_armor','hit','dagger','poison','fog','zap'];
      cards.sort((a,b)=>{const ai=preferred.indexOf(a.id),bi=preferred.indexOf(b.id);return (ai<0?99:ai)-(bi<0?99:bi);});let used=false;
      for(const item of cards){
        const def=ITEM_BY_ID.get(item.id);if(room.board.openingPending&&['double_down','triple_down','quadruple_down','postulate'].includes(item.id))continue;
        if(item.id==='reset'&&p.lives>1&&p.score>=Math.max(...room.players.map(o=>o.score))*.7)continue;
        if(['double_down','triple_down','quadruple_down'].includes(item.id)&&(p.lives<=Number(def.icon?.replace(/\D/g,''))||this.service.multiplier(p)>1&&!this.service.expansion.glass(p)))continue;
        const others=this.service.eligible(room).filter(o=>o.id!==p.id&&(o.hiddenUntil||0)<=this.service.now()).sort((a,b)=>b.score-a.score),target=others[0],view=this.service.snapshot(room,p.id).board;let index,playerId,targetUid;
        if(['player','player-cell'].includes(def.target)){if(!target)continue;playerId=target.id;}
        if(def.target==='hidden'||def.target==='player-cell')index=this.chooseCell(room,p);
        if(def.target==='cell-or-player'){if(target&&this.roll(2))playerId=target.id;else index=this.chooseCell(room,p);}
        if(def.target==='flag'){index=view.cells.findIndex((c,i)=>!c.revealed&&[...room.board.cells[i].flags].some(id=>id!==p.id));if(index<0)continue;}
        if(def.target==='revealed-cell'){index=view.cells.findIndex(c=>c.revealed&&typeof c.value==='number'&&c.value>0);if(index<0)continue;}
        if(def.target==='item'){targetUid=p.inventory.find(c=>c.uid!==item.uid&&!c.disabled&&!c.roundDisabled&&!c.echo&&!ITEM_BY_ID.get(c.id).permanent)?.uid;if(!targetUid)continue;}
        try{this.service.useItem(room,p,item.uid,index,playerId,targetUid);used=true;break;}catch{}
      }
      if(!used)break;
    }
  }
  turn(room,p){
    this.flags(room,p);this.useCards(room,p);if(room.phase!=='playing'||room.turnId!==p.id||p.lives<=0)return;
    const index=this.chooseCell(room,p);if(index!==undefined)this.service.revealFor(room,p,index);
  }
  ghostTurn(room,p){
    if(!isGhost(room,p))return;
    if(!p.ghostActionUsed){const index=this.chooseCell(room,p);if(index!==undefined)haunt(this.service,room,p,{kind:'flag',index});}
    this.useCards(room,p,{ghost:true});
  }
}
