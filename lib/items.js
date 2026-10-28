import { randomInt, randomUUID } from 'node:crypto';
import { decorateItem } from './item-copy.js';
import {PARTY_ITEMS,DRAFT_GUARANTEES} from './balance.js';

export const RARITY_CHANCES=DRAFT_GUARANTEES;
export const ITEMS = Object.freeze([
  { id:'scan', name:'Scan', rarity:'common', when:'anytime', target:'hidden', icon:'⌖', description:'Publicly mark whether one hidden cell is a mine or safe. Does not open the cell.' },
  { id:'risk_scanner', name:'Risk Scanner', rarity:'common', when:'anytime', target:'hidden', icon:'%', description:'Show everyone the mine probability on one hidden cell. Large searches and uncounted mines can make this estimate approximate.' },
  { id:'truth_check', name:'Truth Check', rarity:'common', when:'anytime', target:'flag', icon:'✓', description:'Privately mark Mine or Safe on a cell with another player’s shared flag.' },
  { id:'shield', name:'Mine Shield', rarity:'common', when:'passive', target:null, icon:'◇', needsLives:true, description:'Automatically block the next mine you reveal this round. Blocks mine damage only, including Double Down.' },
  { id:'double_down', name:'Double Down', rarity:'common', when:'your-turn', target:null, icon:'×2', needsLives:true, description:'Your reveals this turn score ×2, but a mine costs 2 lives. Cannot stack or affect the free opening.' },
  { id:'plant_mine', name:'Plant Mine', rarity:'common', when:'anytime', target:'hidden', afterFirstClear:true, icon:'✹', description:'Plant a mine. Nearby numbers and the mine counter increase.' },
  { id:'extra_heart', name:'Extra Heart', rarity:'common', when:'passive', target:null, icon:'♥', needsLives:true, description:'Automatically add 1 life when each round begins.' },
  { id:'skip', name:'Skip', rarity:'rare', when:'your-turn', target:'player', icon:'↠', description:'Choose any living player, including yourself. End their active turn now, or skip their next turn.' },
  { id:'reverse', name:'Reverse', rarity:'rare', when:'anytime', target:null, icon:'⇄', description:'Reverse the direction of subsequent turns.' },
  { id:'fog', name:'Fog', rarity:'rare', when:'anytime', target:null, icon:'≋', description:'Every other player’s next turn shows revealed numbers as ?.' },
  { id:'trip', name:'Trip', rarity:'rare', when:'anytime', target:null, icon:'↯', description:'The next player immediately reveals a random hidden cell, then still gets their normal move if alive.' },
  { id:'force_hand', name:'Force Hand', rarity:'legendary', when:'your-turn', target:'player-cell', icon:'⌁', description:'Choose any living player, including yourself, then a hidden cell. They reveal it immediately and retain their normal move if alive.' },
  { id:'silent_mine', name:'Silent Mine', rarity:'legendary', when:'anytime', target:'hidden', afterFirstClear:true, icon:'✦', description:'Plant a secret mine. Numbers and the mine counter stay unchanged.' },
  { id:'expose', name:'Expose', rarity:'legendary', when:'anytime', target:null, icon:'◎', description:'Privately inspect all shared and private flags; gain 10 points per wrong flag.' },
  { id:'ricochet', name:'Ricochet', rarity:'legendary', when:'passive', target:null, icon:'⤴', description:'Redirect one targeted harmful item to a random other living player, possibly its user. Activates automatically once per copy per round. Reflections do not chain.' },
  { id:'hit', name:'Hit', rarity:'common', when:'anytime', target:'player', icon:'✊', needsLives:true, description:'Any chosen player loses 1 heart. Cannot eliminate them. Armor absorbs the hit first.' },
  { id:'dagger', name:'Dagger', rarity:'rare', when:'anytime', target:'player', icon:'†', needsLives:true, description:'Any chosen player loses 1 heart. Eliminates them if it takes their last heart. Armor absorbs damage first.' },
  { id:'scythe', name:'Scythe', rarity:'legendary', when:'anytime', target:null, icon:'☾', needsLives:true, description:'Every other living player loses 1 heart without being eliminated. Ricochet protects its owner and hits you once total, even with several reflections.' },
  { id:'triple_down', name:'Triple Down', rarity:'rare', when:'your-turn', target:null, icon:'×3', needsLives:true, description:'Your reveals this turn score ×3; a mine costs 3 hearts. Cannot stack with another Down or affect the free opening.' },
  { id:'quadruple_down', name:'Quadruple Down', rarity:'legendary', when:'your-turn', target:null, icon:'×4', needsLives:true, description:'Your reveals this turn score ×4; a mine costs 4 hearts. Cannot stack with another Down or affect the free opening.' },
  { id:'jest', name:'Jest', rarity:'legendary', when:'anytime', target:'player', needsLives:true, icon:'♧', description:'Give another living player Quadruple Down, ready to use. They must not already own it.' },
  { id:'delay', name:'Delay', rarity:'rare', when:'anytime', target:'player', icon:'⌛', description:'Move any chosen player’s upcoming turn to the end of the turn cycle. If their turn has begun or already passed, delay their next cycle.' },
  { id:'double_mine_shield', name:'Double Mine Shield', rarity:'rare', when:'anytime', target:null, icon:'◇2', needsLives:true, description:'Gain 2 mine shields for this round. Each blocks one entire mine hit, including Down damage.' },
  { id:'double_hearts', name:'Double Hearts', rarity:'rare', when:'anytime', target:null, icon:'♥2', needsLives:true, description:'Gain 2 hearts immediately for this round.' },
  { id:'plated_armor', name:'Plated Armor', rarity:'legendary', when:'anytime', target:null, icon:'▣', needsLives:true, description:'Gain 3 armor shields for this round. They act as health and absorb any heart damage before your hearts.' },
  { id:'echo_shard', name:'Echo Shard', rarity:'rare', when:'anytime', target:'item', icon:'◈', permanent:true, description:'Choose another card in your hand. For the rest of the game it refreshes automatically once per round after use. This card is permanently disabled. Cannot link disabled cards, Egg or Echo Shard.' },
  { id:'refresher', name:'Refresher', rarity:'legendary', when:'anytime', target:null, icon:'⟳', description:'Refresh every eligible card used before this activation. Unused and permanently disabled cards receive no extra use; Refresher does not refresh itself.' },
  { id:'egg', name:'Egg', rarity:'common', when:'anytime', target:null, icon:'⬭', permanent:true, description:'Open anytime for a random unowned item of this egg’s rarity, immediately usable. Unopened eggs grow common → rare → legendary each round. Opening permanently disables the egg.' },
  { id:'poison', name:'Poison', rarity:'rare', when:'anytime', target:'player', icon:'☠', needsLives:true, description:'Poison a player for this round: lose 1 heart after 3 actions, then 4, then 5. Additional poison effects have separate counters, starting one above the last effect’s current threshold. Items, reveals and automatic items count; flags do not.' },
  { id:'noxious_cloud', name:'Noxious Cloud', rarity:'legendary', when:'anytime', target:null, icon:'☁', needsLives:true, description:'Poison every other living player. On affected players, any poison damage also fogs their next turn. Ricochet can redirect each application.' },
  { id:'curse', name:'Curse', rarity:'legendary', when:'anytime', target:'player', icon:'⛓', description:'Skip a player’s next turn and immediately lock their manual and automatic items for 5 seconds, plus 10% of the turn timer when it exceeds 10 seconds.' },
  { id:'reactive_barrier', name:'Reactive Barrier', rarity:'common', when:'passive', target:null, icon:'⬡', needsLives:true, description:'Lose 2 hearts to gain a mine shield. Resets after your next turn.' },
  { id:'paranoid', name:'Paranoid', rarity:'rare', when:'passive', target:null, icon:'◉', needsLives:true, description:'After other players take 6 actions, gain a mine shield. Resets after your next turn.' },
  { id:'divine_barrier', name:'Divine Barrier', rarity:'legendary', when:'passive', target:null, icon:'✧', needsLives:true, description:'At 1 heart, remove your debuffs and gain 2 yellow barriers. Reactive Barrier gives yellow barriers too.' },
  { id:'glass_cannon', name:'Glass Cannon', rarity:'legendary', when:'passive', target:null, icon:'✺', needsLives:true, description:'Always gain ×2 points and mine damage. Down cards stack on top. Lose 1 heart each round.' },
  { id:'pawn', name:'Pawn', rarity:'common', when:'passive', target:null, icon:'♟', description:'Next turn, move up to 2 cells vertically or 1 diagonally for ×1.5 points. Keep the chain while moves match.' },
  { id:'knight', name:'Knight', rarity:'rare', when:'passive', target:null, icon:'♞', description:'Next turn, make a chess knight’s L-shaped move for ×1.5 points. You tend to play earlier.' },
  { id:'rook', name:'Rook', rarity:'rare', when:'passive', target:null, icon:'♜', description:'Next turn, clear along the same row or column for ×1.5 points. Start each round with an extra heart.' },
  { id:'bishop', name:'Bishop', rarity:'rare', when:'passive', target:null, icon:'♝', description:'Next turn, clear diagonally for ×1.5 points. Gain a Plant Mine each round.' },
  { id:'queen', name:'Queen', rarity:'legendary', when:'passive', target:null, icon:'♛', description:'Next turn, clear along a row, column or diagonal for ×1.5 points. Your other chess items gain upgraded bonuses.' },
  { id:'silent_scan', name:'Silent Scan', rarity:'rare', when:'anytime', target:'hidden', icon:'⌖', description:'Privately check whether a hidden cell is safe.' },
  { id:'double_scan', name:'Double Scan', rarity:'rare', when:'anytime', target:'hidden', icon:'⌖2', charges:2, description:'2 scans. Mark a hidden cell Mine or Safe for everyone.' },
  { id:'super_scans', name:'Super Scans', rarity:'legendary', when:'anytime', target:'hidden', icon:'⌖✦', charges:2, description:'2 area scans. All your scans also check neighboring hidden cells.' },
  { id:'reticent_scans', name:'Reticent Scans', rarity:'legendary', when:'anytime', target:'hidden', icon:'⌖◌', charges:2, description:'2 private scans. All your scans become private.' },
  { id:'duel', name:'Duel', rarity:'common', when:'anytime', target:'player', afterFirstClear:true, icon:'⚔', needsLives:true, description:'Challenge another player. Your next regular clears compete: higher base points steals the loser’s base points and 1 heart.' },
  { id:'hide_two_numbers', name:'Hide 2 Numbers', rarity:'common', when:'anytime', target:'revealed-cell', charges:2, afterFirstClear:true, icon:'?2', description:'Hide 2 revealed numbers from everyone else.' },
  { id:'hide_three_numbers', name:'Hide 3 Numbers', rarity:'rare', when:'anytime', target:'revealed-cell', charges:3, afterFirstClear:true, icon:'?3', description:'Hide 3 revealed numbers from everyone else.' },
  { id:'adaptive', name:'Adaptive', rarity:'legendary', when:'passive', target:null, icon:'⌘', needsLives:true, description:'Lost hearts and added board effects improve your clear points. Lose 2 hearts to gain a yellow barrier; resets after your next turn.' },
  { id:'electrify', name:'Electrify', rarity:'common', when:'anytime', target:'hidden', charges:2, afterFirstClear:true, icon:'ϟ', description:'Electrify 2 cells. Clearing one delays the player’s next turn. Your electricity can spread after turns.' },
  { id:'zap', name:'Zap!', rarity:'common', when:'anytime', target:'player', icon:'⚡', description:'Halve the target’s next turn timer; untimed games move it one place back.' },
  { id:'galvanize', name:'Galvanize', rarity:'rare', when:'anytime', target:'cell-or-player', charges:3, afterFirstClear:true, icon:'ϟ3', description:'3 charges: electrify cells or zap players. A zap against you can move you early instead; resets after 5 actions.' },
  { id:'shocking_reanimation', name:'Shocking Reanimation', rarity:'legendary', when:'anytime', target:'cell-or-player', charges:5, afterFirstClear:true, icon:'ϟ♥', needsLives:true, description:'5 charges: electrify or zap. When eliminated, sacrifice an electrical item for 2 hearts and a yellow barrier.' },
  { id:'grow', name:'Grow', rarity:'common', when:'passive', target:null, icon:'❀', needsLives:true, description:'After 4 actions, gain 1 heart.' },
  { id:'compensate', name:'Compensate', rarity:'rare', when:'passive', target:null, icon:'♥+', needsLives:true, description:'Gain 1 heart when a negative effect reaches you.' },
  { id:'batteries', name:'Batteries', rarity:'rare', when:'anytime', target:'cell-or-player', charges:2, afterFirstClear:true, icon:'▣ϟ', description:'2 charges: electrify or zap. Gain points when electricity is added. Recover 1 charge after 5 actions.' },
  { id:'hide', name:'Vanish', rarity:'rare', when:'anytime', target:null, icon:'◌', description:'Prevents other players’ items from targeting you for 6 seconds, plus a little of the turn timer.' },
  { id:'shadow', name:'Shadow', rarity:'legendary', when:'anytime', target:null, icon:'☾', description:'Hide for 10 seconds, plus part of the turn timer. Gain a temporary yellow barrier afterward. Hide gains that barrier too.' },
  { id:'don_armor', name:'Don Armor', rarity:'rare', when:'anytime', target:null, icon:'⬢', needsLives:true, description:'Gain a yellow barrier until your next turn ends.' },
  { id:'scatter', name:'Scatter', rarity:'common', when:'anytime', target:null, afterFirstClear:true, icon:'✹2', description:'Plant 2 mines in random hidden cells.' },
  { id:'scatter_2x', name:'Scatter 2x', rarity:'rare', when:'anytime', target:null, afterFirstClear:true, icon:'✹4', description:'Plant 4 mines in random hidden cells.' },
  {id:'reset',name:'Reset',rarity:'legendary',when:'anytime',target:null,afterFirstClear:true,icon:'↺',description:'Reset the board and take the first clear.'},
  {id:'spin',name:'Spin',rarity:'rare',when:'anytime',target:null,afterFirstClear:true,icon:'⟳',description:'Rotate the board and randomize turns.'},
].map(item=>decorateItem({...item,description:item.description})));
export const ITEM_BY_ID = new Map(ITEMS.map(item=>[item.id,item]));
export const itemEnabled = (id, settings={}) => !!ITEM_BY_ID.get(id) && !(settings.lives===0 && ITEM_BY_ID.get(id).needsLives);
export function rollProfiles(round,pick=randomInt){
  const rule=DRAFT_GUARANTEES[Math.max(0,Math.min(round-1,4))],profiles=Array.from({length:3},()=>['common','common','common']);
  const slots=[...Array(rule.rare).fill('rare'),...Array(rule.legendary).fill('legendary')];
  if(pick(100)<rule.bonusChance)slots.push(rule.legendaryUpgradeChance&&pick(100)<rule.legendaryUpgradeChance?'legendary':rule.bonus);
  const choices=[0,1,2];for(let i=2;i>0;i--){const j=pick(i+1);[choices[i],choices[j]]=[choices[j],choices[i]];}
  for(let i=0;i<slots.length;i++){const row=i<3?choices[i]:choices[pick(3)],empty=profiles[row].flatMap((v,j)=>v==='common'?[j]:[]);profiles[row][empty[pick(empty.length)]]=slots[i];}
  return profiles;
}
export function beginDraft(profiles,pick=randomInt,settings={},inventory=[]){
  const draft={choice:0,rerollsLeft:2,offers:[],pools:{common:[],rare:[],legendary:[]},ready:false,owned:inventory.map(c=>c.id),settings:{lives:settings.lives,itemPool:settings.itemPool}};
  draft.offers=drawOffers(draft,profiles[0],pick);return draft;
}
export function drawOffers(draft,slots,pick=randomInt){
  const offers=[],previous=new Set(draft.offers.map(c=>c.id));
  const pool=rarity=>ITEMS.filter(c=>c.rarity===rarity&&itemEnabled(c.id,draft.settings)&&(draft.settings.itemPool!=='party'||PARTY_ITEMS.includes(c.id))&&!draft.owned?.includes(c.id)).map(c=>c.id);
  for(const rarity of slots){
    if(!draft.pools[rarity].length)draft.pools[rarity]=pool(rarity);
    let available=draft.pools[rarity].filter(id=>!draft.owned?.includes(id)&&!offers.some(c=>c.id===id));
    if(!available.length){draft.pools[rarity]=pool(rarity).filter(id=>!offers.some(c=>c.id===id));available=draft.pools[rarity];}
    let candidates=available.filter(id=>!previous.has(id));if(!candidates.length)candidates=available;
    if(!candidates.length)continue;
    const id=candidates[pick(candidates.length)];draft.pools[rarity]=draft.pools[rarity].filter(i=>i!==id);
    offers.push({uid:randomUUID(),id});
  }
  return offers;
}
export function lootPool(inventory,rarity,settings={}){return ITEMS.filter(c=>c.rarity===rarity&&itemEnabled(c.id,settings)&&(settings.itemPool!=='party'||PARTY_ITEMS.includes(c.id))&&!inventory.some(i=>i.id===c.id));}
export function ownItem(instance){const def=ITEM_BY_ID.get(instance.id);return {...def,...(instance.id==='egg'?{rarity:instance.eggRarity||'common'}:{}),uid:instance.uid,used:!!instance.used,disabled:!!instance.disabled,roundDisabled:!!instance.roundDisabled,...(def?.charges?{charges:instance.charges??def.charges,maxCharges:def.charges}:{}),passiveUsed:!!instance.passiveUsed,echo:!!instance.echo,echoReady:!!instance.echo&&!instance.echoSpent};}
export function publicItem(instance){if(!instance.revealed)return {uid:instance.uid,used:instance.secretUsed?false:!!instance.used,hidden:true};const {echoReady,...card}=ownItem(instance);return {...card,used:instance.secretUsed?false:!!instance.used};}

