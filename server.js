import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import { GameService } from './lib/game.js';
import { ITEMS } from './lib/items.js';

const PUBLIC = new URL('./public/', import.meta.url);
const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/battle.js', ['battle.js', 'text/javascript; charset=utf-8']],
  ['/replay.js', ['replay.js', 'text/javascript; charset=utf-8']],
  ['/rules.pdf', ['../output/pdf/Sweep-Brawl-Rulebook-v080.pdf', 'application/pdf']],
  ['/audio.js', ['audio.js', 'text/javascript; charset=utf-8']],
  ['/theme.js', ['theme.js', 'text/javascript; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ['/favicon.svg', ['favicon.svg', 'image/svg+xml']],
]);

export function createApp() {
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws: wss:; img-src 'self' data:; media-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'");
    let pathname;
    try { pathname = new URL(req.url, 'http://localhost').pathname; } catch { res.writeHead(400); res.end(); return; }
    if (pathname === '/health') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"status":"ok"}'); return; }
    if (pathname === '/catalog' && req.method === 'GET') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(ITEMS)); return; }
    const file = files.get(pathname);
    if (!file || !['GET', 'HEAD'].includes(req.method)) { res.writeHead(404); res.end('Not found'); return; }
    try {
      const body = await readFile(new URL(file[0], PUBLIC));
      res.writeHead(200, { 'Content-Type': file[1], 'Cache-Control': 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch { res.writeHead(500); res.end('Unable to load the game'); }
  });
  const io = new Server(server, { maxHttpBufferSize: 4096, pingInterval: 20000, pingTimeout: 20000 });
  const game = new GameService({ emitState: (id, state) => io.to(id).emit('state', state),
    emitPrivate: (id, state) => io.to(id).emit('private-state', state),
    evict: (id, message) => { const s=io.sockets.sockets.get(id); if(s){s.emit('kicked',message);s.leave(s.data.roomCode);s.data={};} } });
  const interval = setInterval(() => game.tick(), 200);
  interval.unref();
  io.on('connection', socket => {
    let lastWindow = Date.now(), messages = 0;
    const guarded = handler => (input, ack) => {
      const respond = typeof ack === 'function' ? ack : () => {};
      try {
        if (Date.now() - lastWindow > 1000) { lastWindow = Date.now(); messages = 0; }
        if (++messages > 20) throw new Error('Slow down a little.');
        if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid request.');
        respond({ ok: true, ...handler(input) });
      } catch (error) { respond({ ok: false, error: error.message }); }
    };
    const enter = (input, create) => {
      if (socket.data.roomCode) throw new Error('Leave your current room first.');
      const { room, player } = create ? game.create(input, socket.id) : game.join(input, socket.id);
      if (player.replacedSocket) {
        const previous = io.sockets.sockets.get(player.replacedSocket);
        if (previous) { previous.emit('replaced'); previous.leave(room.code); previous.data = {}; }
        delete player.replacedSocket;
      }
      socket.data.roomCode = room.code; socket.data.playerId = player.id;
      socket.join(room.code); game.broadcast(room);
      return { code: room.code, playerId: player.id, token: player.token, state: game.snapshot(room,player.id) };
    };
    socket.on('create-room', guarded(input => enter(input, true)));
    socket.on('join-room', guarded(input => enter(input, false)));
    socket.on('action', guarded(input => {
      game.action(socket.data.roomCode, socket.data.playerId, socket.id, input);
      return {};
    }));
    socket.on('leave-room', (_, ack) => {
      game.disconnect(socket.id);
      if (socket.data.roomCode) socket.leave(socket.data.roomCode);
      socket.data = {};
      if (typeof ack === 'function') ack({ ok: true });
    });
    socket.on('disconnect', () => game.disconnect(socket.id));
  });
  server.on('close', () => clearInterval(interval));
  return { server, io, game, close: () => new Promise(resolve => { clearInterval(interval); io.close(resolve); }) };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { server } = createApp();
  const port = Number(process.env.PORT) || 3000;
  server.listen(port, '0.0.0.0', () => console.log(`Sweep Brawl is ready at http://localhost:${port}`));
}
