import * as THREE from 'three';
import { Product } from '../types/supermarket';

/**
 * Creates a high-res procedural canvas texture with crisp text and graphics.
 */
export function createSignTexture(
  title: string,
  subtitle: string,
  categoryIcon: string,
  bgColor: string,
  textColor: string = '#FFFFFF'
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 320;
  const ctx = canvas.getContext('2d')!;

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  grad.addColorStop(0, bgColor);
  grad.addColorStop(1, '#0F172A'); // dark navy slate
  ctx.fillStyle = grad;
  ctx.roundRect ? ctx.roundRect(10, 10, canvas.width - 20, canvas.height - 20, 24) : ctx.rect(10, 10, canvas.width - 20, canvas.height - 20);
  ctx.fill();

  // Border frame
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 8;
  ctx.stroke();

  // Category Icon
  ctx.font = '90px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(categoryIcon, 50, canvas.height / 2);

  // Department Title
  ctx.fillStyle = textColor;
  ctx.font = 'bold 54px system-ui, sans-serif';
  ctx.fillText(title.toUpperCase(), 170, canvas.height / 2 - 35);

  // Subtitle / description
  ctx.fillStyle = '#CBD5E1';
  ctx.font = '34px system-ui, sans-serif';
  ctx.fillText(subtitle, 170, canvas.height / 2 + 45);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Enhanced procedural floor tile textures (Grand carrelage céramique de supermarché 60x60cm avec joints nets et poli lustré)
 */
export function createSupermarketFloorTextures(): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bctx = bumpCanvas.getContext('2d')!;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rctx = roughCanvas.getContext('2d')!;

  // 8x8 tiles in 1024x1024 canvas -> 128px per tile
  const tilesPerSide = 8;
  const tileSize = size / tilesPerSide;
  const groutWidth = 6; // Crisp, well-defined supermarket ceramic grout lines

  // Background base for grout
  ctx.fillStyle = '#475569'; // Contrast slate grey cement joints (carrelage commercial)
  ctx.fillRect(0, 0, size, size);

  bctx.fillStyle = '#000000'; // Deep groove in bump map
  bctx.fillRect(0, 0, size, size);

  rctx.fillStyle = '#A0AEC0'; // Matte rough grout
  rctx.fillRect(0, 0, size, size);

  // Palettes of premium commercial supermarket porcelain tiles
  const tileShades = [
    { base: '#FFFFFF', accent: '#E2E8F0', vein: 'rgba(100, 116, 139, 0.4)' },
    { base: '#F8FAFC', accent: '#CBD5E1', vein: 'rgba(71, 85, 105, 0.35)' },
    { base: '#FAF9F6', accent: '#DDD8CE', vein: 'rgba(120, 113, 108, 0.4)' },
    { base: '#F1F5F9', accent: '#D5DCE4', vein: 'rgba(100, 116, 139, 0.35)' },
  ];

  for (let gx = 0; gx < tilesPerSide; gx++) {
    for (let gy = 0; gy < tilesPerSide; gy++) {
      const x = gx * tileSize + groutWidth / 2;
      const y = gy * tileSize + groutWidth / 2;
      const w = tileSize - groutWidth;
      const h = tileSize - groutWidth;

      const palette = tileShades[(gx * 3 + gy * 7) % tileShades.length];

      // 1. Ceramic tile background with slight lighting gradient
      const grad = ctx.createLinearGradient(x, y, x + w, y + h);
      grad.addColorStop(0, palette.base);
      grad.addColorStop(1, palette.accent);
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, w, h);

      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();

      // 2. Fine marble / polished stone veining
      ctx.strokeStyle = palette.vein;
      ctx.lineWidth = 1.6;
      const seed = (gx * 23 + gy * 47);
      ctx.beginPath();
      ctx.moveTo(x + (seed % 35), y);
      ctx.bezierCurveTo(
        x + w * 0.35 + (seed % 25), y + h * 0.4,
        x + w * 0.65 - (seed % 20), y + h * 0.65,
        x + w - (seed % 30), y + h
      );
      ctx.stroke();

      // Secondary fine vein
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.18)';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(x, y + (seed % 40));
      ctx.bezierCurveTo(
        x + w * 0.5, y + h * 0.2 + (seed % 20),
        x + w * 0.7, y + h * 0.8 - (seed % 15),
        x + w, y + h * 0.5
      );
      ctx.stroke();

      // Micro-mineral mineral flecks
      ctx.fillStyle = 'rgba(71, 85, 105, 0.12)';
      for (let s = 0; s < 16; s++) {
        const sx = x + ((s * 31 + seed) % (w - 6)) + 3;
        const sy = y + ((s * 47 + seed) % (h - 6)) + 3;
        ctx.fillRect(sx, sy, 2, 2);
      }

      // 3. Crisp bevel highlight (top/left) and soft shadow (bottom/right)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(x, y + h);
      ctx.lineTo(x, y);
      ctx.lineTo(x + w, y);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(51, 65, 85, 0.45)';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(x + w, y);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x, y + h);
      ctx.stroke();

      ctx.restore();

      // 4. Bump map: elevated flat tile plateau with beveled borders down to grout
      const bumpGrad = bctx.createRadialGradient(
        x + w / 2, y + h / 2, w * 0.15,
        x + w / 2, y + h / 2, w * 0.65
      );
      bumpGrad.addColorStop(0, '#FFFFFF');
      bumpGrad.addColorStop(0.82, '#E2E8F0');
      bumpGrad.addColorStop(1, '#334155');
      bctx.fillStyle = bumpGrad;
      bctx.fillRect(x, y, w, h);

      // 5. Roughness map: high gloss polished porcelain (dark = glossy in Three.js roughness map)
      rctx.fillStyle = '#282828'; // ~0.16 roughness -> beautiful reflections of lights & shelves
      rctx.fillRect(x, y, w, h);
    }
  }

  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(12, 12);
  map.colorSpace = THREE.SRGBColorSpace;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(12, 12);

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(12, 12);

  return { map, bumpMap, roughnessMap };
}

