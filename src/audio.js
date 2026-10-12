import { VOICE_PROFILES, ENEMY_LINES, speechLine } from '../shared/speech.js';
import { roadsNear, segmentDistance, inSanctuary } from '../shared/map.js';
import { CONTRACTS, campaignStatus } from '../shared/progression.js';
export const GUN_SOUNDS = {
  rifle: { duration: 0.48, bass: 85, body: 0.18, noise: 0.075, metal: 2300 },
  shotgun: { duration: 0.68, bass: 48, body: 0.32, noise: 0.13, metal: 1250 },
  scout: { duration: 0.62, bass: 72, body: 0.27, noise: 0.095, metal: 3100 },
  pistol: { duration: 0.24, bass: 160, body: 0.08, noise: 0.038, metal: 3600 },
  smg: { duration: 0.29, bass: 125, body: 0.1, noise: 0.045, metal: 2700 },
  lmg: { duration: 0.52, bass: 62, body: 0.24, noise: 0.085, metal: 1800 },
};
export function weaponWave(kind, rate = 44100) {
  const p = GUN_SOUNDS[kind] || GUN_SOUNDS.rifle;
  const samples = new Float32Array(Math.ceil(rate * p.duration));
  let seed = 7919 + Object.keys(GUN_SOUNDS).indexOf(kind) * 101,
    low = 0,
    previous = 0;
  for (let i = 0; i < samples.length; i++) {
    const t = i / rate,
      n = ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296) * 2 - 1;
    low += 0.23 * (n - low);
    const crack = (n - previous) * 0.32 * Math.exp(-t / p.noise);
    previous = n;
    const body =
      Math.sin(2 * Math.PI * (p.bass * t + 24 * t * Math.exp(-t * 12))) *
      Math.exp(-t / p.body) *
      0.55;
    const metal =
      Math.sin(2 * Math.PI * p.metal * t) *
      Math.exp(-Math.max(0, t - 0.02) * 80) *
      (t > 0.02 ? 0.055 : 0);
    samples[i] =
      Math.tanh((crack + body + low * Math.exp(-t / (p.body * 1.7)) * 0.25 + metal) * 1.2) *
      Math.min(1, i / 32) *
      0.8;
  }
  return samples;
}
const fileUrl = (file) =>
  new URL(`audio/${file}`, new URL(import.meta.env.BASE_URL, document.baseURI)).href;
