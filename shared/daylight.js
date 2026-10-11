// Forty minutes: thirty minutes between sunrise and sunset, ten minutes of readable night.
export const DAY_SECONDS = 40 * 60;
export function daylight(time = 0) {
  const phase = ((((Number.isFinite(time) ? time : 0) / DAY_SECONDS + 0.32) % 1) + 1) % 1;
  const angle =
    phase < 0.75 ? (phase / 0.75) * Math.PI : Math.PI + ((phase - 0.75) / 0.25) * Math.PI;
  const elevation = Math.sin(angle);
  const day = Math.max(0, Math.min(1, (elevation + 0.08) / 0.4));
  const hour = phase < 0.75 ? 6 + (phase / 0.75) * 12 : (18 + ((phase - 0.75) / 0.25) * 12) % 24;
  return {
    phase,
    angle,
    elevation,
    day,
    night: 1 - day,
    hour,
    label: `${String(Math.floor(hour)).padStart(2, '0')}:${String(Math.floor((hour % 1) * 60)).padStart(2, '0')}`,
  };
}