export function createSupermarketFloorTexture(): THREE.CanvasTexture {
  return createSupermarketFloorTextures().map;
}

/**
 * Creates modular suspended acoustic supermarket ceiling textures
 * (Faux-plafond à dalles suspendues 60x60cm avec dalles LED encastrées et grilles d'aération)
 */
export function createSupermarketCeilingTextures(): {
  map: THREE.CanvasTexture;
  emissiveMap: THREE.CanvasTexture;
} {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const emCanvas = document.createElement('canvas');
  emCanvas.width = size;
  emCanvas.height = size;
  const ectx = emCanvas.getContext('2d')!;

  // 8x8 ceiling tile grid (60x60cm standard suspended ceiling)
  const tilesPerSide = 8;
  const tileSize = size / tilesPerSide;
  const tBarWidth = 4; // T-bar metallic grid rails

  // Base background for ceiling
  ctx.fillStyle = '#64748B'; // T-bar frame color
  ctx.fillRect(0, 0, size, size);

  ectx.fillStyle = '#000000';
  ectx.fillRect(0, 0, size, size);

  for (let gx = 0; gx < tilesPerSide; gx++) {
    for (let gy = 0; gy < tilesPerSide; gy++) {
      const x = gx * tileSize + tBarWidth / 2;
      const y = gy * tileSize + tBarWidth / 2;
      const w = tileSize - tBarWidth;
      const h = tileSize - tBarWidth;

      // Integrated square LED panel troffer (dalle lumineuse encastrée 60x60cm)
      const isLedPanel = (gx % 2 === 1 && gy % 2 === 1);
      // HVAC square ventilation diffuser (bouche de climatisation à lamelles)
      const isVent = (gx === 0 && gy === 4) || (gx === 6 && gy === 2) || (gx === 4 && gy === 6);

      if (isLedPanel) {
        // Bright LED diffuser panel
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(x, y, w, h);

        ctx.strokeStyle = '#CBD5E1';
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);

        // Emissive mask for overhead light emission
        ectx.fillStyle = '#FFFFFF';
        ectx.fillRect(x + 3, y + 3, w - 6, h - 6);
      } else if (isVent) {
        // Metallic HVAC vent with concentric louvers
        ctx.fillStyle = '#E2E8F0';
        ctx.fillRect(x, y, w, h);

        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);

        // Concentric louvers
        for (let step = 14; step < w / 2 - 4; step += 10) {
          ctx.strokeRect(x + step, y + step, w - step * 2, h - step * 2);
        }
      } else {
        // Standard commercial acoustic mineral fiber tile
        ctx.fillStyle = '#F8FAFC';
        ctx.fillRect(x, y, w, h);

        // Acoustic pinhole perforation texture
        ctx.fillStyle = 'rgba(100, 116, 139, 0.3)';
        for (let dx = 8; dx < w - 8; dx += 12) {
          for (let dy = 8; dy < h - 8; dy += 12) {
            ctx.beginPath();
            ctx.arc(x + dx, y + dy, 1.4, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Inner tile chamfer bevel
        ctx.strokeStyle = 'rgba(203, 213, 225, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
      }
    }
  }

  // T-Bar grid metal rails (blanc / alu anodisé avec fines ombres)
  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = tBarWidth;
  for (let i = 0; i <= size; i += tileSize) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }

  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(8, 8);
  map.colorSpace = THREE.SRGBColorSpace;

  const emissiveMap = new THREE.CanvasTexture(emCanvas);
  emissiveMap.wrapS = THREE.RepeatWrapping;
  emissiveMap.wrapT = THREE.RepeatWrapping;
  emissiveMap.repeat.set(8, 8);

  return { map, emissiveMap };
}

/**
 * Builds a 3-tier supermarket shelving unit (rayon d'étagères métalliques)
 * Composite procedural model (8+ distinct parts: posts, shelves, price rails, backboard, aisle banner)
 */
