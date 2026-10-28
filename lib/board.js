import { randomInt } from 'node:crypto';

// Starter progression. Replace this table when the contest's Rounds table arrives.
export const ROUNDS = [
  { width: 8, height: 8, mines: 10 },
  { width: 10, height: 10, mines: 18 },
  { width: 12, height: 12, mines: 28 },
  { width: 14, height: 14, mines: 38 },
  { width: 16, height: 16, mines: 50 },
];

export function neighbors(index, width, height) {
  const x = index % width, y = Math.floor(index / width), result = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (!dx && !dy) continue;
    const nx = x + dx, ny = y + dy;
    if (nx >= 0 && nx < width && ny >= 0 && ny < height) result.push(ny * width + nx);
  }
  return result;
}

export function createBoard(config, pick = randomInt, options = {}) {
  const { width, height, mines } = config;
  const count = width * height, opening = options.opening ?? pick(count);
  const excluded = new Set([opening, ...(options.safeCells || []), ...(options.protectNeighbors === false ? [] : neighbors(opening, width, height))]);
  const candidates = Array.from({ length: count }, (_, i) => i).filter(i => !excluded.has(i));
  if (mines > candidates.length) throw new Error('Too many mines for a safe opening');
  const cells = Array.from({ length: count }, () => ({ mine: false, number: 0, revealed: false, flags: new Set() }));
  for (let i = 0; i < mines; i++) {
    const j = i + pick(candidates.length - i);
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    cells[candidates[i]].mine = true;
  }
  for (let i = 0; i < count; i++) cells[i].number = neighbors(i, width, height).filter(n => cells[n].mine).length;
  const board = { width, height, mines, opening, cells, generated: true };
  if (options.revealOpening !== false) reveal(board, opening);
  return board;
}

export function reveal(board, index) {
  const first = board.cells[index];
  if (!first || first.revealed) return [];
  const opened = [], queue = [index];
  while (queue.length) {
    const current = queue.pop(), cell = board.cells[current];
    if (cell.revealed) continue;
    cell.revealed = true;
    opened.push(current);
    if (!cell.mine && cell.number === 0) {
      for (const n of neighbors(current, board.width, board.height)) {
        if (!board.cells[n].revealed && !board.cells[n].mine) queue.push(n);
      }
    }
  }
  return opened;
}

export function blankBoard(config) {
  return { ...config, opening: null, generated: false,
    cells: Array.from({ length: config.width * config.height }, () => ({ mine: false, number: 0, revealed: false, flags: new Set() })) };
}

// Mines exist during preparation; the first click relocates mines out of its 2 x 2 opening.
export function createRoundBoard(config, pick = randomInt) {
  const board=createBoard(config,pick,{opening:pick(config.width*config.height),protectNeighbors:false,revealOpening:false});
  board.opening=null;board.openingPending=true;return board;
}

export function safeOpening(board,index,pick=randomInt){
  const x=Math.min(index%board.width,board.width-2),y=Math.min(Math.floor(index/board.width),board.height-2),anchor=y*board.width+x;
  const block=[anchor,anchor+1,anchor+board.width,anchor+board.width+1];
  const destinations=board.cells.flatMap((c,i)=>!c.mine&&!c.revealed&&!block.includes(i)?[i]:[]);
  for(const i of block){const c=board.cells[i];if(!c.mine)continue;const at=pick(destinations.length),target=destinations.splice(at,1)[0];if(target===undefined)throw new Error('Not enough room for a safe opening');board.cells[target].mine=true;board.cells[target].silent=!!c.silent;if(c.mineOwner)board.cells[target].mineOwner=c.mineOwner;c.mine=false;c.silent=false;delete c.mineOwner;}
  for(let i=0;i<board.cells.length;i++)board.cells[i].number=neighbors(i,board.width,board.height).filter(n=>board.cells[n].mine&&!board.cells[n].silent).length;
  board.opening=index;board.openingPending=false;return block;
}

export function publicBoard(board, players = [], finished = false) {
  if (!board) return null;
  return {
    width: board.width, height: board.height, mines: board.mines, opening: board.opening,
    flags: board.cells.filter(c => c.flags?.size).length,
    exploded: board.cells.filter(c => c.revealed && c.mine && !c.silent).length,
    safeRemaining: board.generated === false ? board.cells.length - board.mines : board.cells.filter(c => (!c.mine || c.silent && !finished) && !c.revealed).length,
    firstMove: board.openingPending === true || board.generated === false,
    dangerZone:!!board.dangerZone,guaranteedSafe: [],
    cells: board.cells.map(c => c.revealed||finished&&c.mine
      ? { revealed: true,...(c.ghostSpookedUntil?{ghostSpookedUntil:c.ghostSpookedUntil}:{}), value: c.mine ? 'mine' : c.number, ...(finished&&!c.revealed?{wasHidden:true}:{}), ...(c.silent?{silent:true}:{}), ...(c.clearedBy?{clearedBy:c.clearedBy,clearColor:c.clearColor,clearEvent:c.clearEvent,clearAt:c.clearAt,cascadeDepth:c.cascadeDepth||0}:{}), ...(c.mine&&c.mineOwner?{mineOwner:c.mineOwner}:{}) }
      : { revealed: false,...(c.ghostFlags?.length?{ghostFlags:c.ghostFlags.map(f=>({...f}))}:{}),...(c.ghostSpookedUntil?{ghostSpookedUntil:c.ghostSpookedUntil}:{}), flagged: Boolean(c.flags?.size), flagColors: [...(c.flags || [])].map(id => players.find(p => p.id === id)?.color).filter(Boolean), marks:(c.publicMarks||[]).map(m=>({...m})),...(c.electricOwner?{electrified:true,electricColor:players.find(p=>p.id===c.electricOwner)?.color}: {}) }),
  };
}

// This function accepts the same sanitized board a human sees. It cannot inspect hidden mines.
export function chooseBotMove(board, pick = randomInt) {
  const hidden = board.cells.map((c, i) => !c.revealed ? i : -1).filter(i => i >= 0);
  const knownMines = new Set(), safe = new Set();
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < board.cells.length; i++) {
      const cell = board.cells[i];
      if (!cell.revealed || typeof cell.value !== 'number') continue;
      const ns = neighbors(i, board.width, board.height);
      const known = ns.filter(n => knownMines.has(n) || board.cells[n].value === 'mine' && !board.cells[n].silent).length;
      const unknown = ns.filter(n => !board.cells[n].revealed && !knownMines.has(n) && !safe.has(n));
      if (unknown.length && cell.value - known === unknown.length) {
        for (const n of unknown) if (!knownMines.has(n)) { knownMines.add(n); changed = true; }
      } else if (cell.value === known) {
        for (const n of unknown) if (!safe.has(n)) { safe.add(n); changed = true; }
      }
    }
  }
  const safeChoices = [...safe].filter(i => !board.cells[i].flagged);
  const guesses = hidden.filter(i => !knownMines.has(i) && !board.cells[i].flagged);
  const choices = safeChoices.length ? safeChoices : guesses.length ? guesses : hidden;
  return { index: choices[pick(choices.length)], flag: [...knownMines].find(i => !board.cells[i].flagged) };
}
