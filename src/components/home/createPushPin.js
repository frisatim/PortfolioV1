import * as THREE from 'three';

/**
 * Creates a realistic 3D pushpin (thumbtack) mesh.
 * Geometry is built along Y then rotated so the pin axis aligns with Z+
 * (globe.gl objectFacesSurface aligns Z+ with the outward surface normal).
 */
export function createPushPin({ color = '#4F46E5', opacity = 1, scale = 1 } = {}) {
  const group = new THREE.Group();
  const inner = new THREE.Group();

  // ── Head: dome-topped cylinder via LatheGeometry ──
  const R = 1.2;
  const H = 1.0;
  const profile = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(R, 0),
    new THREE.Vector2(R, H * 0.35),
  ];
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * Math.PI * 0.5;
    profile.push(
      new THREE.Vector2(R * Math.cos(a), H * 0.35 + R * 0.65 * Math.sin(a))
    );
  }

  const headGeom = new THREE.LatheGeometry(profile, 20);
  const headMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: 0.3,
    metalness: 0.05,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity >= 1,
  });
  const head = new THREE.Mesh(headGeom, headMat);

  // ── Spike: tapered metallic cylinder ──
  const spikeGeom = new THREE.CylinderGeometry(0.12, 0.015, 2.2, 8);
  const spikeMat = new THREE.MeshStandardMaterial({
    color: 0x9CA3AF,
    roughness: 0.15,
    metalness: 0.85,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity >= 1,
  });
  const spike = new THREE.Mesh(spikeGeom, spikeMat);
  spike.position.y = -1.1;

  // ── Contact shadow (flat circle on surface) ──
  const shadowGeom = new THREE.CircleGeometry(R * 1.3, 16);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.15 * opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const shadow = new THREE.Mesh(shadowGeom, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;

  inner.add(head);
  inner.add(spike);
  inner.add(shadow);

  // Rotate inner group so pin axis goes from Y+ to Z+
  // globe.gl objectFacesSurface aligns Z+ with the outward surface normal
  inner.rotation.x = Math.PI / 2;

  group.add(inner);
  group.scale.setScalar(scale);

  return group;
}

/**
 * Elastic bounce animation — pin drops from above and settles.
 * Animates along Z axis (the pin's outward axis after rotation).
 */
export function animatePinBounce(pin) {
  const bounceHeight = 4;
  const duration = 650;
  const start = performance.now();
  const savedScale = pin.scale.x;

  pin.position.z += bounceHeight;
  pin.scale.setScalar(savedScale * 0.5);

  function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    const p = 0.35;
    const ease =
      t === 0
        ? 0
        : t === 1
          ? 1
          : Math.pow(2, -10 * t) *
              Math.sin(((t - p / 4) * (2 * Math.PI)) / p) +
            1;

    pin.position.z = bounceHeight * (1 - ease);
    const s = savedScale * (0.5 + 0.5 * ease);
    pin.scale.setScalar(s);

    if (t < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

/**
 * Clean up Three.js resources.
 */
export function disposePushPin(pin) {
  pin.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => m.dispose());
      } else {
        child.material.dispose();
      }
    }
  });
}