export function createSupermarketShelfUnit(
  aisleName: string,
  subtitle: string,
  categoryIcon: string,
  themeColor: string,
  tiersCount: number = 3,
  customWidth: number = 6.0
): THREE.Group {
  const group = new THREE.Group();

  const width = Math.max(4.0, customWidth);
  const height = tiersCount >= 5 ? 4.2 : tiersCount === 4 ? 3.9 : 3.6;
  const depth = 1.4;

  // Upright steel posts (PBR metal)
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x334155, // slate dark gray
    metalness: 0.85,
    roughness: 0.35,
  });

  const shelfMetalMat = new THREE.MeshStandardMaterial({
    color: 0x94A3B8, // silver painted grocery shelf
    metalness: 0.6,
    roughness: 0.4,
  });

  const railMat = new THREE.MeshStandardMaterial({
    color: 0xDC2626, // red plastic price scanner rail
    metalness: 0.2,
    roughness: 0.5,
  });

  // 4 Vertical Steel Corner Columns
  const columnGeom = new THREE.BoxGeometry(0.08, height, 0.08);
  const colPositions = [
    [-width / 2 + 0.04, height / 2, -depth / 2 + 0.04],
    [width / 2 - 0.04, height / 2, -depth / 2 + 0.04],
    [-width / 2 + 0.04, height / 2, depth / 2 - 0.04],
    [width / 2 - 0.04, height / 2, depth / 2 - 0.04],
  ];

  colPositions.forEach(([x, y, z]) => {
    const col = new THREE.Mesh(columnGeom, steelMat);
    col.position.set(x, y, z);
    col.castShadow = true;
    col.receiveShadow = true;
    group.add(col);
  });

  // Perforated Backboard
  const backGeom = new THREE.BoxGeometry(width - 0.1, height - 0.4, 0.04);
  const backMat = new THREE.MeshStandardMaterial({
    color: 0xE2E8F0,
    metalness: 0.3,
    roughness: 0.6,
  });
  const backboard = new THREE.Mesh(backGeom, backMat);
  backboard.position.set(0, height / 2, 0);
  backboard.receiveShadow = true;
  group.add(backboard);

  // Dynamic Tiers of Shelves (each with front and back half + price rail)
  const shelfYPositions: number[] = [];
  if (tiersCount <= 3) {
    shelfYPositions.push(0.6, 1.4, 2.2);
  } else if (tiersCount === 4) {
    shelfYPositions.push(0.5, 1.15, 1.8, 2.45);
  } else {
    shelfYPositions.push(0.45, 1.0, 1.55, 2.1, 2.65);
  }

  shelfYPositions.forEach((yPos) => {
    // Front shelf plate
    const shelfGeom = new THREE.BoxGeometry(width - 0.1, 0.05, depth / 2 - 0.05);
    const shelfMeshFront = new THREE.Mesh(shelfGeom, shelfMetalMat);
    shelfMeshFront.position.set(0, yPos, depth / 4);
    shelfMeshFront.receiveShadow = true;
    group.add(shelfMeshFront);

    // Front price rail
    const railGeom = new THREE.BoxGeometry(width - 0.1, 0.06, 0.02);
    const railFront = new THREE.Mesh(railGeom, railMat);
    railFront.position.set(0, yPos + 0.02, depth / 2 - 0.01);
    group.add(railFront);

    // Back shelf plate
    const shelfMeshBack = new THREE.Mesh(shelfGeom, shelfMetalMat);
    shelfMeshBack.position.set(0, yPos, -depth / 4);
    shelfMeshBack.receiveShadow = true;
    group.add(shelfMeshBack);

    // Back price rail
    const railBack = new THREE.Mesh(railGeom, railMat);
    railBack.position.set(0, yPos + 0.02, -depth / 2 + 0.01);
    group.add(railBack);
  });

  // Overhead Hanging Aisle Sign
  const signGeom = new THREE.BoxGeometry(4.2, 1.2, 0.08);
  const signTexture = createSignTexture(aisleName, subtitle, categoryIcon, themeColor);
  const signMat = new THREE.MeshStandardMaterial({
    map: signTexture,
    metalness: 0.1,
    roughness: 0.4,
  });
  const sideMat = new THREE.MeshStandardMaterial({ color: 0x1E293B });
  const signMaterials = [
    sideMat, sideMat, sideMat, sideMat,
    signMat, // Front
    signMat, // Back
  ];
  const signMesh = new THREE.Mesh(signGeom, signMaterials);
  signMesh.position.set(0, height + 0.7, 0);
  signMesh.castShadow = true;
  group.add(signMesh);

  // Suspension poles from ceiling
  const poleGeom = new THREE.CylinderGeometry(0.02, 0.02, 1.2, 8);
  const pole1 = new THREE.Mesh(poleGeom, steelMat);
  pole1.position.set(-1.6, height + 1.2, 0);
  group.add(pole1);
  const pole2 = new THREE.Mesh(poleGeom, steelMat);
  pole2.position.set(1.6, height + 1.2, 0);
  group.add(pole2);

  // Soft contact shadow grounding
  const shadowGeom = new THREE.PlaneGeometry(width + 0.4, depth + 0.4);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.25,
    depthWrite: false,
  });
  const shadowMesh = new THREE.Mesh(shadowGeom, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.01;
  group.add(shadowMesh);

  return group;
}

/**
 * Creates an authentic 3D Shopping Cart (Chariot de supermarché)
 * 8-part procedural model:
 * 1. Chrome wire basket
 * 2. Tubular steel chassis frame
 * 3. 4 rotating caster wheels with rubber tires
 * 4. Ergonomic red handle bar with supermarket brand badge
 * 5. Plastic folding child seat
 * 6. Bottom rack shelf for heavy packs
 */
