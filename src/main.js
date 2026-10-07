import { validateUsername, isAdmin, adminAction } from '../shared/admin.js';
import './style.css';
import { WorldView, drawMap } from './view.js';
import { MAP, inArena, inSanctuary } from '../shared/map.js';
import {
  CLASSES,
  RARITIES,
  RARITY_COLORS,
  WEAPONS,
  createWorld,
  addPlayer,
  tick,
  act,
  cleanInput,
  snapshot,
  maxHp,
  xpNeeded,
  savePlayer,
  restorePlayer,
} from '../shared/game.js';
const $ = (id) => document.getElementById(id);
let selected = 'stalvakt',
  mode = null,
  world = createWorld(),
  state = snapshot(world),
  myId = null,
  socket = null,
  roomName = '',
  view;
let elapsed = 0,
  last = performance.now(),
  accumulator = 0,
  sendClock = 0,
  hudClock = 0,
  saveClock = 0,
  inventorySignature = '';
let mouse = { x: innerWidth / 2, y: innerHeight / 2, down: false },
  keys = new Set(),
  expanded = false,
  storageWarning = false;
const dialogs = [$('inventory-dialog'), $('pause-dialog'), $('death-dialog'), $('admin-dialog')];
let adminRefresh = false,
  adminSignature = '';
