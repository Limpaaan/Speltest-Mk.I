import { daylight } from './daylight.js';
const clamp = (n) => Math.max(0, Math.min(1, n));
// Smooth shared weather: all clients derive the same autumn light and wind from
// the authoritative day clock. It never changes movement or weapon accuracy.
export function environmentAt(seconds = 0) {
  const t = Number.isFinite(seconds) ? seconds : 0,
    d = daylight(t);
  const cloud = clamp(0.48 + 0.25 * Math.sin(t / 247 + 0.8) + 0.14 * Math.sin(t / 83)),
    gust = clamp(0.4 + 0.23 * Math.sin(t / 9) + 0.16 * Math.sin(t / 3.7)),
    lowSun = clamp(1 - Math.abs(d.elevation) * 0.85),
    mist = clamp(0.22 + cloud * 0.32 + lowSun * 0.32);
  return {
    ...d,
    cloud,
    gust,
    mist,
    wetness: clamp((cloud - 0.28) * 1.25),
    sunHeight: Math.max(0.15, Math.abs(d.elevation) * 0.48),
    exposure: 0.94 + d.day * 0.13 - cloud * 0.09,
    fogDensity: 0.00065 + mist * 0.00065 + d.night * 0.00028,
  };
}