export function createShoppingCartModel(): THREE.Group {
  const cart = new THREE.Group();

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xE2E8F0,
    metalness: 0.95,
    roughness: 0.15,
  });

  const redPlasticMat = new THREE.MeshStandardMaterial({
    color: 0xDC2626, // Supermarket vibrant red
    metalness: 0.1,
    roughness: 0.4,
  });

  const wheelRubberMat = new THREE.MeshStandardMaterial({
    color: 0x1E293B,
    metalness: 0.2,
    roughness: 0.8,
  });

  // 1. Lower Chassis Tubular Base (L: 0.9m, W: 0.55m, H: 0.2m)
  const baseFrame = new THREE.Group();
  const sideTubeGeom = new THREE.CylinderGeometry(0.018, 0.018, 0.85, 12);
  
  const leftTube = new THREE.Mesh(sideTubeGeom, chromeMat);
  leftTube.rotation.x = Math.PI / 2;
  leftTube.position.set(-0.25, 0.18, 0);
  baseFrame.add(leftTube);

  const rightTube = new THREE.Mesh(sideTubeGeom, chromeMat);
  rightTube.rotation.x = Math.PI / 2;
  rightTube.position.set(0.25, 0.18, 0);
  baseFrame.add(rightTube);

  const crossTubeGeom = new THREE.CylinderGeometry(0.018, 0.018, 0.5, 12);
  const crossTubeFront = new THREE.Mesh(crossTubeGeom, chromeMat);
  crossTubeFront.rotation.z = Math.PI / 2;
  crossTubeFront.position.set(0, 0.18, -0.4);
  baseFrame.add(crossTubeFront);

  const crossTubeBack = new THREE.Mesh(crossTubeGeom, chromeMat);
  crossTubeBack.rotation.z = Math.PI / 2;
  crossTubeBack.position.set(0, 0.18, 0.4);
  baseFrame.add(crossTubeBack);

  cart.add(baseFrame);

  // 2. 4 Swivel Caster Wheels
  const wheelPositions = [
    [-0.24, 0.08, -0.38],
    [0.24, 0.08, -0.38],
    [-0.24, 0.08, 0.38],
    [0.24, 0.08, 0.38],
  ];

  wheelPositions.forEach(([wx, wy, wz]) => {
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(wx, wy, wz);

    // Fork
    const forkGeom = new THREE.BoxGeometry(0.03, 0.07, 0.03);
    const fork = new THREE.Mesh(forkGeom, chromeMat);
    fork.position.y = 0.03;
    wheelGroup.add(fork);

    // Tire
    const tireGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.025, 16);
    const tire = new THREE.Mesh(tireGeom, wheelRubberMat);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    wheelGroup.add(tire);

    cart.add(wheelGroup);
  });

  // 3. Basket Wire Frame (Tapered shape)
  const basketGroup = new THREE.Group();
  basketGroup.position.set(0, 0.65, 0);

  // Wire Mesh Walls using semi-transparent / shiny wire look
  const basketMat = new THREE.MeshStandardMaterial({
    color: 0xCBD5E1,
    metalness: 0.9,
    roughness: 0.2,
    wireframe: true,
  });

  // Basket bottom
  const bottomGeom = new THREE.BoxGeometry(0.5, 0.02, 0.7);
  const bottomMesh = new THREE.Mesh(bottomGeom, basketMat);
  bottomMesh.position.y = -0.22;
  basketGroup.add(bottomMesh);

  // 4 Basket Wire walls
  const wallFrontGeom = new THREE.BoxGeometry(0.5, 0.45, 0.02);
  const wallFront = new THREE.Mesh(wallFrontGeom, basketMat);
  wallFront.position.set(0, 0, -0.35);
  basketGroup.add(wallFront);

  const wallBackGeom = new THREE.BoxGeometry(0.5, 0.45, 0.02);
  const wallBack = new THREE.Mesh(wallBackGeom, basketMat);
  wallBack.position.set(0, 0, 0.35);
  basketGroup.add(wallBack);

  const wallSideGeom = new THREE.BoxGeometry(0.02, 0.45, 0.7);
  const wallLeft = new THREE.Mesh(wallSideGeom, basketMat);
  wallLeft.position.set(-0.25, 0, 0);
  basketGroup.add(wallLeft);

  const wallRight = new THREE.Mesh(wallSideGeom, basketMat);
  wallRight.position.set(0.25, 0, 0);
  basketGroup.add(wallRight);

  // Top rim tubular border
  const rimGeom = new THREE.CylinderGeometry(0.014, 0.014, 0.52, 12);
  const rimFront = new THREE.Mesh(rimGeom, chromeMat);
  rimFront.rotation.z = Math.PI / 2;
  rimFront.position.set(0, 0.22, -0.35);
  basketGroup.add(rimFront);

  // Support posts connecting chassis to basket
  const supportGeom = new THREE.CylinderGeometry(0.018, 0.018, 0.48, 12);
  const s1 = new THREE.Mesh(supportGeom, chromeMat);
  s1.position.set(-0.24, 0.38, 0.3);
  s1.rotation.x = -0.2;
  cart.add(s1);
  const s2 = new THREE.Mesh(supportGeom, chromeMat);
  s2.position.set(0.24, 0.38, 0.3);
  s2.rotation.x = -0.2;
  cart.add(s2);

  cart.add(basketGroup);

  // 4. Handlebar with Red Ergonomic Grip & AI Supermarket Logo
  const handleGroup = new THREE.Group();
  handleGroup.position.set(0, 0.95, 0.42);

  const gripGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.58, 16);
  const grip = new THREE.Mesh(gripGeom, redPlasticMat);
  grip.rotation.z = Math.PI / 2;
  grip.castShadow = true;
  handleGroup.add(grip);

  // Logo plate in center of handlebar
  const logoPlateGeom = new THREE.BoxGeometry(0.12, 0.05, 0.02);
  const logoPlate = new THREE.Mesh(logoPlateGeom, new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.2 }));
  logoPlate.position.set(0, 0.02, 0.01);
  handleGroup.add(logoPlate);

  // Handle support arms
  const armGeom = new THREE.CylinderGeometry(0.015, 0.015, 0.25, 12);
  const armLeft = new THREE.Mesh(armGeom, chromeMat);
  armLeft.position.set(-0.26, -0.1, -0.05);
  armLeft.rotation.x = 0.4;
  handleGroup.add(armLeft);

  const armRight = new THREE.Mesh(armGeom, chromeMat);
  armRight.position.set(0.26, -0.1, -0.05);
  armRight.rotation.x = 0.4;
  handleGroup.add(armRight);

  cart.add(handleGroup);

  // Container node inside cart for items that player picks up!
  const itemsContainer = new THREE.Group();
  itemsContainer.name = 'cart_items_container';
  itemsContainer.position.set(0, 0.52, 0);
  cart.add(itemsContainer);

  return cart;
}

/**
 * Generates an illuminated realistic POS terminal computer screen texture
 */
