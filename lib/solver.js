import { neighbors } from './board.js';
import {BALANCE} from './balance.js';

export const SCORING = Object.freeze({ obvious: 10, pattern: 30, deep: 50,
  guessBase:BALANCE.forcedGuessBase,guessRisk:BALANCE.forcedGuessRisk,recklessGuess:BALANCE.recklessGuess,cascade:1,lastSafe:30,correctFlag:5 });

function constraintsFrom(view) {
  const constraints = [];
  for (let i = 0; i < view.cells.length; i++) {
    const cell = view.cells[i];
    if (!cell.revealed || typeof cell.value !== 'number') continue;
    const ns = neighbors(i, view.width, view.height);
    constraints.push({ cells: ns.filter(n => !view.cells[n].revealed),
      mines: cell.value - ns.filter(n => view.cells[n].revealed && view.cells[n].value === 'mine' && !view.cells[n].silent).length });
  }
  return constraints;
}

// No flags or private mine fields enter any of these deductions.
export function deduce(view, subsets = false) {
  const base = constraintsFrom(view), safe = new Set([...(view.guaranteedSafe||[]),...(view.knownSafe||[])]), mines = new Set();
  const deadline=performance.now()+20;let comparisons=0;
  const normalized=()=>base.map(c=>({cells:c.cells.filter(i=>!safe.has(i)&&!mines.has(i)).sort((a,b)=>a-b),mines:c.mines-c.cells.filter(i=>mines.has(i)).length})).filter(c=>c.cells.length);
  let constraints = [], changed = true;
  while (changed) {
    changed = false;
    const unique = new Map();
    for (const c of base) {
      const cells = c.cells.filter(i => !safe.has(i) && !mines.has(i)).sort((a,b) => a-b);
      const count = c.mines - c.cells.filter(i => mines.has(i)).length;
      if (cells.length) unique.set(cells.join(','), {cells, mines:count});
    }
    constraints = [...unique.values()];
    const prove = c => {
      if (c.mines !== 0 && c.mines !== c.cells.length) return;
      const set = c.mines === 0 ? safe : mines;
      for (const i of c.cells) if (!set.has(i)) {set.add(i);changed=true;}
    };
    for (const c of constraints) prove(c);
    if (subsets && !changed) {
      for (let a=0; a<constraints.length; a++) for (let b=0; b<constraints.length; b++) {
        if(++comparisons>40000||constraints.length>1024||(comparisons%256===0&&performance.now()>deadline))return {safe,mines,constraints:normalized()};
        const A=constraints[a], B=constraints[b];
        if (A.cells.length >= B.cells.length || !A.cells.every(i => B.cells.includes(i))) continue;
        const difference={cells:B.cells.filter(i=>!A.cells.includes(i)),mines:B.mines-A.mines};
        prove(difference);
        const key=difference.cells.join(',');
        if (!unique.has(key)) {unique.set(key,difference);constraints.push(difference);}
      }
    }
  }
  return { safe, mines, constraints };
}

function choose(n,k) {
  if (k < 0 || k > n) return 0n;
  k = Math.min(k,n-k); let result=1n;
  for (let i=1;i<=k;i++) result=result*BigInt(n-k+i)/BigInt(i);
  return result;
}
function convolve(a,b) {
  const result=new Map();
  for (const [ka,va] of a) for (const [kb,vb] of b) result.set(ka+kb,(result.get(ka+kb)||0n)+va*vb);
  return result;
}

function enumerate(cells, constraints, target, deadline, maxNodes,all=false) {
  const membership=new Map(cells.map(i=>[i,[]]));
  const cs=constraints.map(c=>({ ...c, left:c.cells.length, assigned:0 }));
  cs.forEach((c,j)=>c.cells.forEach(i=>membership.get(i).push(j)));
  const order=[...cells].sort((a,b)=>membership.get(b).length-membership.get(a).length);
  const ways=new Map(), hits=new Map(),allHits=new Map(cells.map(i=>[i,new Map()])),assignedMines=new Set();let nodes=0,cutoff=false;
  function dfs(depth,count,targetMine) {
    if (++nodes>maxNodes || (nodes%128===0 && performance.now()>deadline)) {cutoff=true;return;}
    if (depth===order.length) {
      ways.set(count,(ways.get(count)||0n)+1n);
      if(targetMine)hits.set(count,(hits.get(count)||0n)+1n);
      if(all)for(const i of assignedMines){const h=allHits.get(i);h.set(count,(h.get(count)||0n)+1n);}
      return;
    }
    const index=order[depth], linked=membership.get(index);
    for(let value=0;value<=1;value++) {
      let valid=true;
      for(const j of linked){cs[j].left--;cs[j].assigned+=value;if(cs[j].assigned>cs[j].mines||cs[j].assigned+cs[j].left<cs[j].mines)valid=false;}
      if(value)assignedMines.add(index);if(valid)dfs(depth+1,count+value,index===target?Boolean(value):targetMine);assignedMines.delete(index);
      for(const j of linked){cs[j].left++;cs[j].assigned-=value;}
      if(cutoff)return;
    }
  }
  dfs(0,0,false);return {ways,hits,allHits,cutoff};
}

