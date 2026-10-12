// Change resolution only after sustained frame pressure, never on one stalled frame.
export class RenderBudget {
  constructor() {
    this.reset();
  }
  reset() {
    this.scale = 1;
    this.seconds = 0;
    this.frames = 0;
  }
  update(dt, enabled) {
    if (!enabled) {
      this.seconds = 0;
      this.frames = 0;
      return 1;
    }
    if (!Number.isFinite(dt) || dt <= 0 || dt > 0.2) return this.scale;
    this.seconds += dt;
    this.frames++;
    if (this.seconds >= 2) {
      const fps = this.frames / this.seconds;
      if (fps < 48) this.scale = Math.max(0.7, this.scale - 0.08);
      else if (fps > 55) this.scale = Math.min(1, this.scale + 0.035);
      this.seconds = 0;
      this.frames = 0;
    }
    return this.scale;
  }
}
