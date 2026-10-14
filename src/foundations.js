import * as THREE from 'three';
import { MAP } from '../shared/map.js';
import { industrialFoundation } from './industry.js';

export function buildLandmarkFoundations(view) {
  const round = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
  for (const f of MAP.foundations.filter((f) => !f.city)) {
    if (industrialFoundation(view, f)) continue;
    view.static(
      f.shape === 'round' ? round : view.boxGeo,
      view.s.concrete,
      f.x,
      f.y,
      f.z,
      f.w,
      f.h,
      f.d,
      f.yaw || 0,
    );
  }
  round.dispose();
}