export function mineProbability(view, target, { maxComponent = 30, maxNodes = 150000, maxMs = 60 } = {}) {
  const deduction=deduce(view,true);
  if(deduction.safe.has(target))return {p:0,exact:true};
  if(deduction.mines.has(target))return {p:1,exact:true};
  const unknown=view.cells.map((c,i)=>!c.revealed&&!deduction.safe.has(i)&&!deduction.mines.has(i)?i:-1).filter(i=>i>=0);
  const exploded=view.cells.filter(c=>c.revealed&&c.value==='mine'&&!c.silent).length;
  const remaining=view.mines-exploded-deduction.mines.size;
  if(remaining===0)return {p:0,exact:true};
  if(remaining===unknown.length)return {p:1,exact:true};
  const constraints=deduction.constraints;
  const frontier=new Set(constraints.flatMap(c=>c.cells));
  const groups=[],unvisited=new Set(frontier);
  while(unvisited.size){
    const seed=unvisited.values().next().value, group=new Set([seed]),queue=[seed];unvisited.delete(seed);
    while(queue.length){const i=queue.pop();for(const c of constraints)if(c.cells.includes(i))for(const n of c.cells)if(unvisited.delete(n)){group.add(n);queue.push(n);}}
    groups.push({cells:[...group],constraints:constraints.filter(c=>c.cells.some(i=>group.has(i)))});
  }
  const approximate=()=>{
    const local=constraints.filter(c=>c.cells.includes(target)).map(c=>c.mines/c.cells.length);
    const density=remaining/Math.max(1,unknown.length);
    const p=local.length?(local.reduce((a,b)=>a+b,0)+density)/(local.length+1):density;
    return {p:Math.max(.01,Math.min(.99,p)),exact:false};
  };
  if(groups.some(g=>g.cells.length>maxComponent))return approximate();
  const deadline=performance.now()+maxMs;
  let ways=new Map([[0,1n]]),targetWays=null;
  for(const group of groups){
    if(performance.now()>deadline)return approximate();
    const result=enumerate(group.cells,group.constraints,target,deadline,maxNodes);
    if(result.cutoff||!result.ways.size)return approximate();
    if(group.cells.includes(target)) targetWays=convolve(ways,result.hits);
    else if(targetWays)targetWays=convolve(targetWays,result.ways);
    ways=convolve(ways,result.ways);
  }
  const pool=unknown.filter(i=>!frontier.has(i)).length;
  let denominator=0n,numerator=0n;
  for(const [mines,count] of ways){
    denominator+=count*choose(pool,remaining-mines);
    if(!frontier.has(target))numerator+=count*choose(pool-1,remaining-mines-1);
  }
  if(frontier.has(target))for(const [mines,count] of targetWays||[])numerator+=count*choose(pool,remaining-mines);
  if(!denominator)return approximate();
  return {p:Number(numerator)/Number(denominator),exact:true};
}

export function provableSafeCells(view,{maxComponent=30,maxNodes=150000,maxMs=60}={}){
  const deduction=deduce(view,true),safe=new Set([...deduction.safe].filter(i=>!view.cells[i].revealed));if(safe.size)return safe;
  const unknown=view.cells.flatMap((c,i)=>!c.revealed&&!deduction.mines.has(i)?[i]:[]),remaining=view.mines-view.cells.filter(c=>c.revealed&&c.value==='mine'&&!c.silent).length-deduction.mines.size;
  if(remaining===0)return new Set(unknown);
  const constraints=deduction.constraints,frontier=new Set(constraints.flatMap(c=>c.cells)),unvisited=new Set(frontier),groups=[],deadline=performance.now()+maxMs;
  while(unvisited.size){const first=unvisited.values().next().value,group=new Set([first]),queue=[first];unvisited.delete(first);while(queue.length){const i=queue.pop();for(const c of constraints)if(c.cells.includes(i))for(const n of c.cells)if(unvisited.delete(n)){group.add(n);queue.push(n);}}const cells=[...group];if(cells.length>maxComponent||performance.now()>deadline)return safe;const result=enumerate(cells,constraints.filter(c=>c.cells.some(i=>group.has(i))),null,deadline,maxNodes,true);if(result.cutoff||!result.ways.size)return safe;groups.push({cells,...result});}
  const pool=unknown.filter(i=>!frontier.has(i)),prefix=[new Map([[0,1n]])],suffix=Array(groups.length+1);suffix[groups.length]=new Map([[0,1n]]);for(let i=0;i<groups.length;i++)prefix.push(convolve(prefix[i],groups[i].ways));for(let i=groups.length-1;i>=0;i--)suffix[i]=convolve(groups[i].ways,suffix[i+1]);
  let denominator=0n,poolHits=0n;for(const[n,count]of prefix.at(-1)){denominator+=count*choose(pool.length,remaining-n);if(pool.length)poolHits+=count*choose(pool.length-1,remaining-n-1);}if(!denominator)return safe;if(pool.length&&poolHits===0n)for(const i of pool)safe.add(i);
  for(let j=0;j<groups.length;j++){const other=convolve(prefix[j],suffix[j+1]);for(const i of groups[j].cells){let hits=0n;for(const[n,count]of convolve(other,groups[j].allHits.get(i)))hits+=count*choose(pool.length,remaining-n);if(hits===0n)safe.add(i);}}
  return safe;
}
export function classify(view,index,options) {
  const direct=new Set([...(view.guaranteedSafe||[]),...(view.knownSafe||[])]);for(const c of constraintsFrom(view))if(c.mines===0)for(const i of c.cells)direct.add(i);
  if(direct.has(index))return {tier:'obvious',p:0,exact:true,points:SCORING.obvious};
  if(deduce(view,true).safe.has(index))return {tier:'pattern',p:0,exact:true,points:SCORING.pattern};
  const risk=mineProbability(view,index,options);
  const tier=risk.exact&&risk.p===0?'deep':'guess';
  if(tier==='deep')return {tier,...risk,points:SCORING.deep};
  const guessKind=provableSafeCells(view,options).size?'reckless':'forced';
  return {tier,...risk,guessKind,points:guessKind==='reckless'?SCORING.recklessGuess:Math.round(SCORING.guessBase+SCORING.guessRisk*risk.p)};
}