export class GameAudio {
  constructor(caption) {
    this.caption = caption;
    this.buffers = new Map();
    this.loadedVoices = new Map();
    this.seen = new Set();
    this.enabled = false;
    this.voiceToken = 0;
    this.lastBark = 0;
    this.barkIndex = 0;
  }
  async unlock() {
    try {
      if (!this.context) {
        const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!Context) return;
        const c = (this.context = new Context());
        this.master = c.createGain();
        this.effects = c.createGain();
        this.voices = c.createGain();
        this.ambient = c.createGain();
        const limiter = c.createDynamicsCompressor();
        limiter.threshold.value = -12;
        limiter.knee.value = 18;
        limiter.ratio.value = 8;
        limiter.attack.value = 0.003;
        limiter.release.value = 0.2;
        this.effects.connect(this.master);
        this.voices.connect(this.master);
        this.ambient.connect(this.master);
        this.master.connect(limiter);
        limiter.connect(c.destination);
        for (const kind of Object.keys(GUN_SOUNDS)) {
          const wave = weaponWave(kind, c.sampleRate),
            buffer = c.createBuffer(1, wave.length, c.sampleRate);
          buffer.copyToChannel(wave, 0);
          this.buffers.set(kind, buffer);
        }
        const noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate),
          data = noise.getChannelData(0);
        let smooth = 0;
        for (let i = 0; i < data.length; i++) {
          smooth += (Math.random() * 2 - 1 - smooth) * 0.018;
          data[i] = smooth * 0.15;
        }
        this.wind = c.createBufferSource();
        this.wind.buffer = noise;
        this.wind.loop = true;
        this.wind.connect(this.ambient);
        this.wind.start();
      }
      await this.context.resume();
      this.enabled = this.context.state === 'running';
      document.body.dataset.audio = this.enabled ? 'ready' : 'suspended';
      this.configure(this.settings || {});
      this.loadedCues ||= fetch(fileUrl('timings.json'))
        .then((r) => (r.ok ? r.json() : {}))
        .catch(() => ({}));
    } catch {
      this.enabled = false;
      document.body.dataset.audio = 'unavailable';
    }
  }
  configure(settings) {
    this.settings = settings;
    if (settings.subtitles === false && this.caption) this.caption.textContent = '';
    if (!this.context) return;
    const t = this.context.currentTime;
    this.master.gain.setTargetAtTime(settings.masterVolume ?? 0.7, t, 0.04);
    this.effects.gain.setTargetAtTime(
      (settings.effectsVolume ?? 0.8) * (this.voicePlaying ? 0.45 : 1),
      t,
      0.04,
    );
    this.voices.gain.setTargetAtTime(
      settings.voicesEnabled === false ? 0 : (settings.voiceVolume ?? 0.95),
      t,
      0.04,
    );
    this.ambient.gain.setTargetAtTime(settings.ambientVolume ?? 0.3, t, 0.04);
    if (
      settings.voicesEnabled === false ||
      settings.voiceVolume === 0 ||
      settings.masterVolume === 0
    )
      this.stopVoice();
  }
  reset() {
    this.seen.clear();
    this.previous = null;
    this.lastBark = 0;
    this.questReady = null;
    this.stopVoice();
  }
  stop() {
    this.reset();
    this.enabled = false;
    this.context?.suspend().catch(() => {});
  }
  stopVoice() {
    this.voiceToken++;
    this.voicePlaying = false;
    this.voicePriority = 0;
    this.transcript?.finish();
    if (this.voiceSource) {
      this.voiceSource.onended = null;
      try {
        this.voiceSource.stop();
      } catch {}
      this.voiceSource.cleanup?.();
      this.voiceSource = null;
    }
    globalThis.speechSynthesis?.cancel();
    if (this.caption) this.caption.textContent = '';
    if (this.context)
      this.effects.gain.setTargetAtTime(
        this.settings?.effectsVolume ?? 0.8,
        this.context.currentTime,
        0.05,
      );
  }
  play(buffer, level = 0.5, position = null, rate = 1, channel = this.effects) {
    if (!this.enabled || !buffer) return null;
    const c = this.context,
      source = c.createBufferSource(),
      gain = c.createGain();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    let distance = 0,
      pan = 0;
    if (position && this.listener) {
      const dx = position.x - this.listener.x,
        dz = position.z - this.listener.z;
      distance = Math.hypot(dx, dz);
      pan = Math.max(
        -1,
        Math.min(
          1,
          (dx * Math.cos(this.listener.aim || 0) - dz * Math.sin(this.listener.aim || 0)) /
            Math.max(5, distance),
        ),
      );
    }
    gain.gain.value = level / (1 + (distance / 18) ** 1.6);
    source.connect(gain);
    let panner;
    if (c.createStereoPanner) {
      const p = c.createStereoPanner();
      panner = p;
      p.pan.value = pan;
      gain.connect(p);
      p.connect(channel);
    } else gain.connect(channel);
    source.start();
    source.cleanup = () => {
      source.disconnect();
      gain.disconnect();
      panner?.disconnect();
    };
    source.onended = source.cleanup;
    return source;
  }
  tap(pitch = 180, duration = 0.07, level = 0.18, offset = 0) {
    if (!this.enabled) return;
    const c = this.context,
      osc = c.createOscillator(),
      gain = c.createGain(),
      t = c.currentTime + offset;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(pitch, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, pitch * 0.45), t + duration);
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(level, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain);
    gain.connect(this.effects);
    osc.start(t);
    osc.stop(t + duration + 0.01);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }
  async speak(id, { position = null, priority = 10 } = {}) {
    const line = speechLine(id);
    if (
      !line ||
      !this.enabled ||
      this.settings?.voicesEnabled === false ||
      this.settings?.voiceVolume === 0 ||
      this.settings?.masterVolume === 0
    )
      return;
    if (this.voicePlaying && this.voicePriority > priority) return;
    this.stopVoice();
    const token = this.voiceToken;
    this.voicePlaying = true;
    this.voicePriority = priority;
    this.configure(this.settings);
    const name = VOICE_PROFILES[line.profile].name;
    if (this.caption && this.settings?.subtitles !== false)
      this.caption.textContent = `${name}: ${line.text}`;
    try {
      if (!this.loadedVoices.has(id))
        this.loadedVoices.set(
          id,
          fetch(fileUrl(line.file))
            .then((r) => {
              if (!r.ok) throw new Error('missing voice');
              return r.arrayBuffer();
            })
            .then((b) => this.context.decodeAudioData(b))
            .catch(() => null),
        );
      const buffer = await this.loadedVoices.get(id);
      if (token !== this.voiceToken) return;
      if (buffer) {
        const cues = await this.loadedCues;
        if (token !== this.voiceToken) return;
        this.voiceSource = this.play(buffer, 1, position, 1, this.voices);
        this.voiceStarted = this.context.currentTime;
        this.transcript?.begin(line, VOICE_PROFILES[line.profile], cues?.[line.id] || []);
        const cleanup = this.voiceSource.onended;
        this.voiceSource.onended = () => {
          cleanup?.();
          if (token === this.voiceToken) this.stopVoice();
        };
      } else if (globalThis.speechSynthesis && globalThis.SpeechSynthesisUtterance) {
        const speech = new SpeechSynthesisUtterance(line.text),
          profile = VOICE_PROFILES[line.profile];
        speech.lang = profile.lang;
        speech.rate = 1;
        speech.volume = (this.settings.voiceVolume ?? 0.95) * (this.settings.masterVolume ?? 0.7);
        speech.onend = speech.onerror = () => {
          if (token === this.voiceToken) this.stopVoice();
        };
        speechSynthesis.speak(speech);
      } else this.stopVoice();
    } catch {
      if (token === this.voiceToken) this.stopVoice();
    }
  }
  update(state, myId, { paused = false, active = false } = {}) {
    if (this.voicePlaying && this.context)
      this.transcript?.update(this.context.currentTime - this.voiceStarted);
    const p = state.players[myId];
    if (!this.enabled || !p) return;
    this.listener = p;
    if (state.time < this.lastTime) {
      this.reset();
    }
    this.lastTime = state.time;
    for (const shot of state.shots) {
      const key = `shot:${shot.owner || shot.id}:${shot.time}:${shot.kind || 'rifle'}`;
      if (this.seen.has(key) || state.time - shot.time > 0.25) continue;
      this.seen.add(key);
      this.play(
        this.buffers.get(shot.kind) || this.buffers.get('rifle'),
        shot.suppressed ? 0.18 : shot.owner === myId ? 0.6 : 0.48,
        shot,
        0.98 + Math.random() * 0.04,
      );
      if (shot.owner === myId && shot.hit) this.tap(shot.headshot ? 1600 : 1200, 0.035, 0.07);
    }
    for (const blast of state.blasts || []) {
      const key = `blast:${blast.id}`;
      if (this.seen.has(key)) continue;
      this.seen.add(key);
      this.play(this.buffers.get('shotgun'), 0.9, blast, 0.42);
    }
    if (this.previous) {
      if (p.reload > 0 && this.previous.reload <= 0) {
        this.tap(1200, 0.045, 0.12);
        this.tap(650, 0.055, 0.1, 0.2);
        this.tap(1500, 0.04, 0.12, 0.35);
      }
      if (p.hp < this.previous.hp) this.tap(70, 0.2, 0.18);
      if (p.weapon.id !== this.previous.weapon.id) this.tap(720, 0.05, 0.11);
      const traveled = Math.hypot(p.x - this.previous.x, p.z - this.previous.z);
      if (active && traveled < 4) {
        this.stepDistance = (this.stepDistance || 0) + traveled;
        const stride = p.sprinting ? 1.5 : 1.2;
        if (this.stepDistance > stride) {
          this.stepDistance %= stride;
          const road = roadsNear(p.x, p.z).some(
            (r) => segmentDistance(p.x, p.z, ...r.points) < (r.width || 5.6) / 2,
          );
          this.tap(road ? 130 : 85, 0.07, 0.1);
          this.play(this.buffers.get('pistol'), road ? 0.008 : 0.015, null, 0.55);
        }
      }
    }
    const status = campaignStatus(p),
      readyKey = `${p.campaign.step}:${status.ready}`;
    if (
      this.questReady !== null &&
      this.questReady !== readyKey &&
      status.ready &&
      p.campaign.active
    ) {
      const contract = CONTRACTS[p.campaign.step];
      if (contract) this.speak(`discovery-${contract.id}`, { priority: 15 });
    }
    this.questReady = readyKey;
    if (!paused && !inSanctuary(p) && !this.voicePlaying && state.time - this.lastBark > 20) {
      const enemy = state.enemies
        .filter((e) => e.hp > 0 && Math.hypot(e.x - p.x, e.z - p.z) < 42)
        .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
      if (enemy) {
        const profile = ENEMY_LINES.some((l) => l.profile === enemy.type) ? enemy.type : 'heavy';
        const lines = ENEMY_LINES.filter((l) => l.profile === profile);
        const line = lines[this.barkIndex++ % lines.length];
        this.lastBark = state.time;
        this.speak(line.id, { position: enemy, priority: 1 });
      }
    }
    this.previous = { x: p.x, z: p.z, hp: p.hp, reload: p.reload, weapon: p.weapon };
    if (this.seen.size > 1000) this.seen = new Set([...this.seen].slice(-300));
  }
}