function chosenName() {
  const result = validateUsername($('player-name').value);
  $('player-name').setAttribute('aria-invalid', String(!result.ok));
  if (!result.ok) {
    status(result.error);
    $('player-name').focus();
    return null;
  }
  return result.name;
}
const paused = () => dialogs.some((d) => d.open);
function resetInput() {
  keys.clear();
  mouse.down = false;
  if (world.players[myId]) world.players[myId].input = cleanInput();
  if (socket?.readyState === WebSocket.OPEN)
    socket.send(JSON.stringify({ type: 'input', input: cleanInput() }));
}
function status(message) {
  $('menu-status').textContent = message;
}
const symbols = ['▥', '♧', '◈', '≈'];
Object.entries(CLASSES).forEach(([id, c], i) => {
  const b = document.createElement('button');
  b.className = 'class-card';
  b.dataset.classId = id;
  b.setAttribute('aria-pressed', 'false');
  const icon = document.createElement('span');
  icon.className = 'symbol';
  icon.textContent = symbols[i];
  const name = document.createElement('strong');
  name.textContent = c.name;
  b.append(icon, name);
  b.onclick = () => {
    selected = id;
    renderClasses();
  };
  $('classes').append(b);
});
function renderClasses() {
  for (const b of $('classes').children) {
    const active = b.dataset.classId === selected;
    b.classList.toggle('active', active);
    b.setAttribute('aria-pressed', String(active));
  }
  const c = CLASSES[selected];
  $('class-detail').textContent = `${c.subtitle}. ${c.description}`;
}
renderClasses();
try {
  view = new WorldView($('scene'));
} catch (error) {
  console.error(error);
  status('3D-grafik kunde inte starta. Aktivera WebGL i en modern datorwebbläsare.');
  $('play-offline').disabled = $('play-online').disabled = true;
}
function loadSave() {
  try {
    const raw = localStorage.getItem(`avesta-save-v1-${selected}`);
    if (raw) restorePlayer(world, world.players[myId], JSON.parse(raw));
  } catch {
    storageWarning = true;
  }
}
function persist() {
  if (mode !== 'offline' || !world.players[myId]) return;
  try {
    localStorage.setItem(
      `avesta-save-v1-${world.players[myId].classId}`,
      JSON.stringify(savePlayer(world.players[myId])),
    );
  } catch {
    storageWarning = true;
  }
}
function enter() {
  document.body.classList.add('playing');
  $('menu').hidden = true;
  $('hud').hidden = false;
  resetInput();
  accumulator = 0;
  inventorySignature = '';
  updateHUD();
}
function leave(message) {
  persist();
  const old = socket;
  socket = null;
  if (old) old.close();
  mode = null;
  myId = null;
  dialogs.forEach((d) => d.close());
  document.body.classList.remove('playing');
  $('menu').hidden = false;
  $('hud').hidden = true;
  resetInput();
  world = createWorld();
  state = snapshot(world);
  $('play-online').disabled = false;
  status(message || 'Skiftet är avslutat. Offlineframsteg sparas per klass på den här enheten.');
}
$('play-offline').onclick = () => {
  const name = chosenName();
  if (!name) return;
  const pending = socket;
  socket = null;
  pending?.close();
  $('play-online').disabled = false;
  mode = 'offline';
  world = createWorld();
  myId = 'local';
  addPlayer(world, myId, name, selected);
  loadSave();
  state = snapshot(world);
  enter();
};
$('play-online').onclick = () => {
  const name = chosenName();
  if (!name) return;
  const room = $('room-code').value.trim().toUpperCase();
  if (!/^[A-Z0-9-]{1,16}$/.test(room))
    return status('Ange en rumskod med 1–16 bokstäver, siffror eller bindestreck.');
  $('play-online').disabled = true;
  status('Ansluter till skiftets server …');
  const ws = new WebSocket(
    `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws`,
  );
  socket = ws;
  const timeout = setTimeout(() => {
    if (socket === ws && mode !== 'online') {
      socket = null;
      ws.close();
      $('play-online').disabled = false;
      status('Servern svarade inte. Starta spelservern eller välj offline.');
    }
  }, 8000);
  ws.onopen = () => ws.send(JSON.stringify({ type: 'join', room, name, classId: selected }));
  ws.onmessage = (event) => {
    if (socket !== ws) return;
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }
    if (msg.type === 'welcome') {
      clearTimeout(timeout);
      mode = 'online';
      state = msg.state;
      myId = msg.id;
      roomName = msg.room;
      enter();
    } else if (msg.type === 'state') {
      state = msg.state;
      if (adminRefresh) {
        adminRefresh = false;
        renderAdmin(true);
      }
    } else if (msg.type === 'admin_result') {
      $('admin-status').textContent = msg.message;
      adminRefresh = msg.ok;
    } else if (msg.type === 'error') {
      clearTimeout(timeout);
      leave(msg.message);
    }
  };
  ws.onclose = () => {
    clearTimeout(timeout);
    if (socket === ws)
      leave(
        'Anslutningen bröts. Multiplayerframsteg gäller bara den aktuella sessionen. Du kan ansluta igen eller spela offline.',
      );
  };
  ws.onerror = () => {
    if (socket === ws) status('Servern kan inte nås. Offline fungerar utan spelserver.');
  };
};
function action(action) {
  if (mode === 'offline') {
    act(world, myId, action);
    state = snapshot(world);
  } else if (socket?.readyState === WebSocket.OPEN)
    socket.send(JSON.stringify({ type: 'action', action }));
}
function openDialog(dialog) {
  if (!mode || $('death-dialog').open) return;
  dialogs.forEach((d) => d.close());
  resetInput();
  dialog.showModal();
  if (dialog === $('inventory-dialog')) renderInventory();
  if (dialog === $('admin-dialog')) renderAdmin(true);
}
function pause() {
  if (!mode) return;
  if (paused()) {
    dialogs.forEach((d) => {
      if (d !== $('death-dialog')) d.close();
    });
    return;
  }
  $('pause-info').textContent =
    mode === 'offline'
      ? 'Offlinespelet är pausat. Dina framsteg sparas automatiskt.'
      : 'Multiplayer fortsätter medan menyn är öppen. Sök skydd innan du tar en paus.';
  $('pvp-toggle').hidden = mode !== 'online';
  openDialog($('pause-dialog'));
}
$('pause-button').onclick = pause;
$('resume').onclick = () => {
  $('pause-dialog').close();
  resetInput();
};
$('leave').onclick = () => leave();
$('inventory-button').onclick = () => openDialog($('inventory-dialog'));
$('respawn').onclick = () => {
  action({ type: 'respawn' });
  $('death-dialog').close();
  resetInput();
};
$('pvp-toggle').onclick = () => {
  action({ type: 'pvp' });
};
$('talent-power').onclick = () => {
  action({ type: 'talent', stat: 'power' });
  renderInventory();
};
$('talent-vitality').onclick = () => {
  action({ type: 'talent', stat: 'vitality' });
  renderInventory();
};
for (const b of document.querySelectorAll('.close-dialog'))
  b.onclick = () => {
    b.closest('dialog').close();
    resetInput();
  };
