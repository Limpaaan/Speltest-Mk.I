import { icon, iconLabel } from './icons.js';
import { wallet, directory, NPC_SERVICES } from './pack-ui.js';
import { VoiceTranscript } from './transcript.js';
import { PROFESSIONS } from './humans.js';
import { GameAudio } from './audio.js';
import { daylight } from '../shared/daylight.js';
import { CLASS_SKILLS } from '../shared/class-skills.js';
import { nearbyStory, EPILOGUE, campaignTarget } from '../shared/story.js';
import { renderJournal, objectiveText } from './journal.js';
import { PAINTS } from '../shared/artist.js';
import { artistPanel } from './artist-ui.js';
import { equipmentPanel, marketPanel } from './equipment-ui.js';
import { WEAPON_RECIPES, hasMaterials, lootName, MATERIALS, ATTACHMENTS } from '../shared/items.js';
import { nearbyCache, recipeText } from '../shared/economy.js';
import { canEquip, armorLimit, BRANCH_ABILITIES, SPECIALTIES } from '../shared/talents.js';
import { DEFAULT_SETTINGS, SETTINGS_KEY, normalizeSettings, readSettings } from './settings.js';
import {
  CAMP,
  NPCS,
  nearbyNpc,
  craftCost,
  CONTRACTS,
  RECIPES,
  armorCost,
  atCamp,
  campaignStatus,
} from '../shared/progression.js';
import { validateUsername, isAdmin, adminAction } from '../shared/admin.js';
import './style.css';
import { WorldView, drawMap } from './view.js';
import { MAP, inArena, inSanctuary, clearShot, HUB } from '../shared/map.js';
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
  weaponStats,
  savePlayer,
  restorePlayer,
} from '../shared/game.js';
const configuredServer = import.meta.env.VITE_GAME_SERVER_URL || '';
const multiplayerAvailable =
  import.meta.env.VITE_STATIC_HOST !== 'true' || Boolean(configuredServer);
const $ = (id) => document.getElementById(id);
const audio = new GameAudio($('speech-caption'));
audio.transcript = new VoiceTranscript(
  ['camp-transcript', 'npc-transcript', 'journal-transcript'].map($),
);
let guideTarget = null;
let currentNpc = null,
  spokenCampKey = '';
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
let mouse = { down: false, ads: false },
  look = { yaw: Math.PI, pitch: 0 },
  crouch = false,
  renderClock = 0,
  releasingMouse = false,
  hadPointerLock = false,
  keys = new Set(),
  expanded = false,
  storageWarning = false;
