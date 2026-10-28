import test from 'node:test';
import assert from 'node:assert/strict';
import { classify, mineProbability, deduce } from '../lib/solver.js';
import { neighbors } from '../lib/board.js';

const hidden=()=>({revealed:false,flagged:false,flagColors:[]}),number=value=>({revealed:true,value});
test('a corner 1 alone gives each hidden neighbor one-third mine probability',()=>{
  const view={width:2,height:2,mines:1,cells:[number(1),hidden(),hidden(),hidden()]};
  for(const target of [1,2,3])assert.deepEqual(mineProbability(view,target),{p:1/3,exact:true});
});
test('corner 1 with an exploded mine proves its other neighbors Obvious',()=>{
  const view={width:2,height:2,mines:1,cells:[number(1),{revealed:true,value:'mine'},hidden(),hidden()]};
  assert.equal(classify(view,2).tier,'obvious');assert.equal(classify(view,2).points,10);
});
test('1-2-1 pattern proves the middle frontier cell safe using subsets',()=>{
  const view={width:3,height:2,mines:2,cells:[number(1),number(2),number(1),hidden(),hidden(),hidden()]};
  assert.equal(deduce(view).safe.has(4),false);
  assert.deepEqual(classify(view,4),{tier:'pattern',p:0,exact:true,points:30});
});
test('true forced 50/50 is worth 40',()=>{
  const view={width:3,height:1,mines:1,cells:[hidden(),number(1),hidden()]};
  assert.deepEqual(classify(view,0),{tier:'guess',p:.5,exact:true,guessKind:'forced',points:40});
});
test('remaining global mine count proves an off-frontier Deep cell safe',()=>{
  const view={width:5,height:1,mines:1,cells:[hidden(),number(1),hidden(),hidden(),hidden()]};
  assert.equal(deduce(view,true).safe.has(4),false);
  assert.deepEqual(classify(view,4),{tier:'deep',p:0,exact:true,points:50});
});
test('mine-count weighting includes unconstrained cells rather than averaging frontier solutions',()=>{
  const view={width:8,height:1,mines:2,cells:[hidden(),number(1),hidden(),number(1),hidden(),hidden(),hidden(),hidden()]};
  assert.equal(mineProbability(view,2).p,.75);
  assert.equal(mineProbability(view,0).p,.25);
  assert.equal(mineProbability(view,7).p,.25);
});
test('independent frontier components are combined with the remaining mine count',()=>{
  const view={width:9,height:1,mines:3,cells:[hidden(),number(1),hidden(),hidden(),hidden(),hidden(),hidden(),number(1),hidden()]};
  assert.equal(mineProbability(view,0).p,.5);assert.equal(mineProbability(view,8).p,.5);
  assert.equal(mineProbability(view,4).p,1/3);
});
test('fake flags cannot change classification or probability',()=>{
  const view={width:3,height:2,mines:2,cells:[number(1),number(2),number(1),hidden(),hidden(),hidden()]};
  const before=classify(view,4);for(const c of view.cells){c.flagged=true;c.flagColors=['#fff'];}
  assert.deepEqual(classify(view,4),before);
});
test('large component and exhausted search budget fall back without claiming Deep',()=>{
  const view={width:8,height:1,mines:2,cells:[hidden(),number(1),hidden(),number(1),hidden(),hidden(),hidden(),hidden()]};
  for(const options of [{maxComponent:2},{maxNodes:1},{maxMs:0}]){
    const result=classify(view,2,options);assert.equal(result.exact,false);assert.equal(result.tier,'guess');assert.ok(result.p>0&&result.p<1);
  }
  const large={width:65,height:1,mines:16,cells:Array.from({length:65},(_,i)=>i%2?number(1):hidden())};
  const before=performance.now();assert.equal(mineProbability(large,0).exact,false);assert.ok(performance.now()-before<500);
});

test('exact probabilities match a separate brute-force oracle across small revealed boards',()=>{
  // Deterministic boards, with varying revealed frontiers. Oracle enumerates whole boards.
  for(let seed=1;seed<=24;seed++){
    let value=seed;const random=()=>{value=(value*1664525+1013904223)>>>0;return value/2**32;};
    const w=4,h=3,total=w*h,mineIndices=new Set();while(mineIndices.size<3)mineIndices.add(Math.floor(random()*total));
    const cells=Array.from({length:total},(_,i)=>mineIndices.has(i)?hidden():random()<.35?number(neighbors(i,w,h).filter(n=>mineIndices.has(n)).length):hidden());
    const view={width:w,height:h,mines:3,cells};const unknown=cells.flatMap((c,i)=>!c.revealed?[i]:[]);
    const solutions=[];
    for(let mask=0;mask<2**unknown.length;mask++){
      if(mask.toString(2).replaceAll('0','').length!==3)continue;
      const arrangement=new Set(unknown.filter((_,j)=>mask&(1<<j)));
      if(cells.every((c,i)=>!c.revealed||neighbors(i,w,h).filter(n=>arrangement.has(n)).length===c.value))solutions.push(arrangement);
    }
    assert.ok(solutions.length);
    for(const target of unknown){const expected=solutions.filter(s=>s.has(target)).length/solutions.length;const actual=mineProbability(view,target);assert.equal(actual.exact,true);assert.ok(Math.abs(actual.p-expected)<1e-10,`seed ${seed}, target ${target}: ${actual.p} vs ${expected}`);}
  }
});