$('death-dialog').addEventListener('cancel', (e) => e.preventDefault());
for (const d of dialogs) d.addEventListener('close', resetInput);
window.addEventListener('keydown', (e) => {
  if (!mode || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
  const k = e.key.toLowerCase();
  if (
    [
      'w',
      'a',
      's',
      'd',
      ' ',
      'arrowup',
      'arrowdown',
      'arrowleft',
      'arrowright',
      'escape',
      'i',
      'm',
    ].includes(k)
  )
    e.preventDefault();
  if (e.repeat) return;
  if (k === 'escape') {
    pause();
    return;
  }
  if (k === 'f2') {
    e.preventDefault();
    if (isAdmin(state.players[myId])) {
      if ($('admin-dialog').open) $('admin-dialog').close();
      else openDialog($('admin-dialog'));
    }
    return;
  }
  if (k === 'i') {
    if ($('inventory-dialog').open) $('inventory-dialog').close();
    else if (!paused()) openDialog($('inventory-dialog'));
    return;
  }
  if (paused()) return;
  keys.add(k);
  if (k === 'q') action({ type: 'ability' });
  if (k === 'e') action({ type: 'loot' });
  if (k === 'r') action({ type: 'reload' });
  if (k === 'h') action({ type: 'heal' });
  if (k === 'm') {
    expanded = !expanded;
    document.querySelector('.map-panel').classList.toggle('expanded', expanded);
    $('minimap').width = $('minimap').height = expanded ? 700 : 260;
    drawMap($('minimap'), state, myId, expanded);
  }
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', resetInput);
window.addEventListener('pointermove', (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  $('crosshair').style.left = `${e.clientX}px`;
  $('crosshair').style.top = `${e.clientY}px`;
});
$('scene').addEventListener('pointerdown', (e) => {
  if (e.button === 0 && mode && !paused()) mouse.down = true;
});
window.addEventListener('pointerup', () => (mouse.down = false));
window.addEventListener('beforeunload', persist);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    persist();
    resetInput();
    if (mode === 'offline' && !paused()) pause();
  }
});
function renderInventory() {
  const p = state.players[myId];
  if (!p) return;
  const signature = JSON.stringify([
    p.inventory,
    p.weapon.id,
    p.points,
    p.power,
    p.vitality,
    p.scrap,
  ]);
  if (signature === inventorySignature) return;
  inventorySignature = signature;
  $('inventory-stats').textContent =
    `${p.scrap} skrot · ${p.points} talangpoäng · Eldkraft ${p.power} · Livskraft ${p.vitality} · ${p.inventory.length}/16 platser`;
  $('talent-power').disabled = $('talent-vitality').disabled = p.points <= 0;
  $('inventory-items').replaceChildren();
  for (const item of p.inventory) {
    const row = document.createElement('div');
    row.className = 'inventory-item';
    const desc = document.createElement('div');
    desc.className = 'item-description';
    const title = document.createElement('h3');
    title.textContent = item.name;
    title.style.color = RARITY_COLORS[item.rarity];
    const info = document.createElement('p');
    info.textContent = `${RARITIES[item.rarity]} · Nivå ${item.level} · ${item.damage + p.power * 3} skada · ${WEAPONS[item.kind].range} m`;
    desc.append(title, info);
    const equip = document.createElement('button');
    equip.className = 'small-button';
    equip.textContent = p.weapon.id === item.id ? 'UTRUSTAD' : 'UTRUSTA';
    equip.disabled = p.weapon.id === item.id;
    equip.onclick = () => {
      action({ type: 'equip', id: item.id });
      renderInventory();
    };
    const scrap = document.createElement('button');
    scrap.className = 'small-button';
    scrap.textContent = 'SKROTA';
    scrap.disabled = p.weapon.id === item.id;
    scrap.onclick = () => {
      action({ type: 'salvage', id: item.id });
      renderInventory();
    };
    row.append(desc, equip, scrap);
    $('inventory-items').append(row);
  }
}
function updateHUD() {
  const p = state.players[myId];
  if (!p || !mode) return;
  const c = CLASSES[p.classId];
  $('session').textContent =
    mode === 'offline'
      ? 'OFFLINE / ENSAM PÅ SKIFTET'
      : `RUM ${roomName} / ${Object.keys(state.players).length} AV 8 SPELARE`;
  $('admin-open').hidden = !isAdmin(p);
  if ($('admin-dialog').open) renderAdmin();
  $('player-class').textContent = c.name.toUpperCase();
  $('level').textContent = `NIVÅ ${p.level}`;
  $('health-fill').style.width = `${(p.hp / maxHp(p)) * 100}%`;
  $('health-text').textContent = `${Math.ceil(p.hp)} / ${maxHp(p)} HÄLSA`;
  $('xp-text').textContent = `${p.xp} / ${xpNeeded(p)} XP`;
  $('xp-fill').style.width = `${(p.xp / xpNeeded(p)) * 100}%`;
  $('ability-name').textContent = c.ability;
  $('ability-cooldown').textContent =
    p.abilityCooldown > 0 ? `${Math.ceil(p.abilityCooldown)} s` : 'REDO';
  $('weapon-name').textContent = p.weapon.name;
  $('weapon-rarity').textContent = RARITIES[p.weapon.rarity].toUpperCase();
  $('weapon-rarity').style.color = RARITY_COLORS[p.weapon.rarity];
  $('ammo').textContent = p.reload > 0 ? '↻' : p.ammo;
  $('ammo-max').textContent =
    p.reload > 0 ? `${p.reload.toFixed(1)} s` : `/ ${WEAPONS[p.weapon.kind].mag}`;
  const message = storageWarning
    ? 'Lokal lagring är blockerad. Framsteg kan inte sparas på den här enheten.'
    : state.time < p.messageUntil
      ? p.message
      : '';
  $('notification').textContent = message;
  const nearby = state.loot.find((l) => l.owner === myId && Math.hypot(l.x - p.x, l.z - p.z) < 12);
  $('interact').textContent = inSanctuary(p)
    ? 'WASD · Lämna samlingsplatsen för att inleda strid'
    : nearby
      ? `E · Bärga ${RARITIES[nearby.weapon.rarity].toLowerCase()} ${nearby.weapon.name}`
      : '';
  const place = [...MAP.places].sort(
    (a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z),
  )[0];
  $('zone').textContent = inSanctuary(p)
    ? 'SAMLINGSPLATS · SKYDDAD ZON'
    : inArena(p)
      ? `SKOGSBO ARENA · ${mode === 'online' && p.pvp ? 'PVP AKTIVT' : 'PVP AV'}`
      : `${place.name.toUpperCase()} · ${mode === 'online' ? 'SAMARBETE' : 'ENSAMSPEL'}`;
  $('quest-list').replaceChildren();
  for (const [label, value, target] of [
    ['Håll skiftet', p.kills, 5],
    ['Bärga brukets arv', p.pickups, 3],
    ['Besegra en boss', p.bosses, 1],
  ]) {
    const line = document.createElement('div');
    line.className = `quest-line${value >= target ? ' done' : ''}`;
    const a = document.createElement('span');
    a.textContent = label;
    const b = document.createElement('b');
    b.textContent = value >= target ? 'KLART ✓' : `${value} / ${target}`;
    line.append(a, b);
    $('quest-list').append(line);
  }
  $('pvp-toggle').textContent = p.pvp ? 'AVAKTIVERA PVP' : 'AKTIVERA PVP I SKOGSBO';
  $('leave').textContent =
    mode === 'offline' ? 'SPARA & LÄMNA SKIFTET' : 'LÄMNA MULTIPLAYERSKIFTET';
  if (p.hp > 0 && $('death-dialog').open) $('death-dialog').close();
  if (p.hp <= 0 && !$('death-dialog').open) {
    dialogs.forEach((d) => d.close());
    resetInput();
    $('death-dialog').showModal();
  }
  if ($('inventory-dialog').open) renderInventory();
  drawMap($('minimap'), state, myId, expanded);
}
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  elapsed += dt;
  accumulator += dt;
  sendClock += dt;
  hudClock += dt;
  saveClock += dt;
  const p = state.players[myId];
  if (mode && p) {
    const input = paused()
      ? cleanInput()
      : cleanInput({
          x:
            Number(keys.has('d') || keys.has('arrowright')) -
            Number(keys.has('a') || keys.has('arrowleft')),
          z:
            Number(keys.has('s') || keys.has('arrowdown')) -
            Number(keys.has('w') || keys.has('arrowup')),
          aim: view.aim(mouse.x, mouse.y, p),
          fire: mouse.down,
        });
    if (mode === 'offline') {
      world.players[myId].input = input;
      while (accumulator >= 0.05) {
        if (!paused()) tick(world, 0.05);
        accumulator -= 0.05;
      }
      state = snapshot(world);
    } else if (sendClock >= 0.05 && socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'input', input }));
      sendClock = 0;
    }
    if (hudClock > 0.1) {
      updateHUD();
      hudClock = 0;
    }
    if (saveClock > 5) {
      persist();
      saveClock = 0;
    }
  }
  if (!mode || mode === 'online') accumulator = 0;
  view?.render(state, myId, dt, Boolean(mode), elapsed);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
