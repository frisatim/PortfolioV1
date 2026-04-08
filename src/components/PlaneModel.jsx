import * as THREE from 'three';

/**
 * Creates a low-poly 3D airplane mesh using basic Three.js geometries.
 * Fuselage = cylinder, wings = box, tail = box, engines = small cylinders.
 * White body with a slight blue emissive glow.
 */
export function createPlaneMesh(scale = 1) {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xf0f0f0,
    roughness: 0.3,
    metalness: 0.2,
    emissive: 0x1e3a5f,
    emissiveIntensity: 0.15,
  });

  const accentMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.4,
    metalness: 0.3,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.3,
  });

  // ── Fuselage ──
  const fuselageGeom = new THREE.CylinderGeometry(0.3, 0.2, 2.4, 8);
  const fuselage = new THREE.Mesh(fuselageGeom, bodyMat);
  fuselage.rotation.z = Math.PI / 2; // lay flat along X
  group.add(fuselage);

  // ── Nose cone ──
  const noseGeom = new THREE.ConeGeometry(0.3, 0.6, 8);
  const nose = new THREE.Mesh(noseGeom, bodyMat);
  nose.rotation.z = -Math.PI / 2;
  nose.position.x = 1.5;
  group.add(nose);

  // ── Main wings ──
  const wingGeom = new THREE.BoxGeometry(0.8, 0.05, 2.8);
  const wings = new THREE.Mesh(wingGeom, bodyMat);
  wings.position.x = -0.1;
  group.add(wings);

  // ── Wing tips (accent color) ──
  const tipGeom = new THREE.BoxGeometry(0.15, 0.08, 0.3);
  const tipL = new THREE.Mesh(tipGeom, accentMat);
  tipL.position.set(-0.1, 0.04, 1.4);
  tipL.rotation.x = 0.2;
  group.add(tipL);
  const tipR = new THREE.Mesh(tipGeom, accentMat);
  tipR.position.set(-0.1, 0.04, -1.4);
  tipR.rotation.x = -0.2;
  group.add(tipR);

  // ── Tail vertical stabilizer ──
  const tailVertGeom = new THREE.BoxGeometry(0.6, 0.8, 0.06);
  const tailVert = new THREE.Mesh(tailVertGeom, accentMat);
  tailVert.position.set(-1.1, 0.45, 0);
  group.add(tailVert);

  // ── Tail horizontal stabilizer ──
  const tailHorizGeom = new THREE.BoxGeometry(0.5, 0.04, 1.2);
  const tailHoriz = new THREE.Mesh(tailHorizGeom, bodyMat);
  tailHoriz.position.set(-1.1, 0.15, 0);
  group.add(tailHoriz);

  // ── Engines (under wings) ──
  const engineGeom = new THREE.CylinderGeometry(0.12, 0.1, 0.5, 6);
  [-0.8, 0.8].forEach((z) => {
    const engine = new THREE.Mesh(engineGeom, accentMat);
    engine.rotation.z = Math.PI / 2;
    engine.position.set(0.1, -0.2, z);
    group.add(engine);
  });

  group.scale.setScalar(scale);
  return group;
}

/**
 * Disposes all geometries and materials in the plane mesh.
 */
export function disposePlaneMesh(plane) {
  plane.traverse((child) => {
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