function createPOSScreenTexture(laneNumber: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 384;
  const ctx = canvas.getContext('2d')!;

  // Screen background
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, 512, 384);

  // Top header status bar
  ctx.fillStyle = '#1E293B';
  ctx.fillRect(0, 0, 512, 54);
  ctx.fillStyle = '#10B981';
  ctx.font = 'bold 24px monospace';
  ctx.fillText(`POSTE CAISSE #${laneNumber} • EN LIGNE`, 20, 36);

  // Scanned grocery item rows
  ctx.fillStyle = '#94A3B8';
  ctx.font = '16px monospace';
  ctx.fillText('1x Baguette Trad. Label Rouge   1.20 €', 20, 95);
  ctx.fillText('2x Croissant Feuilleté Pur B.   2.90 €', 20, 125);
  ctx.fillText('1x Lait Frais Entier Bio        1.65 €', 20, 155);
  ctx.fillText('1x Camembert Normandie AOP      3.40 €', 20, 185);

  // Total summary card
  ctx.fillStyle = '#064E3B';
  ctx.fillRect(20, 215, 472, 65);
  ctx.fillStyle = '#6EE7B7';
  ctx.font = 'bold 30px monospace';
  ctx.fillText('TOTAL TTC : 9.15 €', 36, 258);

  // Barcode scanner status & graphic
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(20, 300, 180, 60);
  ctx.fillStyle = '#000000';
  for (let x = 28; x < 190; x += 5) {
    if (x % 11 !== 0) {
      ctx.fillRect(x, 305, 3, 50);
    }
  }

  ctx.fillStyle = '#38BDF8';
  ctx.font = 'bold 18px monospace';
  ctx.fillText('SCANNER LASER ACTIF', 220, 335);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Creates a Supermarket Checkout Counter (Caisse avec table marron, ordinateur de bureau & caissière prête à gérer la caisse)
 */