if (import.meta.env.PROD && 'serviceWorker' in navigator)
  navigator.serviceWorker
    .register('/sw.js')
    .then(() => navigator.serviceWorker.ready)
    .then(() => {
      if (!mode)
        status(
          'Offlineklienten är installerad. Starta solo utan internet; framsteg sparas per klass.',
        );
    })
    .catch(() => {
      if (!mode)
        status('Solo fungerar utan spelserver. Full offlineladdning kräver HTTPS eller localhost.');
    });

function renderAdmin(refresh = false) {
  if (!isAdmin(state.players[myId])) return;
  const players = Object.values(state.players),
    signature = JSON.stringify(players.map((p) => [p.id, p.name]));
  if (signature !== adminSignature) {
    adminSignature = signature;
    const previous = $('admin-target').value;
    $('admin-target').replaceChildren();
    for (const p of players) {
      const option = document.createElement('option');
      option.value = p.id;
      option.textContent = p.name + (p.id === myId ? ' (du)' : '');
      $('admin-target').append(option);
    }
    $('admin-target').value = state.players[previous] ? previous : myId;
    refresh = true;
  }
  const target = state.players[$('admin-target').value];
  if (refresh && target) {
    for (const key of ['level', 'xp', 'hp', 'scrap', 'power', 'vitality', 'points'])
      $(`admin-${key}`).value = Math.floor(target[key]);
    $('admin-item-level').value = target.level;
  }
}
function sendAdmin(command) {
  if (!isAdmin(state.players[myId])) return;
  if (mode === 'offline') {
    const result = adminAction(world, myId, command);
    state = snapshot(world);
    $('admin-status').textContent = result.message;
    if (result.ok) {
      persist();
      renderAdmin(true);
      updateHUD();
    }
  } else if (socket?.readyState === WebSocket.OPEN)
    socket.send(JSON.stringify({ type: 'admin', action: command }));
}
$('admin-open').onclick = () => openDialog($('admin-dialog'));
$('admin-target').onchange = () => renderAdmin(true);
$('admin-item-form').onsubmit = (e) => {
  e.preventDefault();
  sendAdmin({
    type: 'spawn_item',
    targetId: $('admin-target').value,
    kind: $('admin-item-kind').value,
    rarity: Number($('admin-item-rarity').value),
    level: Number($('admin-item-level').value),
  });
};
$('admin-stats-form').onsubmit = (e) => {
  e.preventDefault();
  const stats = {};
  for (const key of ['level', 'xp', 'hp', 'scrap', 'power', 'vitality', 'points'])
    stats[key] = Number($(`admin-${key}`).value);
  sendAdmin({ type: 'set_stats', targetId: $('admin-target').value, stats });
};
$('admin-heal').onclick = () => sendAdmin({ type: 'heal', targetId: $('admin-target').value });