const dialogs = [...document.querySelectorAll('dialog')];
let settings;
try {
  settings = readSettings(localStorage);
} catch {
  settings = { ...DEFAULT_SETTINGS };
}
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
  mouse.ads = false;
  if (world.players[myId]) world.players[myId].input = cleanInput();
  if (socket?.readyState === WebSocket.OPEN)
    socket.send(JSON.stringify({ type: 'input', input: cleanInput() }));
}
function status(message) {
  $('menu-status').textContent = message;
}
const symbols = ['▥', '♧', '◈', '≈', '✚', '⚙'];
Object.entries(CLASSES).forEach(([id, c], i) => {
  const b = document.createElement('button');
  b.className = 'class-card';
  b.dataset.classId = id;
  b.setAttribute('aria-pressed', 'false');
  const icon = document.createElement('span');
  icon.className = 'symbol';
  icon.textContent = symbols[i];
  icon.setAttribute('aria-hidden', 'true');
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
  $('class-detail').textContent =
    `${c.subtitle}. Yrkesbakgrund: ${PROFESSIONS[selected]}. ${c.description} Taktisk talang: ${CLASS_SKILLS[selected][2][0]}. Fart ${c.speed} · ${c.hp} hälsa. Specialvapen: ${SPECIALTIES[selected].map((k) => WEAPONS[k].name).join(', ')} (snabbare omladdning). ${['stalvakt', 'bruksingenjor'].includes(selected) ? 'Tung klass: kulspruta och rustning 3 från början.' : 'Kulspruta och rustning 3 kräver talanger.'}`;
}
renderClasses();
try {
  view = new WorldView($('scene'), settings);
} catch (error) {
  console.error(error);
  status('3D-grafik kunde inte starta. Aktivera WebGL i en modern datorwebbläsare.');
  $('play-offline').disabled = $('play-online').disabled = true;
}
function loadSave() {
  try {
    const raw = localStorage.getItem(`avesta-save-v1-${selected}`);
    if (raw) {
      const saved = JSON.parse(raw);
      restorePlayer(world, world.players[myId], saved);
      if (Number.isFinite(saved.dayTime) && saved.dayTime >= 0)
        world.dayTime = saved.dayTime % 2400;
    }
  } catch {
    storageWarning = true;
  }
}
function persist() {
  if (mode !== 'offline' || !world.players[myId]) return;
  try {
    localStorage.setItem(
      `avesta-save-v1-${world.players[myId].classId}`,
      JSON.stringify({ ...savePlayer(world.players[myId]), dayTime: world.dayTime }),
    );
  } catch {
    storageWarning = true;
  }
}
function enter() {
  audio.reset();
  view?.cameraTrack.reset();
  look = { yaw: Math.PI, pitch: 0 };
  crouch = false;
  document.body.classList.add('playing');
  $('menu').hidden = true;
  $('hud').hidden = false;
  resetInput();
  accumulator = 0;
  inventorySignature = '';
  updateHUD();
}
function leave(message) {
  audio.stop();
  persist();
  const old = socket;
  socket = null;
  if (old) old.close();
  mode = null;
  releaseMouse();
  myId = null;
  dialogs.forEach((d) => d.close());
  document.body.classList.remove('playing');
  $('menu').hidden = false;
  $('hud').hidden = true;
  resetInput();
  world = createWorld();
  state = snapshot(world);
  $('play-online').disabled = !multiplayerAvailable;
  status(message || 'Skiftet är avslutat. Offlineframsteg sparas per klass på den här enheten.');
}
$('play-offline').onclick = () => {
  const name = chosenName();
  if (!name) return;
  audio.unlock();
  const pending = socket;
  socket = null;
  pending?.close();
  $('play-online').disabled = !multiplayerAvailable;
  mode = 'offline';
  world = createWorld();
  myId = 'local';
  addPlayer(world, myId, name, selected);
  loadSave();
  state = snapshot(world);
  enter();
  captureMouse();
};
$('play-online').onclick = () => {
  if (!multiplayerAvailable) return;
  const name = chosenName();
  if (!name) return;
  audio.unlock();
  const room = $('room-code').value.trim().toUpperCase();
  if (!/^[A-Z0-9-]{1,16}$/.test(room))
    return status('Ange en rumskod med 1–16 bokstäver, siffror eller bindestreck.');
  $('play-online').disabled = true;
  status(
    configuredServer
      ? 'Ansluter … en vilande gratisserver kan behöva upp till 90 sekunder för att starta.'
      : 'Ansluter till skiftets server …',
  );
  const ws = new WebSocket(
    configuredServer || `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws`,
  );
  socket = ws;
  const timeout = setTimeout(
    () => {
      if (socket === ws && mode !== 'online') {
        socket = null;
        ws.close();
        $('play-online').disabled = !multiplayerAvailable;
        status('Servern svarade inte. Starta spelservern eller välj offline.');
      }
    },
    configuredServer ? 90000 : 8000,
  );
  ws.onopen = () =>
    ws.send(JSON.stringify({ type: 'join', room, name, classId: selected, stateAck: true }));
  ws.onmessage = (event) => {
    if (socket !== ws) return;
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }
    if ((msg.type === 'welcome' || msg.type === 'state') && Number.isSafeInteger(msg.seq))
      ws.send(JSON.stringify({ type: 'state_ack', seq: msg.seq }));
    if (msg.type === 'welcome') {
      clearTimeout(timeout);
      mode = 'online';
      state = msg.state;
      myId = msg.id;
      roomName = msg.room;
      enter();
    } else if (msg.type === 'state') {
      state = msg.state;
      $('session').textContent =
        `RUM ${roomName} / ${Object.keys(state.players).length} AV 8 SPELARE`;
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
  releaseMouse();
  dialog.showModal();
  if (dialog === $('inventory-dialog')) renderInventory();
  if (dialog === $('admin-dialog')) renderAdmin(true);
  if (dialog === $('camp-dialog')) {
    spokenCampKey = '';
    renderCamp();
  }
  if (dialog === $('journal-dialog')) renderJournal($('journal-content'), state.players[myId]);
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
  captureMouse();
};
$('leave').onclick = () => leave();
$('journal-button').onclick = () => openDialog($('journal-dialog'));
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
for (const d of [$('camp-dialog'), $('npc-dialog')])
  d.addEventListener('close', () => audio.stopVoice());
for (const b of document.querySelectorAll('.stop-voice')) b.onclick = () => audio.stopVoice();
$('npc-listen').onclick = () => {
  audio.unlock().then(() => {
    if (currentNpc) audio.speak(`npc-${currentNpc.id}`);
  });
};
$('quest-listen').onclick = () => {
  audio.unlock().then(() => {
    const p = state.players[myId],
      c = CONTRACTS[p?.campaign.step];
    if (c) audio.speak(`brief-${c.id}`);
    else audio.speak('debrief-kopparhjarta');
  });
};
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
  if (k === 'j') {
    if ($('journal-dialog').open) $('journal-dialog').close();
    else if (!paused()) openDialog($('journal-dialog'));
    return;
  }
  if (k === 'i') {
    if ($('inventory-dialog').open) $('inventory-dialog').close();
    else if (!paused()) openDialog($('inventory-dialog'));
    return;
  }
  if (paused() || !pointerLocked()) return;
  keys.add(k);
  if (k === 'c') crouch = !crouch;
  if (k === 'b') action({ type: 'spray' });
  if (k === 'x') action({ type: 'tactical' });
  if (k === 'z') action({ type: 'special' });
  if (k === 'l') action({ type: 'flashlight' });
  if (k === 'q') action({ type: 'ability' });
  if (k === 'e') {
    const npc = nearbyNpc(state.players[myId]);
    if (npc) openNpc(npc);
    else if (atCamp(state.players[myId])) openDialog($('camp-dialog'));
    else if (nearbyStory(state.players[myId])) action({ type: 'story' });
    else if (nearbyCache(state.players[myId])) action({ type: 'search' });
    else action({ type: 'loot' });
  }
  if (k === 'g') action({ type: 'grenade' });
  if (k === 'r') action({ type: 'reload' });
  if (k === 'h') action({ type: 'heal' });
  if (k === 'm') {
    expanded = !expanded;
    document.querySelector('.map-panel').classList.toggle('expanded', expanded);
    $('minimap').width = $('minimap').height = expanded ? 700 : 260;
    drawMap($('minimap'), state, myId, expanded, guideTarget);
  }
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', resetInput);
const pointerLocked = () => document.pointerLockElement === $('scene');
function releaseMouse() {
  if (pointerLocked()) {
    releasingMouse = true;
    document.exitPointerLock();
  }
}
function captureMouse() {
  if (mode && !paused())
    $('scene')
      .requestPointerLock()
      ?.catch?.(() => updateCaptureHint());
}
function updateCaptureHint() {
  $('capture-mouse').hidden = !mode || paused() || pointerLocked();
}
$('capture-mouse').onclick = captureMouse;
for (const d of dialogs) d.addEventListener('close', updateCaptureHint);
window.addEventListener('mousemove', (e) => {
  if (!mode || paused() || !pointerLocked()) return;
  const sensitivity = 0.0022 * settings.sensitivity * (mouse.ads ? settings.adsSensitivity : 1);
  look.yaw -= e.movementX * sensitivity;
  look.pitch = Math.max(-1.45, Math.min(1.45, look.pitch - e.movementY * sensitivity));
});
$('scene').addEventListener('mousedown', (e) => {
  if (!mode || paused()) return;
  if (!pointerLocked()) {
    captureMouse();
    return;
  }
  if (e.button === 0) mouse.down = true;
  if (e.button === 2) mouse.ads = true;
});
window.addEventListener('mouseup', (e) => {
  if (e.button === 0) mouse.down = false;
  if (e.button === 2) mouse.ads = false;
});
$('scene').addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('pointerlockchange', () => {
  const locked = pointerLocked();
  if (locked) $('scene').focus({ preventScroll: true });
  if (hadPointerLock && !locked) {
    resetInput();
    if (mode && !paused() && !releasingMouse) pause();
  }
  releasingMouse = false;
  hadPointerLock = locked;
  updateCaptureHint();
});
document.addEventListener('pointerlockerror', updateCaptureHint);
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
    p.armor,
    p.paint,
    p.paintColor,
    p.paintMotif,
    p.materials,
    p.attachments,
    p.supplies,
    p.skills,
    p.credits,
    p.level,
    p.reload > 0,
  ]);
  if (signature === inventorySignature) return;
  inventorySignature = signature;
  wallet($('inventory-wallet'), p);
  $('inventory-stats').textContent =
    `${p.points} talangpoäng · Eldkraft ${p.power} · Livskraft ${p.vitality} · Rustning ${p.armor || 0}/${armorLimit(p)}`;
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
    const stats = weaponStats({ ...p, weapon: item });
    info.textContent = `${RARITIES[item.rarity]} · Nivå ${item.level} · ${stats.damage.toFixed(1)} skada · ${stats.range} m · ${stats.mag} patroner · ${stats.reload.toFixed(2)} s omladdning`;
    desc.append(title, info);
    const equip = document.createElement('button');
    equip.className = 'small-button';
    equip.textContent = p.weapon.id === item.id ? 'UTRUSTAD' : 'UTRUSTA';
    equip.disabled = p.weapon.id === item.id || !canEquip(p, item.kind);
    if (!canEquip(p, item.kind)) equip.textContent = 'KRÄVER TUNG TRÄNING';
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
    row.dataset.weapon = item.kind;
    row.append(icon(item.kind), desc, equip, scrap);
    $('inventory-items').append(row);
  }
  equipmentPanel($('equipment-panel'), p, (a) => {
    action(a);
    inventorySignature = '';
    renderInventory();
  });
}
function updateHUD() {
  const p = state.players[myId];
  if (!p || !mode) return;
  wallet($('hud-wallet'), p, true);
  if ($('weapon-icon').dataset.kind !== p.weapon.kind) {
    $('weapon-icon').replaceChildren(icon(p.weapon.kind));
    $('weapon-icon').dataset.kind = p.weapon.kind;
  }
  if (guideTarget && Math.hypot(guideTarget.x - p.x, guideTarget.z - p.z) < 4) guideTarget = null;
  $('guide-hint').textContent = guideTarget
    ? `→ ${guideTarget.name} · ${NPC_SERVICES[guideTarget.id].place} · ${Math.round(Math.hypot(guideTarget.x - p.x, guideTarget.z - p.z))} m`
    : inSanctuary(p)
      ? 'SKIFTGÅRDEN · E pratar · J visar stationer'
      : '';
  if ($('journal-dialog').open) directory($('journal-directory'), HUB.stations, p, guideTo);
  const c = CLASSES[p.classId];
  $('session').textContent =
    mode === 'offline'
      ? 'OFFLINE / ENSAM PÅ SKIFTET'
      : `RUM ${roomName} / ${Object.keys(state.players).length} AV 8 SPELARE`;
  updateCaptureHint();
  $('compass').textContent =
    `${Math.round((((180 - (look.yaw * 180) / Math.PI) % 360) + 360) % 360)}° · ${daylight(state.dayTime ?? state.time).label}`;
  $('stance').textContent = p.crouch ? 'HUKANDE' : p.sprinting ? 'SPRINGER' : 'STÅENDE';
  $('stamina').textContent = `UTHÅLLIGHET ${Math.ceil(p.stamina ?? 100)}`;
  $('admin-open').hidden = !isAdmin(p);
  if ($('admin-dialog').open) renderAdmin();
  if ($('camp-dialog').open) renderCamp();
  if ($('journal-dialog').open) renderJournal($('journal-content'), p);
  if ($('npc-dialog').open) {
    updateNpcService(p);
    $('npc-message').textContent = state.time < p.messageUntil ? p.message : '';
    if (!$('npc-market').hidden) marketPanel($('npc-market'), p, action);
    if (!$('artist-panel').hidden) artistPanel($('artist-panel'), p, action);
  }
  const contract = campaignStatus(p);
  $('campaign-title').textContent = contract.title;
  $('campaign-progress').textContent = contract.ready
    ? 'Återvänd till Maja för din belöning'
    : contract.progress + objectiveText(p);
  $('player-class').textContent = c.name.toUpperCase();
  $('level').textContent = `NIVÅ ${p.level}`;
  $('health-fill').style.width = `${(p.hp / maxHp(p)) * 100}%`;
  $('health-text').textContent = `${Math.ceil(p.hp)} / ${maxHp(p)} HÄLSA`;
  $('xp-text').textContent = `${p.xp} / ${xpNeeded(p)} XP`;
  $('xp-fill').style.width = `${(p.xp / xpNeeded(p)) * 100}%`;
  $('ability-name').textContent = c.ability;
  $('ability-cooldown').textContent =
    (p.abilityCooldown > 0 ? `${Math.ceil(p.abilityCooldown)} s` : 'REDO') +
    (p.skills.includes('class_utility')
      ? ` · X ${CLASS_SKILLS[p.classId][2][0]} ${p.tacticalCooldown > 0 ? Math.ceil(p.tacticalCooldown) + ' s' : 'REDO'}`
      : '') +
    (p.skills.includes('support_ability') || p.skills.includes('assault_ability')
      ? ` · Z ${BRANCH_ABILITIES[p.classId][p.skills.includes('assault_ability') ? 1 : 0][0]} ${p.specialCooldown > 0 ? Math.ceil(p.specialCooldown) + ' s' : 'REDO'}`
      : '');
  $('grenade-count').textContent = `G · Spränghandgranat m/56 × ${p.grenades ?? 0}`;
  $('weapon-name').textContent = p.weapon.name;
  $('weapon-rarity').textContent = RARITIES[p.weapon.rarity].toUpperCase();
  $('weapon-rarity').style.color = RARITY_COLORS[p.weapon.rarity];
  $('ammo').textContent = p.reload > 0 ? '↻' : p.ammo;
  $('ammo-max').textContent = p.reload > 0 ? `${p.reload.toFixed(1)} s` : `/ ${weaponStats(p).mag}`;
  const message = storageWarning
    ? 'Lokal lagring är blockerad. Framsteg kan inte sparas på den här enheten.'
    : state.time < p.messageUntil
      ? p.message
      : '';
  $('notification').textContent = message;
  const nearby = state.loot.find(
    (l) => l.owner === myId && Math.hypot(l.x - p.x, l.z - p.z) < 12 && clearShot(p, l),
  );
  const npc = nearbyNpc(p);
  $('interact').textContent = npc
    ? `E · Prata med ${npc.name}`
    : atCamp(p)
      ? 'E · Prata med Maja / uppdrag och verkstad'
      : nearbyStory(p)
        ? `E · ${nearbyStory(p).name}${p.storyChannel ? ' · arbete pågår' : ''}`
        : nearbyCache(p)
          ? `E · Sök ${nearbyCache(p).name}`
          : inSanctuary(p)
            ? 'WASD · Lämna samlingsplatsen för att inleda strid'
            : nearby
              ? `E · Bärga ${lootName(nearby)}`
              : '';
  const district = MAP.districts
    .filter((d) => Math.hypot(d.x - p.x, d.z - p.z) < d.radius)
    .sort((a, b) => a.radius - b.radius)[0];
  const place = MAP.places
    .filter((p) => p.name)
    .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
  $('zone').textContent = inSanctuary(p)
    ? 'SAMLINGSPLATS · SKYDDAD ZON'
    : inArena(p)
      ? `SKOGSBO ARENA · ${mode === 'online' && p.pvp ? 'PVP AKTIVT' : 'PVP AV'}`
      : `${(district?.name || place.name).toUpperCase()} · ${mode === 'online' ? 'SAMARBETE' : 'ENSAMSPEL'}`;
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
  const dt = Math.min(0.5, (now - last) / 1000);
  last = now;
  elapsed += dt;
  accumulator += dt;
  sendClock += dt;
  hudClock += dt;
  saveClock += dt;
  const p = state.players[myId];
  if (mode && p) {
    const forward =
      Number(keys.has('w') || keys.has('arrowup')) - Number(keys.has('s') || keys.has('arrowdown'));
    const strafe =
      Number(keys.has('d') || keys.has('arrowright')) -
      Number(keys.has('a') || keys.has('arrowleft'));
    const input = cleanInput({
      aim: look.yaw,
      pitch: look.pitch,
      ...(!paused() && pointerLocked()
        ? {
            x: Math.sin(look.yaw) * forward - Math.cos(look.yaw) * strafe,
            z: Math.cos(look.yaw) * forward + Math.sin(look.yaw) * strafe,
            fire: mouse.down,
            ads: mouse.ads,
            sprint: keys.has('shift'),
            crouch,
          }
        : {}),
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
  renderClock += dt;
  const active = mode && pointerLocked() && !paused();
  if (mode) audio.update(state, myId, { paused: paused(), active });
  view?.adaptResolution(dt, Boolean(active));
  const interval = view?.softwareRenderer ? (active ? 1 / 20 : 0.5) : active ? 0 : 1 / 15;
  document.body.classList.toggle('aiming', Boolean(active && mouse.ads));
  if (renderClock >= interval && !document.hidden) {
    view?.render(state, myId, renderClock, Boolean(mode), elapsed, {
      ...look,
      ads: active && mouse.ads,
      moving: active && keys.size > 0,
      crouch,
      settings,
    });
    renderClock = 0;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
if (import.meta.env.PROD && 'serviceWorker' in navigator)
  navigator.serviceWorker
    .register(new URL('sw.js', new URL(import.meta.env.BASE_URL, document.baseURI)))
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
    for (const key of ['level', 'xp', 'hp', 'scrap', 'credits', 'power', 'vitality', 'points'])
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
  for (const key of ['level', 'xp', 'hp', 'scrap', 'credits', 'power', 'vitality', 'points'])
    stats[key] = Number($(`admin-${key}`).value);
  sendAdmin({ type: 'set_stats', targetId: $('admin-target').value, stats });
};
$('admin-heal').onclick = () => sendAdmin({ type: 'heal', targetId: $('admin-target').value });

if (!multiplayerAvailable) {
  $('play-online').disabled = true;
  $('play-online').textContent = 'MULTIPLAYER KRÄVER EN SPELSERVER';
}

for (const [kind, recipe] of Object.entries(RECIPES)) {
  const button = document.createElement('button');
  button.className = 'secondary';
  button.id = `craft-${kind}`;
  button.textContent = `${recipe.name} · ${recipe.cost} skrot`;
  button.onclick = () => action({ type: 'craft', kind });
  $('workshop-recipes').append(button);
}
$('contract-action').onclick = () => action({ type: 'contract' });
$('archive-action').onclick = () => action({ type: 'archive' });
$('upgrade-armor').onclick = () => action({ type: 'armor' });
function renderCamp() {
  const p = state.players[myId];
  if (!p) return;
  const status = campaignStatus(p),
    contract = CONTRACTS[p.campaign.step];
  const narrationKey = `${p.campaign.step}`;
  if (narrationKey !== spokenCampKey) {
    const previous = spokenCampKey;
    spokenCampKey = narrationKey;
    if (previous !== '' && p.campaign.step > 0)
      audio.speak(`debrief-${CONTRACTS[p.campaign.step - 1].id}`);
    else if (contract) audio.speak(`brief-${contract.id}`);
    else audio.speak('debrief-kopparhjarta');
  }
  $('contract-title').textContent = status.title;
  $('contract-chapter').textContent = `${Math.min(p.campaign.step + 1, 8)} / 8`;
  const target = campaignTarget(p);
  $('contract-objective').replaceChildren(
    iconLabel(
      'quest',
      status.ready
        ? 'Återvänd till Maja och lämna in uppdraget'
        : target
          ? `${target.name} · ${Math.round(Math.hypot(target.x - p.x, target.z - p.z))} m · följ guldmarkeringen`
          : 'Ta uppdraget för att aktivera kartmålet',
    ),
  );
  $('contract-rewards').replaceChildren(
    ...(contract
      ? [iconLabel('quest', `${contract.xp} XP`), iconLabel('scrap', `${contract.scrap} skrot`)]
      : []),
  );
  directory($('hub-directory'), HUB.stations, p, guideTo);
  $('contract-previous').textContent =
    p.campaign.step > 0 ? CONTRACTS[p.campaign.step - 1].debrief : '';
  $('contract-story').textContent = contract ? contract.text : EPILOGUE;
  $('contract-progress').textContent = status.progress;
  $('contract-action').textContent = status.complete
    ? 'ALLA UPPDRAG KLARA'
    : !p.campaign.active
      ? 'TA UPPDRAGET'
      : status.ready
        ? 'LÄMNA IN UPPDRAGET'
        : 'UPPDRAGET PÅGÅR';
  $('contract-action').disabled =
    status.complete || (p.campaign.active && !status.ready) || !atCamp(p);
  $('workshop-stats').textContent =
    `${p.scrap} skrot · Rustning ${p.armor}/${armorLimit(p)} (${p.armor * 8 + (p.skills.includes('armor_training') ? 4 : 0)}% skademinskning). Vapen tillverkas som ovanliga på din nuvarande nivå ${p.level}.`;
  for (const [kind, recipe] of Object.entries(RECIPES)) {
    const caption = `${recipe.name} · ${craftCost(p, kind)} skrot + ${recipeText(WEAPON_RECIPES[kind])}`;
    if ($('craft-' + kind).dataset.caption !== caption) {
      $('craft-' + kind).replaceChildren(icon(kind), document.createTextNode(caption));
      $('craft-' + kind).dataset.caption = caption;
    }
    $('craft-' + kind).disabled =
      p.scrap < craftCost(p, kind) ||
      !hasMaterials(p, WEAPON_RECIPES[kind]) ||
      p.inventory.length >= 16 ||
      !atCamp(p);
  }
  $('upgrade-armor').textContent =
    p.armor >= armorLimit(p)
      ? 'RUSTNING FULLT FÖRSTÄRKT'
      : `FÖRSTÄRK BRUKSRUSTNING · ${armorCost(p)} SKROT`;
  $('upgrade-armor').disabled = p.armor >= armorLimit(p) || p.scrap < armorCost(p) || !atCamp(p);
  marketPanel($('camp-market'), p, action);
  $('archive-action').disabled = p.archiveQuest !== 1;
  $('archive-action').textContent =
    p.archiveQuest === 2
      ? 'EVAKUERINGSPLANEN RÄDDAD'
      : p.archiveQuest === 1
        ? 'LÄMNA IN · 120 KR + 100 XP'
        : 'HITTA EVAKUERINGSPLANEN I AALTOHUSET';
  $('camp-message').textContent = state.time < p.messageUntil ? p.message : '';
}

function applySettings(save = false) {
  view?.applySettings(settings);
  audio.configure(settings);
  $('settings-gpu-restart').hidden = !view || settings.gpuPerformance === view.initialGpuPreference;
  $('crosshair').textContent = { cross: '+', dot: '•', circle: '○', none: '' }[settings.crosshair];
  $('crosshair').style.color = settings.crosshairColor;
  $('crosshair').style.fontSize = `${settings.crosshairSize}px`;
  for (const [key, value] of Object.entries(settings)) {
    const input = $('setting-' + key);
    if (typeof value === 'boolean') input.checked = value;
    else input.value = String(value);
    const output = $(key + '-value');
    if (output) output.textContent = String(value);
  }
  if (save) {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      $('settings-status').textContent = 'Inställningarna är sparade.';
    } catch {
      $('settings-status').textContent =
        'Inställningarna gäller nu, men webbläsaren tillåter inte att de sparas.';
    }
  }
}
function openSettings() {
  resetInput();
  releaseMouse();
  $('settings-dialog').showModal();
  updateCaptureHint();
}
$('settings-menu').onclick = $('settings-pause').onclick = openSettings;
for (const key of Object.keys(DEFAULT_SETTINGS))
  $('setting-' + key).addEventListener('input', (event) => {
    const input = event.target;
    settings = normalizeSettings({
      ...settings,
      [key]:
        input.type === 'checkbox'
          ? input.checked
          : input.type === 'range'
            ? Number(input.value)
            : input.value,
    });
    applySettings(true);
  });
$('settings-gpu-restart').onclick = () => {
  persist();
  location.reload();
};
$('settings-reset').onclick = () => {
  settings = { ...DEFAULT_SETTINGS };
  applySettings(true);
};
applySettings();

function openNpc(npc) {
  currentNpc = npc;
  $('artist-panel').hidden = npc.id !== 'anders';
  $('npc-service').hidden = npc.id === 'anders';
  if (npc.id === 'anders') artistPanel($('artist-panel'), state.players[myId], action);
  $('npc-market').hidden = npc.id !== 'torsten';
  if (npc.id === 'torsten') marketPanel($('npc-market'), state.players[myId], action);
  $('npc-name').textContent = npc.name;
  const info = NPC_SERVICES[npc.id];
  $('npc-services').replaceChildren(
    iconLabel(info.icon, `${info.role} · ${info.place}`, 'strong'),
    Object.assign(document.createElement('p'), { textContent: info.summary }),
  );
  updateNpcService(state.players[myId]);
  $('npc-text').textContent = npc.text;
  $('npc-service').textContent = npc.label;
  $('npc-service').onclick = () => action({ type: 'npc', npcId: npc.id });
  openDialog($('npc-dialog'));
  audio.speak(`npc-${npc.id}`);
}
$('admin-item-kind').replaceChildren(
  ...Object.entries(WEAPONS).map(([id, w]) => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = w.name;
    return option;
  }),
);

for (const [category, catalog] of Object.entries({
  material: MATERIALS,
  attachment: ATTACHMENTS,
  paint: PAINTS,
}))
  for (const [key, item] of Object.entries(catalog)) {
    const o = document.createElement('option');
    o.value = category + ':' + key;
    o.textContent = item.name;
    $('admin-resource').append(o);
  }
$('admin-resource-form').onsubmit = (e) => {
  e.preventDefault();
  const [category, key] = $('admin-resource').value.split(':');
  sendAdmin({
    type: 'spawn_resource',
    targetId: $('admin-target').value,
    category,
    key,
    quantity: Number($('admin-resource-count').value),
  });
};

function guideTo(station) {
  guideTarget = station;
  expanded = true;
  dialogs.forEach((d) => d.close());
  releaseMouse();
  document.querySelector('.map-panel').classList.add('expanded');
  updateHUD();
}
function updateNpcService(p) {
  if (!currentNpc) return;
  const id = currentNpc.id;
  const message =
    id === 'liv'
      ? 'Hälsa ' + Math.ceil(p.hp) + ' / ' + maxHp(p) + ' · Du har ' + p.scrap + ' skrot'
      : id === 'torsten'
        ? 'Granater ' + p.grenades + ' / 6 · Du har ' + p.scrap + ' skrot'
        : id === 'anders'
          ? 'Du har ' + p.credits + ' brukskronor'
          : p.intel > 0
            ? 'Spaning aktiv · ' + Math.ceil(p.intel) + ' s återstår'
            : 'Kostnadsfri spaning · varar i 120 sekunder';
  $('npc-service-status').textContent = message;
  $('npc-service').disabled =
    id === 'liv'
      ? p.hp >= maxHp(p) || p.scrap < 10
      : id === 'torsten'
        ? p.grenades >= 6 || p.scrap < 20
        : false;
}
for (const button of document.querySelectorAll('[data-jump]'))
  button.onclick = () =>
    document
      .getElementById(button.dataset.jump)
      ?.scrollIntoView({ block: 'start', behavior: 'smooth' });
