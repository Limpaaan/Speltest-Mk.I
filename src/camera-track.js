// Presentation follows the authoritative actor; collisions and shots stay server-owned.
export class CameraTrack {
  reset() {
    this.id = null;
  }
  follow(id, position, dt) {
    if (
      this.id !== id ||
      !this.position ||
      Math.hypot(position.x - this.position.x, position.z - this.position.z) > 5 ||
      Math.abs(position.y - this.position.y) > 5
    ) {
      this.id = id;
      this.position = { ...position };
    } else {
      const a = 1 - Math.exp(-Math.max(0, dt) * 24),
        b = 1 - Math.exp(-Math.max(0, dt) * 14);
      this.position.x += (position.x - this.position.x) * a;
      this.position.z += (position.z - this.position.z) * a;
      this.position.y += (position.y - this.position.y) * b;
      // Avoid drifting under rising terrain while the vertical filter settles.
      this.position.y = Math.max(position.y - 0.18, this.position.y);
    }
    return this.position;
  }
}