export function createCheckoutCounter(laneNumber: number): THREE.Group {
  const group = new THREE.Group();

  // Table couleur Marron (Brown counter table in rich wood/walnut)
  const brownTableMat = new THREE.MeshStandardMaterial({
    color: 0x542D15, // Rich brown wood base
    roughness: 0.35,
    metalness: 0.05,
  });

  const polishedBrownTopMat = new THREE.MeshStandardMaterial({
    color: 0x6E3918, // Warm mahogany/walnut counter top slab
    roughness: 0.22,
    metalness: 0.08,
  });

  const beltMat = new THREE.MeshStandardMaterial({
    color: 0x1E293B, // rubber conveyor belt
    roughness: 0.9,
  });

  const scannerGlassMat = new THREE.MeshStandardMaterial({
    color: 0xEF4444, // glowing red laser scanner glass
    emissive: 0x991B1B,
    emissiveIntensity: 0.5,
    roughness: 0.2,
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xCBD5E1,
    metalness: 0.9,
    roughness: 0.2,
  });

  // 1. Main Brown Counter Body (L: 3.2m, W: 1.0m, H: 0.85m)
  const counterGeom = new THREE.BoxGeometry(1.0, 0.84, 3.2);
  const counter = new THREE.Mesh(counterGeom, brownTableMat);
  counter.position.set(0, 0.84 / 2, 0);
  counter.castShadow = true;
  counter.receiveShadow = true;
  group.add(counter);

  // Polished brown wooden top slab
  const slabGeom = new THREE.BoxGeometry(1.06, 0.04, 3.26);
  const slab = new THREE.Mesh(slabGeom, polishedBrownTopMat);
  slab.position.set(0, 0.84 + 0.02, 0);
  slab.receiveShadow = true;
  group.add(slab);

  // 2. Rubber Conveyor Belt
  const beltGeom = new THREE.BoxGeometry(0.55, 0.03, 2.0);
  const belt = new THREE.Mesh(beltGeom, beltMat);
  belt.position.set(-0.15, 0.87, -0.4);
  belt.receiveShadow = true;
  group.add(belt);

  // 3. Laser Barcode Scanner Bed on Counter
  const scannerBed = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.02, 0.28), chromeMat);
  scannerBed.position.set(-0.15, 0.875, 0.7);
  group.add(scannerBed);

  const scanner = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.022, 0.22), scannerGlassMat);
  scanner.position.set(-0.15, 0.88, 0.7);
  group.add(scanner);

  // 4. DESKTOP COMPUTER (Ordinateur de bureau sur la table marron)
  const compMat = new THREE.MeshStandardMaterial({ color: 0x1E293B, roughness: 0.4 });

  // 4a. Computer Mini Tower (Unité centrale)
  const pcTower = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.28, 0.24), compMat);
  pcTower.position.set(0.38, 0.86 + 0.14, 0.35);
  pcTower.castShadow = true;
  group.add(pcTower);

  // 4b. LCD Monitor on Stand
  const monitorStandBase = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.015, 0.16), chromeMat);
  monitorStandBase.position.set(0.32, 0.86 + 0.008, 0.68);
  group.add(monitorStandBase);

  const monitorPost = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.28, 12), chromeMat);
  monitorPost.position.set(0.32, 0.86 + 0.14, 0.68);
  group.add(monitorPost);

  // Monitor frame and screen
  const screenTexture = createPOSScreenTexture(laneNumber);
  const monitorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.32, 0.025), compMat);
  monitorFrame.position.set(0.32, 0.86 + 0.30, 0.68);
  monitorFrame.rotation.y = -Math.PI / 5;
  monitorFrame.rotation.x = -0.15;
  group.add(monitorFrame);

  const screenDisplay = new THREE.Mesh(
    new THREE.PlaneGeometry(0.44, 0.28),
    new THREE.MeshStandardMaterial({
      map: screenTexture,
      emissive: new THREE.Color(0xFFFFFF),
      emissiveMap: screenTexture,
      emissiveIntensity: 0.9,
    })
  );
  screenDisplay.position.set(0.32, 0.86 + 0.30, 0.695);
  screenDisplay.rotation.y = -Math.PI / 5;
  screenDisplay.rotation.x = -0.15;
  group.add(screenDisplay);

  // 4c. Desktop Keyboard (Clavier d'ordinateur)
  const keyboardGeom = new THREE.BoxGeometry(0.34, 0.016, 0.14);
  const keyboard = new THREE.Mesh(keyboardGeom, compMat);
  keyboard.position.set(0.26, 0.86 + 0.008, 0.95);
  keyboard.rotation.y = -0.2;
  group.add(keyboard);

  // 4d. Optical Mouse
  const mouse = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.08), compMat);
  mouse.position.set(0.45, 0.86 + 0.01, 0.92);
  group.add(mouse);

  // 4e. Thermal Receipt Printer (Imprimante tickets de caisse)
  const printer = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.16), compMat);
  printer.position.set(0.42, 0.86 + 0.06, 1.15);
  group.add(printer);
  // Paper tape coming out
  const paper = new THREE.Mesh(
    new THREE.PlaneGeometry(0.06, 0.08),
    new THREE.MeshBasicMaterial({ color: 0xFFFFFF, side: THREE.DoubleSide })
  );
  paper.rotation.x = Math.PI / 3;
  paper.position.set(0.42, 0.86 + 0.13, 1.15);
  group.add(paper);

  // 5. CAISSIÈRE EN FACE PRÊTE À GÉRER LA CAISSE (3D Cashier character model)
  const cashierGroup = new THREE.Group();
  cashierGroup.position.set(0.68, 0, 0.75); // Seated/standing behind table facing counter
  cashierGroup.rotation.y = -Math.PI / 2 + 0.25;

  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xF7D0B4, // warm peach skin tone
    roughness: 0.7,
  });

  const apronMat = new THREE.MeshStandardMaterial({
    color: 0x059669, // Supermarket emerald green staff apron
    roughness: 0.6,
  });

  const shirtMat = new THREE.MeshStandardMaterial({
    color: 0xF8FAFC, // white collared blouse
    roughness: 0.6,
  });

  const pantsMat = new THREE.MeshStandardMaterial({
    color: 0x1E293B, // dark navy trousers
    roughness: 0.7,
  });

  const hairMat = new THREE.MeshStandardMaterial({
    color: 0x451A03, // chestnut brunette hair
    roughness: 0.8,
  });

  // Cashier Stool / Chair
  const stoolBase = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 16), compMat);
  stoolBase.position.set(0, 0.02, 0);
  cashierGroup.add(stoolBase);

  const stoolStem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.52, 12), chromeMat);
  stoolStem.position.set(0, 0.28, 0);
  cashierGroup.add(stoolStem);

  const stoolSeat = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.06, 16), compMat);
  stoolSeat.position.set(0, 0.55, 0);
  cashierGroup.add(stoolSeat);

  // Legs in trousers
  const legGeom = new THREE.CylinderGeometry(0.06, 0.05, 0.55, 10);
  const leftLeg = new THREE.Mesh(legGeom, pantsMat);
  leftLeg.position.set(-0.1, 0.28, 0.1);
  cashierGroup.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeom, pantsMat);
  rightLeg.position.set(0.1, 0.28, 0.1);
  cashierGroup.add(rightLeg);

  // Torso with white shirt and green apron
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.48, 0.22), shirtMat);
  torso.position.set(0, 0.80, 0);
  torso.castShadow = true;
  cashierGroup.add(torso);

  const apron = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.44, 0.23), apronMat);
  apron.position.set(0, 0.78, 0.01);
  cashierGroup.add(apron);

  // Staff Name Badge ("Camille")
  const badge = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 0.045, 0.01),
    new THREE.MeshStandardMaterial({ color: 0xFDE047, roughness: 0.3 })
  );
  badge.position.set(-0.09, 0.88, 0.13);
  cashierGroup.add(badge);

  // Neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.10, 12), skinMat);
  neck.position.set(0, 1.06, 0);
  cashierGroup.add(neck);

  // Head with friendly facial details
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), skinMat);
  head.position.set(0, 1.18, 0);
  head.castShadow = true;
  cashierGroup.add(head);

  // Hair (stylish bun + fringe)
  const hairBase = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 16), hairMat);
  hairBase.position.set(0, 1.21, -0.02);
  cashierGroup.add(hairBase);

  const hairBun = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 12), hairMat);
  hairBun.position.set(0, 1.28, -0.11);
  cashierGroup.add(hairBun);

  // Friendly eyes
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1E293B });
  const eyeLeft = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 8), eyeMat);
  eyeLeft.position.set(-0.042, 1.19, 0.11);
  cashierGroup.add(eyeLeft);

  const eyeRight = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 8), eyeMat);
  eyeRight.position.set(0.042, 1.19, 0.11);
  cashierGroup.add(eyeRight);

  // Smile
  const smile = new THREE.Mesh(
    new THREE.TorusGeometry(0.025, 0.005, 8, 12, Math.PI),
    new THREE.MeshBasicMaterial({ color: 0xE11D48 })
  );
  smile.rotation.x = Math.PI / 2;
  smile.position.set(0, 1.14, 0.11);
  cashierGroup.add(smile);

  // Left Arm (resting forward on counter ready to receive items)
  const armGeom = new THREE.CylinderGeometry(0.045, 0.04, 0.38, 10);
  const leftArm = new THREE.Mesh(armGeom, shirtMat);
  leftArm.position.set(-0.24, 0.78, 0.12);
  leftArm.rotation.x = Math.PI / 4;
  leftArm.rotation.z = -0.15;
  cashierGroup.add(leftArm);

  const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 10), skinMat);
  leftHand.position.set(-0.25, 0.65, 0.28);
  cashierGroup.add(leftHand);

  // Right Arm (holding barcode scanner towards conveyor belt, ready to scan)
  const rightArm = new THREE.Mesh(armGeom, shirtMat);
  rightArm.position.set(0.24, 0.82, 0.14);
  rightArm.rotation.x = Math.PI / 3;
  rightArm.rotation.y = -0.3;
  cashierGroup.add(rightArm);

  const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 10), skinMat);
  rightHand.position.set(0.22, 0.72, 0.32);
  cashierGroup.add(rightHand);

  // Handheld Barcode Scanner pistol held in right hand
  const scannerHandle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.016, 0.018, 0.12, 8),
    new THREE.MeshStandardMaterial({ color: 0xF59E0B })
  );
  scannerHandle.rotation.x = Math.PI / 2.5;
  scannerHandle.position.set(0.22, 0.73, 0.35);
  cashierGroup.add(scannerHandle);

  const scannerHead = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.05, 0.09),
    new THREE.MeshStandardMaterial({ color: 0x1E293B })
  );
  scannerHead.position.set(0.22, 0.77, 0.39);
  cashierGroup.add(scannerHead);

  group.add(cashierGroup);

  // 6. Caisse Lane Overhead Number Sign (Suspended cleanly from ceiling)
  const laneSignCanvas = document.createElement('canvas');
  laneSignCanvas.width = 256;
  laneSignCanvas.height = 256;
  const lctx = laneSignCanvas.getContext('2d')!;
  lctx.fillStyle = '#059669'; // Emerald green caisse ouverte
  lctx.fillRect(0, 0, 256, 256);
  lctx.fillStyle = '#FFFFFF';
  lctx.font = 'bold 120px sans-serif';
  lctx.textAlign = 'center';
  lctx.textBaseline = 'middle';
  lctx.fillText(`${laneNumber}`, 128, 128);
  const laneTex = new THREE.CanvasTexture(laneSignCanvas);
  laneTex.colorSpace = THREE.SRGBColorSpace;

  const laneSignGeom = new THREE.BoxGeometry(0.55, 0.55, 0.12);
  const laneSign = new THREE.Mesh(laneSignGeom, new THREE.MeshStandardMaterial({ map: laneTex }));
  laneSign.position.set(0, 4.0, 0);
  group.add(laneSign);

  // Suspension wire from ceiling
  const suspWire = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.8, 6), chromeMat);
  suspWire.position.set(0, 4.9, 0);
  group.add(suspWire);

  return group;
}

