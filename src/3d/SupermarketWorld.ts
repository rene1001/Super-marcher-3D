import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { AISLES } from '../data/supermarketData';
import { AisleInfo, Product } from '../types/supermarket';
import {
  createCheckoutCounter,
  createProduct3DModel,
  createShoppingCartModel,
  createSupermarketCeilingTextures,
  createSupermarketFloorTextures,
  createSupermarketShelfUnit,
} from './proceduralModels';
import { sounds } from '../utils/audio';

export type CameraViewMode = 'cart' | 'free' | 'topdown';

interface WorldCallbacks {
  onHoverProduct: (product: Product | null, screenPos: { x: number; y: number } | null) => void;
  onClickProduct: (product: Product) => void;
  onCartMove: (speed: number) => void;
}

export class SupermarketWorld {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private pmrem: THREE.PMREMGenerator | null = null;

  private isSoftwareGl: boolean = false;
  private animationFrameId: number = 0;
  private isDisposed: boolean = false;

  // Shopping cart
  private cartMesh: THREE.Group | null = null;
  private cartItemsContainer: THREE.Group | null = null;

  // Product meshes lookup
  private interactiveProductMeshes: THREE.Object3D[] = [];
  private hoveredMesh: THREE.Object3D | null = null;
  private hoveredOriginalScale: THREE.Vector3 = new THREE.Vector3(1, 1, 1);

  // Dynamic Shelf & Product Groups
  private currentAisles: AisleInfo[] = AISLES;
  private currentProducts: Product[] = [];
  private shelfGroup: THREE.Group = new THREE.Group();
  private productsGroup: THREE.Group = new THREE.Group();

  // Player position & movement
  private playerPos: THREE.Vector3 = new THREE.Vector3(0, 1.6, 12);
  private targetPlayerPos: THREE.Vector3 = new THREE.Vector3(0, 1.6, 12);
  private playerRotation: number = 0; // Yaw angle (facing north/aisles)
  private targetPlayerRotation: number = 0;

  // View mode
  private viewMode: CameraViewMode = 'cart';

  // Input state
  private keys: Record<string, boolean> = {};
  private isDraggingMouse: boolean = false;
  private previousMouseX: number = 0;
  private previousMouseY: number = 0;
  private pitchAngle: number = 0;

  // Raycasting
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouseCoords: THREE.Vector2 = new THREE.Vector2(-999, -999);

  // Dynamic flying item animations (items flying from shelf to cart)
  private flyingItems: Array<{
    mesh: THREE.Object3D;
    start: THREE.Vector3;
    end: THREE.Vector3;
    progress: number;
    rotationSpeed: THREE.Vector3;
  }> = [];

  private callbacks: WorldCallbacks;

  // Bounding boxes for collision (aisle shelves & outer walls)
  private colliders: THREE.Box3[] = [];

  constructor(
    container: HTMLElement,
    products: Product[],
    aislesOrCallbacks: AisleInfo[] | WorldCallbacks,
    optionalCallbacks?: WorldCallbacks
  ) {
    this.container = container;
    if (Array.isArray(aislesOrCallbacks)) {
      this.currentAisles = aislesOrCallbacks;
      this.callbacks = optionalCallbacks!;
    } else {
      this.currentAisles = AISLES;
      this.callbacks = aislesOrCallbacks;
    }
    this.currentProducts = products;

    // Detect software WebGL
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xF8FAFC);
    this.scene.fog = new THREE.FogExp2(0xF8FAFC, 0.018);

