export const SETTINGS_KEY = 'avesta-settings-v1';
export const DEFAULT_SETTINGS = {
  sensitivity: 1,
  adsSensitivity: 0.65,
  fov: 78,
  crosshair: 'cross',
  crosshairColor: '#eee3b3',
  crosshairSize: 22,
  graphics: 'medium',
  weaponBob: true,
};
export function normalizeSettings(value) {
  const raw = value && typeof value === 'object' ? value : {};
  const number = (key, min, max) =>
    typeof raw[key] === 'number' && Number.isFinite(raw[key])
      ? Math.max(min, Math.min(max, raw[key]))
      : DEFAULT_SETTINGS[key];
  return {
    sensitivity: number('sensitivity', 0.2, 3),
    adsSensitivity: number('adsSensitivity', 0.2, 1.5),
    fov: number('fov', 60, 100),
    crosshairSize: number('crosshairSize', 12, 32),
    crosshair: ['cross', 'dot', 'circle', 'none'].includes(raw.crosshair)
      ? raw.crosshair
      : DEFAULT_SETTINGS.crosshair,
    crosshairColor:
      typeof raw.crosshairColor === 'string' && /^#[0-9a-f]{6}$/i.test(raw.crosshairColor)
        ? raw.crosshairColor
        : DEFAULT_SETTINGS.crosshairColor,
    graphics: ['low', 'medium', 'high'].includes(raw.graphics)
      ? raw.graphics
      : DEFAULT_SETTINGS.graphics,
    weaponBob: typeof raw.weaponBob === 'boolean' ? raw.weaponBob : DEFAULT_SETTINGS.weaponBob,
  };
}
export function readSettings(storage) {
  try {
    return normalizeSettings(JSON.parse(storage.getItem(SETTINGS_KEY)));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}
