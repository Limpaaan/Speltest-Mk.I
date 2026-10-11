const durations = { pickup: 1.25, trade: 1.6, use: 1.5 };
// Cosmetic events originate only after an authoritative action succeeds.
export function startGesture(w, p, kind, target) {
  if (!Object.hasOwn(durations, kind)) return;
  p.gesture = { kind, start: w.time, duration: durations[kind] };
  if (target && Number.isFinite(target.x) && Number.isFinite(target.z)) {
    p.gesture.target = { x: target.x, z: target.z };
    if (typeof target.id === 'string') p.gesture.npcId = target.id;
  }
}
