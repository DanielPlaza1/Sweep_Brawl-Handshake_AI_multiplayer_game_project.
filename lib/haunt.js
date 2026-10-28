import {BALANCE} from './balance.js';
export const isGhost=(room,p)=>room.phase==='playing'&&room.multiplayerRound&&!p.spectator&&p.lives===0&&p.eliminatedRound===room.round;
export function haunt(service,room,p,input){
  if(!isGhost(room,p)||p.ghostActionUsed)throw new Error('One haunt is available to an eliminated participant during a live multiplayer round.');
  if(!['flag','spook'].includes(input.kind))throw new Error('Choose Ghost Flag or Ghost Spook.');
  let target=null,index=null;
  if(input.playerId){target=room.players.find(o=>o.id===input.playerId&&!o.spectator&&o.connected);if(!target||input.kind!=='spook')throw new Error('Choose a participant to spook.');}
  else{service.validateCell(room,input.index);index=input.index;if(input.kind==='flag'&&room.board.cells[index].revealed)throw new Error('Choose an uncleared cell for a Ghost Flag.');}
  p.ghostActionUsed=true;
  if(input.kind==='flag'){const cell=room.board.cells[index];(cell.ghostFlags??=[]).push({color:p.color,name:p.name});}
  else if(target)target.spookedUntil=service.now()+BALANCE.ghostSpookMs;
  else room.board.cells[index].ghostSpookedUntil=service.now()+BALANCE.ghostSpookMs;
  service.log(room,p.name+(input.kind==='flag'?' left an ethereal Ghost Flag.':' gave '+(target?target.name:'a cell')+' a harmless spook.'),'ghost',index===null?[]:[index],{playerId:p.id,targetId:target?.id,ghostKind:input.kind,tone:'neutral'});
}
