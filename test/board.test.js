import test from 'node:test';
import assert from 'node:assert/strict';
import { createBoard, neighbors, publicBoard, reveal, chooseBotMove, ROUNDS } from '../lib/board.js';

test('every round has the right dimensions and mine count with a safe opening', () => {
  for (const config of ROUNDS) for (let trial = 0; trial < 15; trial++) {
    const board = createBoard(config);
    assert.equal(board.cells.length, config.width * config.height);
    assert.equal(board.cells.filter(c => c.mine).length, config.mines);
    for (const i of [board.opening, ...neighbors(board.opening, board.width, board.height)]) {
      assert.equal(board.cells[i].mine, false);
      assert.equal(board.cells[i].revealed, true);
    }
    assert.equal(board.cells[board.opening].number, 0);
    assert.equal(board.cells.filter(c => c.mine && c.revealed).length, 0);
  }
});
test('neighbors never wrap across rows or leave the board', () => {
  assert.deepEqual(neighbors(0, 3, 3), [1, 3, 4]);
  assert.deepEqual(neighbors(2, 3, 3), [1, 4, 5]);
  assert.equal(neighbors(4, 3, 3).length, 8);
});
test('zero flood fill opens the safe area even through flags and never explodes a mine', () => {
  const board = { width: 3, height: 3, mines: 1, opening: 8, cells: Array.from({length:9}, (_,i) => ({ mine: i===0, number: [1,3,4].includes(i) ? 1 : 0, revealed:false, flags:new Set(i===1?['owner']:[]) })) };
  const opened = reveal(board, 8);
  assert.equal(opened.length, 8); assert.equal(board.cells[0].revealed, false); assert.equal(board.cells[1].revealed, true);
});
test('public serialization reveals no hidden mines, counts, or flag owners', () => {
  const board = createBoard(ROUNDS[0]);
  const hidden = board.cells.findIndex(c => !c.revealed);
  board.cells[hidden].flags.add('secret-player');
  const view = publicBoard(board,[{id:'secret-player',color:'#b8ed65'}]);
  assert.deepEqual(view.cells[hidden], {revealed:false, flagged:true,flagColors:['#b8ed65'],marks:[]});
  for (let i = 0; i < view.cells.length; i++) {
    assert.equal('mine' in view.cells[i], false); assert.equal('number' in view.cells[i], false); assert.equal('flags' in view.cells[i], false);
    if (!board.cells[i].revealed) assert.equal('value' in view.cells[i], false);
  }
  assert.equal(JSON.stringify(view).includes('secret-player'), false);
});
test('first-click safety allows both single-cell and large cascade openings',()=>{
  const small=createBoard(ROUNDS[0],()=>0,{opening:0,protectNeighbors:false});
  const large=createBoard(ROUNDS[0],()=>0,{opening:63,protectNeighbors:false});
  assert.equal(small.cells[0].mine,false);assert.equal(small.cells.filter(c=>c.revealed).length,1);
  assert.equal(large.cells[63].mine,false);assert.ok(large.cells.filter(c=>c.revealed).length>10);
});
test('bot basic deduction ignores fake flags and chooses a proven safe cell', () => {
  // 1 . 0 / ? ? ?: the right zero proves cells 4 and 5 safe, regardless of flags.
  const board = {width:3,height:2,cells:[{revealed:true,value:1},{revealed:true,value:1},{revealed:true,value:0},{revealed:false,flagged:false},{revealed:false,flagged:true},{revealed:false,flagged:false}]};
  const move = chooseBotMove(board, () => 0);
  assert.ok([4,5].includes(move.index));
  assert.equal(move.flag, 3);
});
test('bot can guess on a real 50/50 with no private board data', () => {
  const board = {width:3,height:1,cells:[{revealed:false,flagged:false},{revealed:true,value:1},{revealed:false,flagged:false}]};
  assert.equal(chooseBotMove(board, () => 0).index, 0);
  assert.equal(chooseBotMove(board, n => n-1).index, 2);
});
