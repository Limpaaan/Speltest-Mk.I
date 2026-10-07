import test from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { MAP } from '../shared/map.js';
import { createGameServer } from '../server/index.js';
async function server(t, options = {}) {
  const app = createGameServer(options);
  await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve));
  t.after(() => app.close());
  const port = app.server.address().port;
  return { app, url: `ws://127.0.0.1:${port}/ws`, http: `http://127.0.0.1:${port}` };
}
function message(ws, type) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      ws.off('message', handle);
      reject(new Error(`Timeout waiting for ${type}`));
    }, 2500);
    function handle(raw) {
      const msg = JSON.parse(raw);
      if (msg.type === type) {
        clearTimeout(timeout);
        ws.off('message', handle);
        resolve(msg);
      }
    }
    ws.on('message', handle);
  });
}
let userSequence = 0;
async function join(url, room = 'AVESTA', name = `Tester ${++userSequence}`) {
  const ws = new WebSocket(url);
  await new Promise((resolve, reject) => {
    ws.once('open', resolve);
    ws.once('error', reject);
  });
  const ready = message(ws, 'welcome');
  ws.send(JSON.stringify({ type: 'join', room, name, classId: 'stalvakt' }));
  const welcome = await ready;
  return { ws, ...welcome };
}
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
test('two players share authoritative state and another room is isolated', async (t) => {
  const { app, url, http } = await server(t);
  const a = await join(url),
    b = await join(url),
    c = await join(url, 'OTHER');
  const s = (await message(a.ws, 'state')).state;
  assert.equal(Object.keys(s.players).length, 2);
  assert.ok(s.players[b.id]);
  assert.equal(Object.keys(c.state.players).length, 1);
  const health = await (await fetch(`${http}/health`)).json();
  assert.equal(health.status, 'ok');
  assert.equal(health.rooms, 2);
  const start = s.players[a.id].z;
  a.ws.send(JSON.stringify({ type: 'input', input: { z: 999, x: 0, aim: 0 }, hp: 99999 }));
  await wait(220);
  const moved = (await message(b.ws, 'state')).state.players[a.id];
  assert.ok(moved.z > start);
  assert.ok(moved.z - start < 15);
  assert.ok(moved.hp <= 160);
  assert.equal(app.rooms.size, 2);
});
test('stale input stops movement and rooms are cleaned up after disconnect', async (t) => {
  const { app, url } = await server(t);
  const a = await join(url);
  a.ws.send(JSON.stringify({ type: 'input', input: { z: 1 } }));
  await wait(650);
  const first = (await message(a.ws, 'state')).state.players[a.id];
  await wait(150);
  const second = (await message(a.ws, 'state')).state.players[a.id];
  assert.equal(second.z, first.z);
  a.ws.close();
  await wait(80);
  assert.equal(app.rooms.size, 0);
});
test('invalid room, forged client state, wrong origin and malformed JSON are rejected', async (t) => {
  const { url, app } = await server(t);
  const ws = new WebSocket(url);
  await new Promise((r) => ws.on('open', r));
  const error = message(ws, 'error');
  ws.send(JSON.stringify({ type: 'join', room: '../../evil' }));
  assert.match((await error).message, /Rumskoden/);
  assert.equal(app.rooms.size, 0);
  ws.close();
  const a = await join(url);
  a.ws.send(JSON.stringify({ type: 'state', state: { players: { [a.id]: { hp: 99999 } } } }));
  assert.equal((await message(a.ws, 'state')).state.players[a.id].hp, 160);
  const closed = new Promise((resolve) => a.ws.once('close', resolve));
  a.ws.send('{invalid');
  assert.equal(await closed, 1008);
  const bad = new WebSocket(url, { origin: 'https://evil.example' });
  const result = await new Promise((resolve) => {
    bad.on('error', (e) => resolve(e.message));
  });
  assert.match(result, /403/);
});
test('room capacity is eight players', async (t) => {
  const { url } = await server(t);
  for (let i = 0; i < 8; i++) await join(url);
  const ws = new WebSocket(url);
  await new Promise((r) => ws.once('open', r));
  const error = message(ws, 'error');
  ws.send(JSON.stringify({ type: 'join', room: 'AVESTA', name: 'Nionde' }));
  assert.match((await error).message, /fullt/);
  ws.close();
});

test('malformed input shapes cannot crash a live session', async (t) => {
  const { url } = await server(t);
  const a = await join(url);
  for (const input of [null, 3, [], { x: null, z: {} }])
    a.ws.send(JSON.stringify({ type: 'input', input }));
  const result = await message(a.ws, 'state');
  assert.equal(result.state.players[a.id].hp, 160);
  assert.equal(result.state.players[a.id].x, MAP.spawn.x);
});

test('AdminL modifies a selected player while ordinary sockets cannot forge admin access', async (t) => {
  const { url } = await server(t);
  const a = await join(url, 'ADMIN', 'AdminL'),
    b = await join(url, 'ADMIN', 'Brovakten');
  let result = message(b.ws, 'admin_result');
  b.ws.send(
    JSON.stringify({
      type: 'admin',
      admin: true,
      actorId: a.id,
      action: { type: 'set_stats', targetId: b.id, stats: { level: 30 } },
    }),
  );
  assert.equal((await result).ok, false);
  result = message(a.ws, 'admin_result');
  a.ws.send(
    JSON.stringify({
      type: 'admin',
      action: { type: 'set_stats', targetId: b.id, stats: { level: 5, scrap: 500 } },
    }),
  );
  assert.equal((await result).ok, true);
  const state = (await message(b.ws, 'state')).state;
  assert.equal(state.players[b.id].level, 5);
  assert.equal(state.players[a.id].level, 1);
  const duplicate = new WebSocket(url);
  await new Promise((r) => duplicate.once('open', r));
  const rejected = message(duplicate, 'error');
  duplicate.send(JSON.stringify({ type: 'join', room: 'ADMIN', name: 'ADMINL' }));
  assert.match((await rejected).message, /redan/);
  duplicate.close();
});
