import * as THREE from 'three';
import { environmentAt } from '../shared/environment.js';
export class DayNight {
  constructor(view) {
    this.view = view;
    this.nightSky = new THREE.Color('#182b4b');
    this.daySky = new THREE.Color('#ffffff');
    this.dayFog = new THREE.Color('#aab7b6');
    this.nightFog = new THREE.Color('#17283b');
    const points = [];
    for (let i = 0; i < 350; i++) {
      const a = i * 2.39996,
        y = 0.15 + (i % 97) / 115,
        r = Math.sqrt(1 - y * y);
      points.push(Math.cos(a) * r * 800, y * 800, Math.sin(a) * r * 800);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    this.stars = new THREE.Points(
      g,
      new THREE.PointsMaterial({
        color: '#bfcfe7',
        size: 1.4,
        transparent: true,
        depthWrite: false,
        fog: false,
      }),
    );
    view.scene.add(this.stars);
    this.moon = new THREE.Mesh(
      new THREE.SphereGeometry(7, 16, 12),
      new THREE.MeshBasicMaterial({ color: '#c4d1dc', fog: false }),
    );
    view.scene.add(this.moon);
  }
  update(seconds) {
    const d = environmentAt(seconds),
      v = this.view,
      c = v.camera.position;
    v.sky.material.color.copy(this.nightSky).lerp(this.daySky, d.day);
    v.scene.fog.color.copy(this.nightFog).lerp(this.dayFog, d.day);
    v.scene.background.copy(v.scene.fog.color);
    v.scene.fog.density = d.fogDensity;
    v.renderer.toneMappingExposure = d.exposure;
    v.hemisphere.intensity = 0.55 + d.day * 0.55 + d.cloud * 0.13;
    v.hemisphere.groundColor.set(d.day > 0.4 ? '#495142' : '#344c67');
    v.hemisphere.color.set(d.day > 0.4 ? '#9fb6c5' : '#7395be');
    v.sun.intensity = 0.45 + d.day * 4.2 * (1 - d.cloud * 0.65);
    v.sun.color.set(d.day > 0.4 ? (d.elevation < 0.5 ? '#efb17b' : '#f4d3a1') : '#91afd2');
    v.s.asphalt.roughness = 0.9 - d.wetness * 0.4;
    v.s.asphalt.color.setRGB(1 - d.wetness * 0.18, 1 - d.wetness * 0.15, 1 - d.wetness * 0.11);
    // Moonlight replaces the sun at night; both preserve readable human silhouettes.
    const angle = d.elevation < 0 ? d.angle - Math.PI : d.angle;
    v.sun.position.set(c.x + Math.cos(angle) * 170, c.y + d.sunHeight * 160, c.z + 150);
    v.sun.target.position.copy(c);
    // Soft blue ground fill keeps unlit paths readable, including software rendering.
    v.s.soil.emissive.set('#28394c');
    v.s.soil.emissiveIntensity = d.night * 0.2;
    v.s.asphalt.emissive.set('#202d3a');
    v.s.asphalt.emissiveIntensity = d.night * 0.2;
    v.scene.environmentIntensity = 0.06 + d.day * 0.26;
    v.weaponLight.intensity = 0.8 + d.day * 0.8;
    v.weaponKeyLight.intensity = 0.9 + d.day * 1.4;
    this.stars.position.copy(c);
    this.stars.material.opacity = d.night * 0.8;
    this.moon.position.set(
      c.x + Math.cos(angle) * 600,
      c.y + Math.max(0.2, Math.sin(angle)) * 600,
      c.z + 290,
    );
    this.moon.visible = d.night > 0.4;
    v.atmosphere.setNight(d.night, c);
    this.state = d;
  }
}
