import * as THREE from 'three';
const down = new THREE.Vector3(0, -1, 0);
const smooth = (t) => {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
};
// Two-bone reach: shoulder and elbow place the fingertips on a meaningful target.
export function reachHand(arm, target, weight = 1) {
  const end = new THREE.Vector3(...target),
    delta = end.sub(arm.shoulder.position),
    length = Math.min(0.654, Math.max(0.06, delta.length())),
    axis = delta.normalize();
  const upper = 0.29,
    lower = 0.37,
    a = (upper * upper - lower * lower + length * length) / (2 * length),
    h = Math.sqrt(Math.max(0, upper * upper - a * a));
  const bend = new THREE.Vector3(arm.shoulder.position.x > 0 ? 1 : -1, -0.3, 0.25);
  bend.addScaledVector(axis, -bend.dot(axis)).normalize();
  const elbow = arm.shoulder.position.clone().addScaledVector(axis, a).addScaledVector(bend, h);
  const q1 = new THREE.Quaternion().setFromUnitVectors(
    down,
    elbow.clone().sub(arm.shoulder.position).normalize(),
  );
  const q2 = new THREE.Quaternion().setFromUnitVectors(
    down,
    arm.shoulder.position.clone().addScaledVector(axis, length).sub(elbow).normalize(),
  );
  arm.shoulder.quaternion.slerp(q1, weight);
  arm.elbow.quaternion.slerp(q1.clone().invert().multiply(q2), weight);
}
export function idleMotion(time, phase, lastActive = 0, style = 'snus') {
  if (time - lastActive < 5) return null;
  const cycle = (time + phase * 3) % 42;
  if (cycle >= 8 && cycle < 12) return { kind: 'scratch', progress: (cycle - 8) / 4 };
  if (cycle >= 23 && cycle < 28) return { kind: 'stretch', progress: (cycle - 23) / 5 };
  if (cycle >= 34 && cycle < 39) return { kind: style, progress: (cycle - 34) / 5 };
  return null;
}
export function applyHumanMotion(
  rig,
  time,
  {
    moving = false,
    reload = 0,
    recoil = 0,
    combat = false,
    drawing = false,
    gesture = null,
    previewPose = null,
  } = {},
) {
  const busy = moving || reload > 0 || recoil > 0 || combat || drawing;
  if (busy) rig.lastActive = time;
  for (const prop of Object.values(rig.props)) prop.visible = false;
  let motion = null;
  if (!busy && gesture && time >= gesture.start && time < gesture.start + gesture.duration)
    motion = { kind: gesture.kind, progress: (time - gesture.start) / gesture.duration };
  if (!busy && !motion)
    motion = previewPose || idleMotion(time, rig.phase, rig.lastActive || 0, rig.idleStyle);
  rig.motion = motion?.kind || null;
  if (!motion) return;
  const u = motion.progress,
    weight = smooth(u / 0.2) * smooth((1 - u) / 0.2),
    left = rig.arms[0],
    right = rig.arms[1];
  // A slung weapon stays attached to the torso when both hands are busy.
  if (rig.weapon) {
    rig.weapon.position.y -= weight * 0.15;
    rig.weapon.position.z -= weight * 0.14;
    rig.weapon.rotation.z = -weight * 0.65;
  }
  if (motion.kind === 'scratch') {
    reachHand(right, [0.1, rig.head.position.y + 0.025, 0.03 + Math.sin(u * 40) * 0.014], weight);
    right.fingers.rotation.x = -0.7 * weight;
    rig.head.rotation.z -= weight * 0.09;
  } else if (motion.kind === 'stretch') {
    reachHand(left, [-0.27, 0.99, -0.045], weight);
    reachHand(right, [0.27, 0.99, -0.045], weight);
    rig.torso.rotation.x -= weight * 0.09;
    rig.head.rotation.x -= weight * 0.12;
  } else if (motion.kind === 'smoke' || motion.kind === 'snus') {
    const mouth = [0.025, rig.head.position.y - 0.072, 0.14],
      pocket = [0.18, 0.12, 0.16],
      atMouth = smooth((u - 0.15) / 0.18) * smooth((0.8 - u) / 0.2);
    reachHand(
      right,
      pocket.map((n, i) => n + (mouth[i] - n) * atMouth),
      weight,
    );
    right.fingers.rotation.x = -1.15 * weight;
    rig.props.cigarette.visible = motion.kind === 'smoke' && weight > 0.25;
    rig.props.tin.visible = motion.kind === 'snus' && weight > 0.25;
    if (motion.kind === 'snus') reachHand(left, [-0.1, 0.2, 0.28], weight);
    rig.head.rotation.x += atMouth * 0.065;
    if (motion.kind === 'smoke') {
      rig.props.smoke.visible = u > 0.4 && u < 0.9;
      const drift = (u - 0.4) * 0.4;
      rig.props.smoke.position.set(0.02 + drift * 0.5, rig.head.position.y - 0.02 + drift, 0.17);
      rig.props.smoke.scale.setScalar(0.01 + Math.max(0, drift) * 0.23);
    }
  } else {
    const pickup = motion.kind === 'pickup',
      target = pickup
        ? [0.12, -0.16, 0.43]
        : motion.kind === 'use'
          ? [0.02, 0.32, 0.22]
          : [0.03, 0.35, 0.58];
    const retract = smooth((u - 0.48) / 0.4),
      toward = [-0.09, 0.17, 0.19];
    reachHand(
      left,
      target.map((n, i) => n + (toward[i] - n) * retract),
      weight,
    );
    left.fingers.rotation.x = -smooth((u - 0.28) / 0.18) * 1.2 * weight;
    rig.props.parcel.visible = motion.kind !== 'use' && u > 0.32 && u < 0.88;
    rig.head.rotation.x += weight * (pickup ? 0.32 : 0.1);
    rig.torso.rotation.x += weight * (pickup ? 0.2 : 0.03);
  }
}