    // Camera
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 80);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(width, height);
    container.appendChild(this.renderer.domElement);

    // Add dynamic shelf and products containers to scene
    this.scene.add(this.shelfGroup);
    this.scene.add(this.productsGroup);

    // Studio Environment Reflection (RoomEnvironment)
    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = this.pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    this.setupLighting();
    this.setupSupermarketArchitecture();
    this.setupAislesAndProducts(products, this.currentAisles);
    this.setupShoppingCart();
    this.setupEventListeners();

    // Start render loop on next animation frame
    this.animationFrameId = requestAnimationFrame(this.tick);
  }

  private setupLighting() {
    // Cool daylight fill
    const hemiLight = new THREE.HemisphereLight(0xF8FAFC, 0xCBD5E1, 0.7);
    hemiLight.position.set(0, 10, 0);
    this.scene.add(hemiLight);

    // Warm Key Directional Sunlight through supermarket skylights
    const sunLight = new THREE.DirectionalLight(0xFFFBEB, 1.3);
    sunLight.position.set(10, 15, 12);
    if (!this.isSoftwareGl) {
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.width = 1024;
      sunLight.shadow.mapSize.height = 1024;
      sunLight.shadow.bias = -0.0005;
      sunLight.shadow.normalBias = 0.02;
      sunLight.shadow.camera.near = 0.5;
      sunLight.shadow.camera.far = 40;
      sunLight.shadow.camera.left = -18;
      sunLight.shadow.camera.right = 18;
      sunLight.shadow.camera.top = 18;
      sunLight.shadow.camera.bottom = -18;
    }
    this.scene.add(sunLight);

    // Suspended Continuous Linear LED luminaires above aisles (rampes d'éclairage suspendues)
    for (const x of [-10, 0, 10]) {
      for (let z = -10; z <= 10; z += 5) {
        // Luminaire housing (slim white aluminium)
        const fixtureGeom = new THREE.BoxGeometry(0.2, 0.12, 4.2);
        const fixtureMat = new THREE.MeshStandardMaterial({
          color: 0xF8FAFC,
          roughness: 0.3,
          metalness: 0.2,
        });
        const fixture = new THREE.Mesh(fixtureGeom, fixtureMat);
        fixture.position.set(x, 5.2, z);
        this.scene.add(fixture);

        // Glowing bottom diffuser lens
        const diffuserGeom = new THREE.BoxGeometry(0.16, 0.02, 4.1);
        const diffuserMat = new THREE.MeshStandardMaterial({
          color: 0xFFFFFF,
          emissive: 0xFFFBF0,
          emissiveIntensity: 1.1,
          roughness: 0.1,
        });
        const diffuser = new THREE.Mesh(diffuserGeom, diffuserMat);
        diffuser.position.set(x, 5.14, z);
        this.scene.add(diffuser);

        // Steel suspension wires connected up to ceiling (y = 5.2 to y = 5.8)
        [-1.8, 1.8].forEach((wireZ) => {
          const wireGeom = new THREE.CylinderGeometry(0.008, 0.008, 0.6, 6);
          const wireMat = new THREE.MeshStandardMaterial({ color: 0x94A3B8, metalness: 0.9, roughness: 0.2 });
          const wire = new THREE.Mesh(wireGeom, wireMat);
          wire.position.set(x, 5.5, z + wireZ);
          this.scene.add(wire);
        });
      }
    }
  }

  private setupSupermarketArchitecture() {
    // 1. Realistic Polished Ceramic Tiled Floor (36m x 36m)
    const { map: floorMap, bumpMap: floorBump, roughnessMap: floorRough } = createSupermarketFloorTextures();
    const floorGeom = new THREE.PlaneGeometry(36, 36);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorMap,
      bumpMap: floorBump,
      bumpScale: 0.05,
      roughnessMap: floorRough,
      roughness: 0.22,
      metalness: 0.06,
    });
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Wall baseboard skirting around floor perimeter
    const skirtingMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4 });
    const skirtingH = 0.18;
    const skirtingD = 0.06;
    const sNorth = new THREE.Mesh(new THREE.BoxGeometry(35.5, skirtingH, skirtingD), skirtingMat);
    sNorth.position.set(0, skirtingH / 2, -15.7);
    this.scene.add(sNorth);
    const sWest = new THREE.Mesh(new THREE.BoxGeometry(skirtingD, skirtingH, 35.5), skirtingMat);
    sWest.position.set(-15.7, skirtingH / 2, 0);
    this.scene.add(sWest);
    const sEast = new THREE.Mesh(new THREE.BoxGeometry(skirtingD, skirtingH, 35.5), skirtingMat);
    sEast.position.set(15.7, skirtingH / 2, 0);
    this.scene.add(sEast);

    // 2. High Modular Suspended Ceiling with Acoustic Grid, Recessed LED Panels & HVAC
    const { map: ceilingMap, emissiveMap: ceilingEmissive } = createSupermarketCeilingTextures();
    const ceilingGeom = new THREE.PlaneGeometry(36, 36);
    const ceilingMat = new THREE.MeshStandardMaterial({
      map: ceilingMap,
      emissiveMap: ceilingEmissive,
      emissive: new THREE.Color(0xFFFFFF),
      emissiveIntensity: 0.65,
      roughness: 0.8,
      metalness: 0.1,
    });
    const ceiling = new THREE.Mesh(ceilingGeom, ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 5.8;
    this.scene.add(ceiling);

    // Industrial air ventilation ducts running overhead
    for (let z = -10; z <= 10; z += 10) {
      const ductGeom = new THREE.CylinderGeometry(0.35, 0.35, 34, 16);
      const ductMat = new THREE.MeshStandardMaterial({
        color: 0x94A3B8,
        metalness: 0.85,
        roughness: 0.25,
      });
      const duct = new THREE.Mesh(ductGeom, ductMat);
      duct.rotation.z = Math.PI / 2;
      duct.position.set(0, 5.4, z);
      this.scene.add(duct);

      // Duct ceiling support brackets
      [-12, -4, 4, 12].forEach((bx) => {
        const strapGeom = new THREE.BoxGeometry(0.08, 0.45, 0.8);
        const strapMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7 });
        const strap = new THREE.Mesh(strapGeom, strapMat);
        strap.position.set(bx, 5.6, z);
        this.scene.add(strap);
      });
    }

    // 3. Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xF1F5F9, roughness: 0.7 });
    const wallThickness = 0.5;
    const wallHeight = 6.0;

    // Back Wall (North: z = -16)
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(36, wallHeight, wallThickness), wallMat);
    backWall.position.set(0, wallHeight / 2, -16);
    backWall.receiveShadow = true;
    this.scene.add(backWall);

    // Left Wall (West: x = -16)
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, 36), wallMat);
    leftWall.position.set(-16, wallHeight / 2, 0);
    leftWall.receiveShadow = true;
    this.scene.add(leftWall);

    // Right Wall (East: x = 16)
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, 36), wallMat);
    rightWall.position.set(16, wallHeight / 2, 0);
    rightWall.receiveShadow = true;
    this.scene.add(rightWall);

    // Front Wall (South: z = 16) with glass supermarket entrance sliding doors
    const frontWallMat = new THREE.MeshStandardMaterial({ color: 0xE2E8F0, roughness: 0.8 });
    const fwLeft = new THREE.Mesh(new THREE.BoxGeometry(13, wallHeight, wallThickness), frontWallMat);
    fwLeft.position.set(-10, wallHeight / 2, 16);
    this.scene.add(fwLeft);

    const fwRight = new THREE.Mesh(new THREE.BoxGeometry(13, wallHeight, wallThickness), frontWallMat);
    fwRight.position.set(10, wallHeight / 2, 16);
    this.scene.add(fwRight);

    // Automatic Glass Sliding Doors in center (Entrance / Exit)
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xBAE6FD,
      transparent: true,
      opacity: 0.45,
      roughness: 0.1,
    });
    const door1 = new THREE.Mesh(new THREE.BoxGeometry(3.2, 3.2, 0.08), glassMat);
    door1.position.set(-1.8, 1.6, 16);
    this.scene.add(door1);
    const door2 = new THREE.Mesh(new THREE.BoxGeometry(3.2, 3.2, 0.08), glassMat);
    door2.position.set(1.8, 1.6, 16);
    this.scene.add(door2);

    // Overhead Store Logo at entrance ("HYPERMARCHÉ 3D BIO & TERROIR")
    const logoCanvas = document.createElement('canvas');
    logoCanvas.width = 1024;
    logoCanvas.height = 256;
    const lctx = logoCanvas.getContext('2d')!;
    lctx.fillStyle = '#0F172A';
    lctx.fillRect(0, 0, 1024, 256);
    lctx.fillStyle = '#22C55E';
    lctx.font = 'bold 50px sans-serif';
    lctx.textAlign = 'center';
    lctx.fillText('🛒 GRAND SUPERMARCHÉ 3D', 512, 100);
    lctx.fillStyle = '#E2E8F0';
    lctx.font = '32px sans-serif';
    lctx.fillText('Produits Frais · Terroirs · Livraison Express', 512, 170);
    const logoTex = new THREE.CanvasTexture(logoCanvas);
    logoTex.colorSpace = THREE.SRGBColorSpace;
    const storeBanner = new THREE.Mesh(
      new THREE.BoxGeometry(8, 2, 0.1),
      new THREE.MeshStandardMaterial({ map: logoTex })
    );
    storeBanner.position.set(0, 4.4, 15.9);
    storeBanner.rotation.y = Math.PI;
    this.scene.add(storeBanner);

    // 4. Checkout Counters (3 caisses along z = 9)
    [-5, 0, 5].forEach((cx, idx) => {
      const checkout = createCheckoutCounter(idx + 1);
      checkout.position.set(cx, 0, 9);
      this.scene.add(checkout);

      // Add collision box for checkout
      this.colliders.push(
        new THREE.Box3(
          new THREE.Vector3(cx - 0.45, 0, 9 - 1.6),
          new THREE.Vector3(cx + 0.65, 2, 9 + 1.6)
        )
      );
    });
  }

  private setupAislesAndProducts(products: Product[], aisles: AisleInfo[] = this.currentAisles) {
    this.currentProducts = products;
    this.currentAisles = aisles;

    // Clear previous shelf and product meshes cleanly from their groups
    while (this.shelfGroup.children.length > 0) {
      this.shelfGroup.remove(this.shelfGroup.children[0]);
    }
    while (this.productsGroup.children.length > 0) {
      this.productsGroup.remove(this.productsGroup.children[0]);
    }
    this.interactiveProductMeshes = [];

    // Keep checkouts and walls colliders (z > 7.0 or near walls)
    this.colliders = this.colliders.filter(
      (c) => c.max.z > 7.0 || Math.abs(c.min.x) >= 15
    );

    aisles.forEach((aisle) => {
      // 1. Build Shelving Unit with dynamic tiers count and custom width
      const shelfUnit = createSupermarketShelfUnit(
        aisle.name,
        aisle.description,
        aisle.icon,
        aisle.color,
        aisle.tiersCount ?? 3,
        aisle.width ?? 6.0
      );
      shelfUnit.position.set(...aisle.position);
      shelfUnit.rotation.y = aisle.rotation;
      this.shelfGroup.add(shelfUnit);

      // Add dynamic collision box for shelf
      const halfW = (aisle.width ?? 6.0) / 2 + 0.3;
      this.colliders.push(
        new THREE.Box3(
          new THREE.Vector3(aisle.position[0] - halfW, 0, aisle.position[2] - 1.0),
          new THREE.Vector3(aisle.position[0] + halfW, 3.8, aisle.position[2] + 1.0)
        )
      );

      // 2. Populate Products for this aisle
      const aisleProducts = products.filter((p) => p.shelfId === aisle.id);
      const tierCount = aisle.tiersCount ?? 3;
      const tierYHeights =
        tierCount <= 3
          ? [0.65, 1.45, 2.25]
          : tierCount === 4
          ? [0.55, 1.20, 1.85, 2.50]
          : [0.50, 1.05, 1.60, 2.15, 2.70];

      aisleProducts.forEach((product) => {
        const prodModel = createProduct3DModel(product);

        const tierIndex = Math.min(product.shelfTier, tierYHeights.length - 1);
        const tierY = tierYHeights[tierIndex] ?? 1.45;

        // Slot X positions scaled by width
        const unitWidth = aisle.width ?? 6.0;
        const slotOffset = (unitWidth - 2.0) / 2;
        const slotPositions = [-slotOffset, 0, slotOffset];
        const slotX = slotPositions[product.slotIndex % 3] ?? 0;
        const slotZ = 0.35;

        prodModel.position.set(
          aisle.position[0] + slotX,
          tierY,
          aisle.position[2] + slotZ
        );

        // Clones for shelf fullness
        for (let i = 0; i < 3; i++) {
          const clone = prodModel.clone(true);
          clone.position.z += i * 0.15;
          clone.position.x += (i - 1) * 0.12;
          this.productsGroup.add(clone);
        }

        this.productsGroup.add(prodModel);
        this.interactiveProductMeshes.push(prodModel);
      });
    });
  }

  private setupShoppingCart() {
    this.cartMesh = createShoppingCartModel();
    this.cartItemsContainer = this.cartMesh.getObjectByName('cart_items_container') as THREE.Group;
    this.scene.add(this.cartMesh);
  }

  public updateAisleSections(newAisles: AisleInfo[], updatedProducts?: Product[]) {
    this.currentAisles = newAisles;
    this.setupAislesAndProducts(updatedProducts || this.currentProducts, newAisles);
  }

  public updateProducts(products: Product[]) {
    this.setupAislesAndProducts(products, this.currentAisles);
  }

  /**
   * Direct navigation to the desired product in the 3D supermarket.
   * Smoothly glides the customer's cart and camera right in front of the product's shelf.
   */
  public navigateToProduct(productId: string): boolean {
    const prodMesh = this.interactiveProductMeshes.find(
      (m) => m.userData?.productId === productId
    );
    if (!prodMesh) return false;

    // Find ideal position 2 meters in front of the product
    const targetX = prodMesh.position.x;
    const targetZ = prodMesh.position.z + 1.85;

    this.targetPlayerPos.set(targetX, 1.6, targetZ);
    this.targetPlayerRotation = 0; // face forward towards shelf
    this.pitchAngle = -0.05;

    // Pulse highlight target product
    prodMesh.scale.set(1.4, 1.4, 1.4);
    setTimeout(() => {
      if (prodMesh) prodMesh.scale.set(1, 1, 1);
    }, 2500);

    sounds.playPick();
    const prod = prodMesh.userData.product as Product;
    if (prod) {
      this.callbacks.onClickProduct(prod);
    }
    return true;
  }

  /**
   * Adds a product into the physical 3D shopping cart basket
   * Plays dynamic curved toss animation from shelf into cart
   */
  public addProductTo3DCart(product: Product) {
    sounds.playDropInCart();

    if (!this.cartItemsContainer || !this.cartMesh) return;

    // Create a mini 3D model for the cart basket
    const miniModel = createProduct3DModel(product);
    miniModel.scale.set(0.65, 0.65, 0.65);

    // Find starting position from shelf (or in front of player if not visible)
    const shelfMesh = this.interactiveProductMeshes.find(
      (m) => m.userData?.productId === product.id
    );
    const startWorldPos = shelfMesh
      ? shelfMesh.position.clone()
      : this.camera.position.clone().add(new THREE.Vector3(0, 0, -1));

    // End position in cart basket
    const basketOffset = new THREE.Vector3(
      (Math.random() - 0.5) * 0.3,
      0.05 + Math.random() * 0.1,
      (Math.random() - 0.5) * 0.4
    );

    const flyingMesh = miniModel.clone(true);
    this.scene.add(flyingMesh);

    this.flyingItems.push({
      mesh: flyingMesh,
      start: startWorldPos,
      end: this.cartMesh.position.clone().add(basketOffset),
      progress: 0,
      rotationSpeed: new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6
      ),
    });

    // Also add permanent item to cart container
    miniModel.position.copy(basketOffset);
    miniModel.rotation.set(0, Math.random() * Math.PI, 0);
    this.cartItemsContainer.add(miniModel);
  }

  public teleportToAisle(aisleId: string) {
    const aisle = this.currentAisles.find((a) => a.id === aisleId) || AISLES.find((a) => a.id === aisleId);
    if (!aisle) return;

    // Position player right in front of the aisle looking at shelves
    this.targetPlayerPos.set(aisle.position[0], 1.6, aisle.position[2] + 2.8);
    this.targetPlayerRotation = 0; // Face north towards shelves
  }

  public teleportToCheckout() {
    this.targetPlayerPos.set(-0.95, 1.45, 10.1);
    this.playerPos.copy(this.targetPlayerPos);
    this.targetPlayerRotation = -Math.PI / 2 + 0.28; // Face towards cashier, desktop computer & brown counter table
    this.playerRotation = this.targetPlayerRotation;
    this.pitchAngle = -0.12;
  }

  public setViewMode(mode: CameraViewMode) {
    this.viewMode = mode;
    if (mode === 'topdown') {
      this.pitchAngle = -Math.PI / 2.3;
    } else {
      this.pitchAngle = 0;
    }
  }

  public getViewMode(): CameraViewMode {
    return this.viewMode;
  }

  private setupEventListeners() {
    // Keyboard controls
    const onKeyDown = (e: KeyboardEvent) => {
      this.keys[e.key.toLowerCase()] = true;
      this.keys[e.code.toLowerCase()] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      this.keys[e.key.toLowerCase()] = false;
      this.keys[e.code.toLowerCase()] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Mouse drag navigation
    const canvas = this.renderer.domElement;
    const onMouseDown = (e: MouseEvent) => {
      this.isDraggingMouse = true;
      this.previousMouseX = e.clientX;
      this.previousMouseY = e.clientY;
    };
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      this.mouseCoords.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouseCoords.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (this.isDraggingMouse) {
        const deltaX = e.clientX - this.previousMouseX;
        const deltaY = e.clientY - this.previousMouseY;
        this.previousMouseX = e.clientX;
        this.previousMouseY = e.clientY;

        this.targetPlayerRotation -= deltaX * 0.005;
        this.pitchAngle = Math.max(-0.6, Math.min(0.6, this.pitchAngle - deltaY * 0.005));
      }
    };
    const onMouseUp = () => {
      this.isDraggingMouse = false;
    };

    // Click on 3D products
    const onClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clickCoords = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      this.raycaster.setFromCamera(clickCoords, this.camera);
      const intersects = this.raycaster.intersectObjects(this.interactiveProductMeshes, true);

      if (intersects.length > 0) {
        // Find top group containing product userData
        let current: THREE.Object3D | null = intersects[0].object;
        while (current && !current.userData?.product) {
          current = current.parent;
        }
        if (current && current.userData?.product) {
          sounds.playPick();
          this.callbacks.onClickProduct(current.userData.product as Product);
        }
      }
    };

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('click', onClick);

    // Resize
    const onResize = () => {
      if (!this.container || this.isDisposed) return;
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // Save cleanup references
    (this as unknown as { _cleanupListeners: () => void })._cleanupListeners = () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('click', onClick);
      window.removeEventListener('resize', onResize);
    };
  }

  /**
   * Virtual Joystick / Touch navigation helper for mobile
   */
  public handleVirtualMove(dx: number, dy: number) {
    const moveSpeed = 0.15;
    const forward = new THREE.Vector3(-Math.sin(this.playerRotation), 0, -Math.cos(this.playerRotation));
    const right = new THREE.Vector3(Math.cos(this.playerRotation), 0, -Math.sin(this.playerRotation));

    this.targetPlayerPos.addScaledVector(forward, -dy * moveSpeed);
    this.targetPlayerPos.addScaledVector(right, dx * moveSpeed);
  }

  public handleVirtualTurn(deltaYaw: number) {
    this.targetPlayerRotation += deltaYaw;
  }

  /**
   * Check collision against walls and aisles
   */
  private checkCollision(newPos: THREE.Vector3): boolean {
    // Outer perimeter limits
    if (newPos.x < -14 || newPos.x > 14 || newPos.z < -14 || newPos.z > 14) {
      return true;
    }

    // Aisle shelf units & checkout registers
    const playerRadius = 0.6;
    for (const box of this.colliders) {
      if (
        newPos.x + playerRadius > box.min.x &&
        newPos.x - playerRadius < box.max.x &&
        newPos.z + playerRadius > box.min.z &&
        newPos.z - playerRadius < box.max.z
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Software WebGL loop pacer (afterDraw)
   */
  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.animationFrameId = requestAnimationFrame(cb);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    if (!sync) {
      this.animationFrameId = requestAnimationFrame(cb);
      return;
    }
    gl.flush();
    let pollCount = 0;
    const poll = () => {
      if (this.isDisposed) {
        try { gl.deleteSync(sync); } catch {}
        return;
      }
      pollCount++;
      const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED && pollCount < 8) {
        this.animationFrameId = window.setTimeout(poll, 6);
      } else {
        try { gl.deleteSync(sync); } catch {}
        this.animationFrameId = window.setTimeout(cb, 60);
      }
    };
    this.animationFrameId = window.setTimeout(poll, 6);
  }

  private tick = () => {
    if (this.isDisposed) return;

    const delta = 0.016;

    // 1. Process movement inputs (WASD, ZQSD, Arrow keys)
    const moveSpeed = 5.0 * delta;
    const forward = new THREE.Vector3(-Math.sin(this.playerRotation), 0, -Math.cos(this.playerRotation));
    const right = new THREE.Vector3(Math.cos(this.playerRotation), 0, -Math.sin(this.playerRotation));

    const proposedPos = this.targetPlayerPos.clone();
    let isMoving = false;

    // Forward: W, Z, ArrowUp
    if (this.keys['w'] || this.keys['z'] || this.keys['arrowup'] || this.keys['keyw'] || this.keys['keyz']) {
      proposedPos.addScaledVector(forward, moveSpeed);
      isMoving = true;
    }
    // Backward: S, ArrowDown
    if (this.keys['s'] || this.keys['arrowdown'] || this.keys['keys']) {
      proposedPos.addScaledVector(forward, -moveSpeed * 0.7);
      isMoving = true;
    }
    // Left: A, Q, ArrowLeft
    if (this.keys['a'] || this.keys['q'] || this.keys['arrowleft'] || this.keys['keya'] || this.keys['keyq']) {
      proposedPos.addScaledVector(right, -moveSpeed * 0.7);
      isMoving = true;
    }
    // Right: D, ArrowRight
    if (this.keys['d'] || this.keys['arrowright'] || this.keys['keyd']) {
      proposedPos.addScaledVector(right, moveSpeed * 0.7);
      isMoving = true;
    }

    // Apply collision check
    if (!this.checkCollision(proposedPos)) {
      this.targetPlayerPos.copy(proposedPos);
    }

    // Sound feedback for shopping cart movement
    sounds.updateCartMovement(isMoving ? 1.0 : 0.0);
    this.callbacks.onCartMove(isMoving ? 1.0 : 0.0);

    // 2. Exponential smoothing for player position and camera rotation
    this.playerPos.lerp(this.targetPlayerPos, 0.12);
    this.playerRotation = THREE.MathUtils.damp(this.playerRotation, this.targetPlayerRotation, 10, delta);

    // 3. Update Camera and Shopping Cart based on ViewMode
    if (this.viewMode === 'cart') {
      // First person pushing shopping cart: cart is in front of camera
      this.camera.position.set(this.playerPos.x, this.playerPos.y, this.playerPos.z);
      this.camera.rotation.set(this.pitchAngle, this.playerRotation, 0, 'YXZ');

      if (this.cartMesh) {
        this.cartMesh.visible = true;
        // Cart sits 1.3 meters in front of the camera
        const cartOffset = new THREE.Vector3(0, -0.65, -1.3).applyAxisAngle(
          new THREE.Vector3(0, 1, 0),
          this.playerRotation
        );
        this.cartMesh.position.copy(this.playerPos).add(cartOffset);
        this.cartMesh.position.y = 0; // sits on ground
        this.cartMesh.rotation.y = this.playerRotation;
      }
    } else if (this.viewMode === 'free') {
      // Third person camera behind the player and shopping cart
      const behindOffset = new THREE.Vector3(0, 2.2, 3.2).applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        this.playerRotation
      );
      this.camera.position.copy(this.playerPos).add(behindOffset);
      this.camera.lookAt(this.playerPos.x, this.playerPos.y - 0.4, this.playerPos.z);

      if (this.cartMesh) {
        this.cartMesh.visible = true;
        this.cartMesh.position.copy(this.playerPos);
        this.cartMesh.position.y = 0;
        this.cartMesh.rotation.y = this.playerRotation;
      }
    } else if (this.viewMode === 'topdown') {
      // Bird's eye architectural view
      this.camera.position.set(0, 22, 1);
      this.camera.lookAt(0, 0, 0);

      if (this.cartMesh) {
        this.cartMesh.visible = true;
        this.cartMesh.position.copy(this.playerPos);
        this.cartMesh.position.y = 0;
        this.cartMesh.rotation.y = this.playerRotation;
      }
    }

    // 4. Update Flying Items into cart basket
    for (let i = this.flyingItems.length - 1; i >= 0; i--) {
      const item = this.flyingItems[i];
      item.progress += delta * 2.2;
      const t = Math.min(1, item.progress);

      // Parabolic arc trajectory
      const currentPos = new THREE.Vector3().lerpVectors(item.start, item.end, t);
      currentPos.y += Math.sin(t * Math.PI) * 1.2;
      item.mesh.position.copy(currentPos);

      item.mesh.rotation.x += item.rotationSpeed.x * delta;
      item.mesh.rotation.y += item.rotationSpeed.y * delta;

      if (t >= 1) {
        this.scene.remove(item.mesh);
        this.flyingItems.splice(i, 1);
      }
    }

    // 5. Raycasting Product Hover
    this.raycaster.setFromCamera(this.mouseCoords, this.camera);
    const intersects = this.raycaster.intersectObjects(this.interactiveProductMeshes, true);

    if (intersects.length > 0) {
      let topMesh: THREE.Object3D | null = intersects[0].object;
      while (topMesh && !topMesh.userData?.product) {
        topMesh = topMesh.parent;
      }

      if (topMesh && topMesh.userData?.product) {
        if (this.hoveredMesh !== topMesh) {
          // Restore previous hovered mesh
          if (this.hoveredMesh) {
            this.hoveredMesh.scale.copy(this.hoveredOriginalScale);
          }
          this.hoveredMesh = topMesh;
          this.hoveredOriginalScale.copy(topMesh.scale);
          // Highlight scale
          topMesh.scale.multiplyScalar(1.12);
        }

        // Screen position for floating tooltip
        const screenPos = topMesh.position.clone().project(this.camera);
        const sx = ((screenPos.x + 1) / 2) * this.container.clientWidth;
        const sy = ((-screenPos.y + 1) / 2) * this.container.clientHeight;

        this.callbacks.onHoverProduct(topMesh.userData.product as Product, { x: sx, y: sy });
      }
    } else {
      if (this.hoveredMesh) {
        this.hoveredMesh.scale.copy(this.hoveredOriginalScale);
        this.hoveredMesh = null;
        this.callbacks.onHoverProduct(null, null);
      }
    }

    // 6. Render
    this.renderer.render(this.scene, this.camera);

    // Software WebGL pacing or standard rAF
    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.animationFrameId = requestAnimationFrame(this.tick);
    }
  };

  public dispose() {
    this.isDisposed = true;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      clearTimeout(this.animationFrameId);
    }
    if ((this as unknown as { _cleanupListeners?: () => void })._cleanupListeners) {
      (this as unknown as { _cleanupListeners: () => void })._cleanupListeners();
    }
    if (this.pmrem) {
      this.pmrem.dispose();
    }
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
