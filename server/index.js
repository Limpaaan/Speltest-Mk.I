import { adminAction, validateUsername } from '../shared/admin.js';
import packageInfo from '../package.json' with { type: 'json' };
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { createWorld, addPlayer, cleanInput, act, tick, snapshot } from '../shared/game.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};
export function createGameServer({
  production = false,
  allowedOrigin = process.env.ALLOWED_ORIGIN,
  maxRooms = 32,
} = {}) {
  const rooms = new Map();
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
    );
    const requestPath = new URL(req.url, 'http://localhost').pathname;
    if (requestPath === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(
        JSON.stringify({
          status: 'ok',
          version: packageInfo.version,
          rooms: rooms.size,
          tickRate: 20,
        }),
      );
    }
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405);
      return res.end();
    }
    if (!production) {
      res.writeHead(404);
      return res.end('Use the Vite development server on port 5173.');
    }
    try {
      const decoded = decodeURIComponent(requestPath);
      const file = path.resolve(root, `.${decoded === '/' ? '/index.html' : decoded}`);
      if (!file.startsWith(root + path.sep) || decoded.includes('\0')) {
        res.writeHead(403);
        return res.end();
      }
      const data = await readFile(file);
      res.writeHead(200, {
        'Content-Type': types[path.extname(file)] || 'application/octet-stream',
        'Cache-Control': decoded.startsWith('/assets/')
          ? 'public, max-age=31536000, immutable'
          : 'no-cache',
      });
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });
  const wss = new WebSocketServer({ noServer: true, maxPayload: 2048, perMessageDeflate: false });
  server.on('upgrade', (req, socket, head) => {
    const expected = allowedOrigin || `http://${req.headers.host}`;
    // Browser clients must use the same origin. Set ALLOWED_ORIGIN behind an HTTPS reverse proxy.
    if (
      req.url !== '/ws' ||
      (req.headers.origin && req.headers.origin !== expected) ||
      (allowedOrigin && req.headers.origin !== allowedOrigin) ||
      wss.clients.size >= 256
    ) {
      socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws));
  });
  function send(ws, data) {
    if (ws.readyState !== WebSocket.OPEN || ws.bufferedAmount >= 1_000_000) return false;
    ws.send(JSON.stringify(data));
    return true;
  }
  wss.on('connection', (ws) => {
    let room,
      playerId,
      stateAck = false,
      pendingSeq = null,
      nextSeq = 1,
      windowStart = Date.now(),
      count = 0,
      lastInput = Date.now();
    ws.sendSnapshot = (extra = {}) => {
      if (!room || (stateAck && pendingSeq !== null)) return;
      const seq = nextSeq;
      if (
        send(ws, {
          type: 'state',
          state: snapshot(room.world),
          ...(stateAck ? { seq } : {}),
          ...extra,
        }) &&
        stateAck
      ) {
        pendingSeq = seq;
        nextSeq++;
      }
    };
    const joinDeadline = setTimeout(() => {
      if (!room) ws.close(1008, 'Join timeout');
    }, 10000);
    joinDeadline.unref();
    ws.on('error', () => {});
    ws.on('message', (raw) => {
      const now = Date.now();
      if (now - windowStart > 1000) {
        windowStart = now;
        count = 0;
      }
      if (++count > 100) return ws.close(1008, 'Rate limit');
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return ws.close(1008, 'Invalid JSON');
      }
      if (!msg || typeof msg !== 'object' || Array.isArray(msg)) return;
      if (msg.type === 'join' && !room) {
        const code = typeof msg.room === 'string' ? msg.room.toUpperCase() : '';
        if (!/^[A-Z0-9-]{1,16}$/.test(code))
          return send(ws, {
            type: 'error',
            message: 'Rumskoden måste ha 1–16 bokstäver, siffror eller bindestreck.',
          });
        const username = validateUsername(msg.name);
        if (!username.ok) return send(ws, { type: 'error', message: username.error });
        if (!rooms.has(code)) {
          if (rooms.size >= maxRooms)
            return send(ws, { type: 'error', message: 'Servern är full.' });
          rooms.set(code, { world: createWorld({ pvp: true }), clients: new Map() });
        }
        const target = rooms.get(code);
        if (
          Object.values(target.world.players).some(
            (p) => p.name.toLocaleLowerCase('sv') === username.name.toLocaleLowerCase('sv'),
          )
        )
          return send(ws, { type: 'error', message: 'Namnet används redan i rummet.' });
        if (target.clients.size >= 8)
          return send(ws, { type: 'error', message: 'Rummet är fullt (8 spelare).' });
        room = target;
        playerId = randomUUID();
        room.clients.set(ws, playerId);
        addPlayer(room.world, playerId, username.name, msg.classId);
        clearTimeout(joinDeadline);
        stateAck = msg.stateAck === true;
        ws.sendSnapshot({ type: 'welcome', id: playerId, room: code });
      } else if (room && msg.type === 'state_ack') {
        if (stateAck && Number.isSafeInteger(msg.seq) && msg.seq === pendingSeq) pendingSeq = null;
      } else if (room && msg.type === 'input') {
        room.world.players[playerId].input = cleanInput(msg.input);
        lastInput = now;
      } else if (room && msg.type === 'action') act(room.world, playerId, msg.action);
      else if (room && msg.type === 'admin')
        send(ws, { type: 'admin_result', ...adminAction(room.world, playerId, msg.action) });
    });
    ws.staleInput = () => {
      if (room && Date.now() - lastInput > 500) room.world.players[playerId].input = cleanInput();
    };
    ws.on('close', () => {
      clearTimeout(joinDeadline);
      if (!room) return;
      room.clients.delete(ws);
      delete room.world.players[playerId];
      for (const [code, candidate] of rooms)
        if (candidate === room && !room.clients.size) rooms.delete(code);
    });
  });
  let ticks = 0;
  const timer = setInterval(() => {
    for (const ws of wss.clients) ws.staleInput?.();
    ticks++;
    for (const room of rooms.values()) {
      tick(room.world, 0.05);
      if (ticks % 2 === 0) for (const ws of room.clients.keys()) ws.sendSnapshot();
    }
  }, 50);
  timer.unref();
  return {
    server,
    rooms,
    async close() {
      clearInterval(timer);
      for (const ws of wss.clients) ws.terminate();
      await new Promise((resolve) => wss.close(resolve));
      if (server.listening) await new Promise((resolve) => server.close(resolve));
    },
  };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const app = createGameServer({ production: process.argv.includes('--production') });
  const port = Number(process.env.PORT || 3000),
    host = process.env.HOST || '0.0.0.0';
  app.server.listen(port, host, () =>
    console.log(`Avesta game server listening on ${host}:${port}`),
  );
  for (const signal of ['SIGINT', 'SIGTERM'])
    process.on(signal, async () => {
      await app.close();
      process.exit(0);
    });
}