/**
 * Creates 3D Procedural Product Models (Composite 3-8 parts each)
 */
export function createProduct3DModel(product: Product): THREE.Group {
  const group = new THREE.Group();
  group.name = `prod_${product.id}`;
  // User data for raycasting
  group.userData = { productId: product.id, product };

  switch (product.modelType) {
    case 'baguette': {
      // Golden French baguette with crust scoring
      const crustMat = new THREE.MeshStandardMaterial({
        color: 0xD97706,
        roughness: 0.8,
        metalness: 0.05,
      });
      const loafGeom = new THREE.CylinderGeometry(0.045, 0.04, 0.55, 12);
      const loaf = new THREE.Mesh(loafGeom, crustMat);
      loaf.rotation.z = Math.PI / 2;
      loaf.position.y = 0.05;
      loaf.castShadow = true;
      group.add(loaf);

      // Paper sleeve wrapper around center
      const sleeveMat = new THREE.MeshStandardMaterial({ color: 0xFDE68A, roughness: 0.9 });
      const sleeveGeom = new THREE.CylinderGeometry(0.047, 0.047, 0.18, 12);
      const sleeve = new THREE.Mesh(sleeveGeom, sleeveMat);
      sleeve.rotation.z = Math.PI / 2;
      sleeve.position.set(0, 0.05, 0);
      group.add(sleeve);
      break;
    }

    case 'croissant': {
      // Curved golden viennoiserie
      const croissantMat = new THREE.MeshStandardMaterial({
        color: 0xB45309,
        roughness: 0.6,
        metalness: 0.1,
      });
      const bodyGeom = new THREE.TorusGeometry(0.09, 0.045, 10, 20, Math.PI * 1.2);
      const croissant = new THREE.Mesh(bodyGeom, croissantMat);
      croissant.rotation.x = Math.PI / 2;
      croissant.position.y = 0.05;
      croissant.castShadow = true;
      group.add(croissant);
      break;
    }

    case 'brioche': {
      // Braided brioche loaf with pearl sugar
      const briocheMat = new THREE.MeshStandardMaterial({ color: 0x92400E, roughness: 0.7 });
      [-0.1, 0, 0.1].forEach((bx) => {
        const lump = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 12), briocheMat);
        lump.position.set(bx, 0.06, 0);
        lump.scale.set(1, 0.8, 1.2);
        lump.castShadow = true;
        group.add(lump);
      });
      break;
    }

    case 'apple_crate':
    case 'orange_crate':
    case 'banana_crate': {
      // Wooden crate
      const crateMat = new THREE.MeshStandardMaterial({ color: 0x78350F, roughness: 0.85 });
      const crateBase = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.08, 0.3), crateMat);
      crateBase.position.y = 0.04;
      crateBase.castShadow = true;
      group.add(crateBase);

      // Stacked fruits
      const fruitColor =
        product.modelType === 'apple_crate' ? 0xDC2626 :
        product.modelType === 'orange_crate' ? 0xF97316 : 0xEAB308;

      const fruitMat = new THREE.MeshStandardMaterial({
        color: fruitColor,
        roughness: 0.35,
        metalness: 0.05,
      });

      for (let fx = -0.12; fx <= 0.12; fx += 0.08) {
        for (let fz = -0.08; fz <= 0.08; fz += 0.08) {
          const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 10), fruitMat);
          fruit.position.set(fx, 0.09 + (fx % 0.02), fz);
          group.add(fruit);
        }
      }
      break;
    }

    case 'milk_bottle': {
      // White plastic milk bottle with blue cap and label
      const bottleMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.3 });
      const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.24, 16), bottleMat);
      bottle.position.y = 0.12;
      bottle.castShadow = true;
      group.add(bottle);

      // Blue cap
      const capMat = new THREE.MeshStandardMaterial({ color: 0x2563EB, roughness: 0.4 });
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.03, 16), capMat);
      cap.position.y = 0.25;
      group.add(cap);

      // Label band
      const labelMat = new THREE.MeshStandardMaterial({ color: 0x93C5FD, roughness: 0.6 });
      const label = new THREE.Mesh(new THREE.CylinderGeometry(0.057, 0.057, 0.1, 16), labelMat);
      label.position.y = 0.12;
      group.add(label);
      break;
    }

    case 'cheese_wheel': {
      // Camembert round wooden box
      const boxMat = new THREE.MeshStandardMaterial({ color: 0xFEF3C7, roughness: 0.8 });
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 18), boxMat);
      wheel.position.y = 0.03;
      wheel.castShadow = true;
      group.add(wheel);

      // Top label sticker
      const stickerMat = new THREE.MeshStandardMaterial({ color: 0xDC2626, roughness: 0.5 });
      const sticker = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.005, 18), stickerMat);
      sticker.position.y = 0.062;
      group.add(sticker);
      break;
    }

    case 'yogurt_pack': {
      // 4-pack of yogurts
      const cupMat = new THREE.MeshStandardMaterial({ color: 0x38BDF8, roughness: 0.4 });
      const lidMat = new THREE.MeshStandardMaterial({ color: 0xF8FAFC, metalness: 0.6, roughness: 0.3 });

      [-0.055, 0.055].forEach((yx) => {
        [-0.055, 0.055].forEach((yz) => {
          const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.09, 12), cupMat);
          cup.position.set(yx, 0.045, yz);
          group.add(cup);

          const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.005, 12), lidMat);
          lid.position.set(yx, 0.092, yz);
          group.add(lid);
        });
      });
      break;
    }

    case 'salmon_fillet':
    case 'steak_tray':
    case 'chicken_pack': {
      // Black styrofoam meat tray + plastic wrap
      const trayMat = new THREE.MeshStandardMaterial({ color: 0x0F172A, roughness: 0.6 });
      const tray = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.02, 0.16), trayMat);
      tray.position.y = 0.01;
      group.add(tray);

      const meatColor =
        product.modelType === 'salmon_fillet' ? 0xFB923C :
        product.modelType === 'steak_tray' ? 0x991B1B : 0xFDE047;

      const meat = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.04, 0.12),
        new THREE.MeshStandardMaterial({ color: meatColor, roughness: 0.5 })
      );
      meat.position.y = 0.035;
      meat.castShadow = true;
      group.add(meat);
      break;
    }

    case 'pasta_box':
    case 'cereal_box': {
      // Printed rectangular grocery box
      const boxColor = product.modelType === 'pasta_box' ? 0x0284C7 : 0xD97706;
      const boxMat = new THREE.MeshStandardMaterial({ color: boxColor, roughness: 0.6 });
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.26, 0.07), boxMat);
      box.position.y = 0.13;
      box.castShadow = true;
      group.add(box);
      break;
    }

    case 'olive_oil':
    case 'juice_bottle': {
      // Bottle with neck and cap
      const liquidColor = product.modelType === 'olive_oil' ? 0x3F6212 : 0xEA580C;
      const bottleMat = new THREE.MeshStandardMaterial({
        color: liquidColor,
        roughness: 0.2,
        metalness: 0.1,
        transparent: true,
        opacity: 0.85,
      });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.22, 16), bottleMat);
      body.position.y = 0.11;
      group.add(body);

      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.035, 0.08, 12), bottleMat);
      neck.position.y = 0.24;
      group.add(neck);

      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.022, 0.03, 12),
        new THREE.MeshStandardMaterial({ color: 0xF59E0B, metalness: 0.8, roughness: 0.2 })
      );
      cap.position.y = 0.29;
      group.add(cap);
      break;
    }

    case 'frozen_pizza': {
      // Square printed pizza box
      const pizzaBoxMat = new THREE.MeshStandardMaterial({ color: 0x991B1B, roughness: 0.6 });
      const pbox = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 0.28), pizzaBoxMat);
      pbox.position.y = 0.02;
      pbox.castShadow = true;
      group.add(pbox);
      break;
    }

    case 'ice_cream_tub':
    default: {
      // Cylindrical ice cream tub with lid
      const tubMat = new THREE.MeshStandardMaterial({ color: 0x3B82F6, roughness: 0.5 });
      const tub = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.05, 0.14, 16), tubMat);
      tub.position.y = 0.07;
      tub.castShadow = true;
      group.add(tub);

      const lidMat = new THREE.MeshStandardMaterial({ color: 0x1E3A8A, roughness: 0.4 });
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.02, 16), lidMat);
      lid.position.y = 0.145;
      group.add(lid);
      break;
    }
  }

  return group;
}
