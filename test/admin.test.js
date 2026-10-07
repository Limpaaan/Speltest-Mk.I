import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, addPlayer, savePlayer, restorePlayer } from '../shared/game.js';
import { validateUsername, adminAction } from '../shared/admin.js';
test('names are mandatory, normalized and accept Swedish names', () => {
  for (const name of [undefined, '', 'a', 'x'.repeat(25), '<AdminL>'])
    assert.equal(validateUsername(name).ok, false);
  assert.equal(validateUsername('  A\u030Asbo  ').name, 'Åsbo');
});
function players() {
  const w = createWorld();
  addPlayer(w, 'a', 'AdminL', 'stalvakt');
  addPlayer(w, 'b', 'Dalmas', 'alvvakt');
  return w;
}
test('admin commands derive authority from the actor, not forged flags', () => {
  const w = players();
  const command = { type: 'set_stats', targetId: 'a', stats: { level: 30 }, admin: true };
  assert.equal(adminAction(w, 'b', command).ok, false);
  w.players.a.name = 'adminl';
  assert.equal(adminAction(w, 'a', command).ok, false);
  assert.equal(w.players.a.level, 1);
});
test('bounded admin loot and stats affect the selected player and survive offline saving', () => {
  const w = players();
  assert.equal(
    adminAction(w, 'a', {
      type: 'set_stats',
      targetId: 'b',
      stats: { level: 10, scrap: 1000, power: 4 },
    }).ok,
    true,
  );
  assert.equal(
    adminAction(w, 'a', { type: 'spawn_item', targetId: 'b', kind: 'scout', rarity: 3, level: 10 })
      .ok,
    true,
  );
  assert.equal(w.players.a.level, 1);
  assert.equal(w.players.b.inventory.at(-1).rarity, 3);
  const other = players();
  restorePlayer(other, other.players.b, savePlayer(w.players.b));
  assert.equal(other.players.b.level, 10);
});
test('invalid edits are atomic and cannot modify identity or arbitrary fields', () => {
  const w = players(),
    before = JSON.stringify(w.players.b);
  for (const stats of [{ level: 5, power: 999 }, { name: 'AdminL' }, { hp: 99999 }, { level: NaN }])
    assert.equal(adminAction(w, 'a', { type: 'set_stats', targetId: 'b', stats }).ok, false);
  assert.equal(JSON.stringify(w.players.b), before);
  assert.equal(adminAction(w, 'a', { type: 'heal', targetId: '__proto__' }).ok, false);
  assert.equal(
    adminAction(w, 'a', { type: 'spawn_item', kind: '__proto__', rarity: 3, level: 30 }).ok,
    false,
  );
});
