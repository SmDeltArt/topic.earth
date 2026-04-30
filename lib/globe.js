import * as THREE from 'https://esm.sh/three@0.170.0';
import { OrbitControls } from 'https://esm.sh/three@0.170.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://esm.sh/three@0.170.0/examples/jsm/loaders/GLTFLoader.js';
import { TIPPING_BOUNDARIES } from '../data/points.js';

/**
 * Globe renderer using Three.js
 * Handles 3D Earth visualization, markers, and camera controls
 */
export class GlobeRenderer {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      earthTexture: options.earthTexture || './earth_texture.png',
      minDistance: options.minDistance || 1.3,
      maxDistance: options.maxDistance || 6,
      autoRotate: options.autoRotate !== false,
      ...options
    };
    
    this.markers = [];
    this.activeMarkers = new Set();
    this.isFocused = false;
    this.markerClickCallback = null;
    this.planetClickCallback = null;
    this.locationMarker = null;
    this.solarSystemLoaded = false;
    this.solarSystemModel = null;
    this.solarSystemMixer = null;
    this.inSolarSystemView = false;
    this.inFeverMode = false;
    this.originalEarthPosition = null;
    this.feverTextures = [];
    this.feverCurrentIndex = 0;
    this.feverAnimationTime = 0;
    this.feverSpeed = 1.0;
    this.feverScenario = 'objective';
    this.feverYears = [1950, 1975, 2000, 2025, 2050, 2075, 2100, 2125];
    this.feverScenarioConfig = null;
    this.feverScenarioConfigPromise = null;
    this.feverTextureSets = null;
    this.textureCache = {
      mainBaseColor: new Map(),
      mainNormal: new Map(),
      mainMetallicRoughness: new Map(),
      mainMaterials: new Map(),
      fever: new Map()
    };
    this.lastFeverBrightnessBucket = null;
    this.tippingOverlay = null;
    this.tippingOverlayRoot = null;
    this.tippingSegments = {};
    this.tippingLabels = {};
    this.tippingOverlayVisible = true;
    this.amocOverlay = null;
    this.amocOverlayRoot = null;
    this.amocBranches = {};
    // Restore AMOC visibility from localStorage
    const savedAmocVisible = localStorage.getItem('euroearth_amoc_visible');
    this.amocOverlayVisible = savedAmocVisible === 'true';
    this.amocState = null;
    this.interactionMode = 'rotate'; // default mode
    this.cloudLayer = null;
    this.cloudLayerTexture = null;
    this.cloudLayerOptions = { radius: 1.032, opacity: 0.78, rotationSpeed: 0.00012 };

    // Fever sound: simple master toggle, ON by default
    // Persisted in localStorage, controlled only by user toggle
    try {
      const saved = localStorage.getItem('euroearth_fever_sound');
      this.feverSoundEnabled = saved === null ? true : (saved === 'true');
      if (saved === null) {
        localStorage.setItem('euroearth_fever_sound', 'true');
      }
    } catch (err) {
      this.feverSoundEnabled = true;
    }
    console.log('[Fever Sound] Initialized:', this.feverSoundEnabled ? 'ON' : 'OFF');
    
    this.init();
    this.animate();
  }

  init() {
    this.initScene();
    this.initCamera();
    this.initRenderer();
    this.initControls();
    this.initLights();
    this.createEarth();
    this.createAtmosphere();
    this.createStars();
    this.initRaycaster();
    this.createTooltip();
    this.addEventListeners();
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0e1a);
  }

  initCamera() {
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(
      45,
      aspect,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 2.5);
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true 
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);
  }

  initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = this.options.minDistance;
    this.controls.maxDistance = this.options.maxDistance;
    this.controls.enablePan = true;
    this.controls.rotateSpeed = 0.5;
    this.controls.zoomSpeed = 0.8;
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN
    };
    
    // Listen for zoom changes
    this.controls.addEventListener('change', () => {
      this.checkZoomLevel();
    });
  }
  
  checkZoomLevel() {
    // Removed automatic solar system loading on zoom
    // Solar system is now only loaded via explicit toggle
  }
  
  async loadSolarSystem() {
    if (this.solarSystemLoaded) return Promise.resolve();
    
    this.solarSystemLoaded = true;
    console.log('Loading solar system...');
    
    const loader = new GLTFLoader();
    
    try {
      const gltf = await new Promise((resolve, reject) => {
        loader.load(
          './solar-system.glb',
          resolve,
          undefined,
          reject
        );
      });
      
      this.solarSystemModel = gltf.scene;
      this.solarSystemModel.visible = false;
      
      // Setup animation mixer if animations exist
      if (gltf.animations && gltf.animations.length > 0) {
        this.solarSystemMixer = new THREE.AnimationMixer(this.solarSystemModel);
        gltf.animations.forEach((clip) => {
          const action = this.solarSystemMixer.clipAction(clip);
          action.play();
        });
      }
      
      // Find Earth object by direct name
      this.solarSystemEarthObjects = [];
      this.solarSystemModel.traverse((child) => {
        if (child.name === 'Earth') {
          this.solarSystemEarthObjects.push(child);
          console.log('Found Earth object:', child.name);
        }
      });
      
      this.scene.add(this.solarSystemModel);
      console.log('Solar system loaded - ready for transition');
      return Promise.resolve();
      
    } catch (error) {
      console.error('Error loading solar system:', error);
      this.solarSystemLoaded = false;
      return Promise.reject(error);
    }
  }
  
  transitionToSolarSystem() {
    if (this.inSolarSystemView) return;
    
    // Safety check - ensure solar system is loaded
    if (!this.solarSystemModel) {
      console.error('Solar system model not loaded');
      this.loadSolarSystem().then(() => {
        this.transitionToSolarSystem();
      }).catch(err => {
        console.error('Failed to load solar system:', err);
      });
      return;
    }
    
    this.inSolarSystemView = true;
    this.isPlanetFocused = false;
    console.log('Transitioning to solar system view...');
    
    // Store original earth position
    this.originalEarthPosition = this.earth.position.clone();
    
    // Show solar system, hide our globe
    this.solarSystemModel.visible = true;
    this.earth.visible = false;
    this.activeMarkers.forEach(marker => marker.visible = false);
    
    // Set max distance to allow viewing entire solar system
    this.controls.minDistance = 0.5;
    this.controls.maxDistance = 150;
    
    // Animate camera to show entire solar system from far away
    const startPos = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    
    // Position camera very far out to see entire solar system
    const targetPos = new THREE.Vector3(0, 30, 80);
    const targetLookAt = new THREE.Vector3(0, 0, 0);
    
    const duration = 2000;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = this.easeInOutCubic(progress);
      
      this.camera.position.lerpVectors(startPos, targetPos, eased);
      this.controls.target.lerpVectors(startTarget, targetLookAt, eased);
      this.controls.update();
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        console.log('Solar system transition complete - showing full view');
        // Dispatch event for view change
        window.dispatchEvent(new CustomEvent('viewModeChanged', { detail: { mode: 'solar-system' } }));
        
        // Auto-focus on Earth after transition
        setTimeout(() => {
          let earthObject = null;
          this.solarSystemModel.traverse((child) => {
            if (child.name === 'Earth') {
              earthObject = child;
            }
          });
          
          if (earthObject) {
            this.focusOnPlanet(earthObject);
            
            // Show Earth detail panel
            if (this.planetClickCallback) {
              const earthInfo = this.getPlanetInfo(earthObject);
              this.planetClickCallback(earthInfo);
            }
          }
        }, 500);
      }
    };
    
    animate();
  }

  setInteractionMode(mode) {
    this.interactionMode = mode;
  }

  initLights() {
    // Slightly stronger ambient for clearer ocean read in Fever mode
    this.ambientLight = new THREE.AmbientLight(0xffffff, 1.6);
    this.scene.add(this.ambientLight);

    // Add a cool hemisphere light to brighten ocean blues without overexposing
    // Sky color is a cool cyan, ground color a subtle dark navy for contrast
    this.hemiLight = new THREE.HemisphereLight(0x88eeff, 0x081229, 0.35);
    this.scene.add(this.hemiLight);

    // Keep a low-intensity directional light for subtle highlights (maintain natural look)
    this.keyLight = new THREE.DirectionalLight(0xffffff, 0.6);
    this.keyLight.position.set(5, 3, 5);
    this.scene.add(this.keyLight);
  }
  
  normalizeBoundaryKey(name) {
    // Normalize boundary names: remove prefixes, suffixes, and extra numbers
    return name
      .replace(/^(SEG_|LBL_)/, '')
      .replace(/[_\s]+/g, '_')
      .replace(/\.?\d+$/, '')
      .toLowerCase();
  }
  
  centerFeverOverlay(overlayScene, options = {}) {
    const { includeLabels = true, targetSize = 1.8 } = options;
    
    const meshes = [];
    overlayScene.traverse((child) => {
      if (child.isMesh) {
        const isLabel = child.userData.isAMOCLabel || 
                       child.name?.startsWith('LBL_') ||
                       child.name?.toLowerCase().includes('label');
        
        if (includeLabels || !isLabel) {
          meshes.push(child);
        }
      }
    });
    
    if (meshes.length === 0) return { scale: 1.0, center: new THREE.Vector3() };
    
    const bbox = new THREE.Box3();
    meshes.forEach(mesh => {
      const meshBox = new THREE.Box3().setFromObject(mesh);
      bbox.union(meshBox);
    });
    
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    bbox.getSize(size);
    bbox.getCenter(center);
    
    const maxDimension = Math.max(size.x, size.y, size.z);
    const scale = maxDimension > 0 ? targetSize / maxDimension : 1.0;
    
    overlayScene.position.sub(center);
    
    return { scale, center };
  }
  
  async loadAMOCOverlay() {
    if (this.amocOverlay) return Promise.resolve();
    
    const loader = new GLTFLoader();
    
    try {
      const gltf = await new Promise((resolve, reject) => {
        loader.load(
          './amoc_circular_overlay.glb',
          resolve,
          undefined,
          reject
        );
      });
      
      this.amocOverlay = gltf.scene;
      this.amocOverlayRoot = new THREE.Group();
      const amocPivot = new THREE.Group();
      amocPivot.add(this.amocOverlay);
      this.amocOverlayRoot.add(amocPivot);
      
      this.amocOverlay.rotation.x = Math.PI / 2;
      
      const branchMap = new Map();
      this.amocLabels = [];
      
      this.amocOverlay.traverse((child) => {
        if (child.isMesh && child.material) {
          const clonedMaterial = child.material.clone();
          clonedMaterial.transparent = true;
          clonedMaterial.depthWrite = false;
          child.material = clonedMaterial;
        }

        const lname = (child.name || '').toLowerCase();
        const isLabelByName = (child.name && child.name.startsWith('LBL_')) ||
                              lname.includes('label') ||
                              lname.includes('text') ||
                              lname.includes('lbl_');

        if (child.isMesh && isLabelByName) {
          child.userData.isAMOCLabel = true;
          child.userData.baseScale = child.scale.clone();
          this.amocLabels.push(child);
          child.renderOrder = 999;
          return;
        }

        if (!child.userData.isAMOCLabel) {
          if (lname.includes('warm') || lname.includes('gulf')) {
            if (!branchMap.has('warm_branch')) branchMap.set('warm_branch', []);
            branchMap.get('warm_branch').push(child);
          } else if (lname.includes('cold') || lname.includes('deep')) {
            if (!branchMap.has('cold_branch')) branchMap.set('cold_branch', []);
            branchMap.get('cold_branch').push(child);
          } else if (lname.includes('sink') || lname.includes('north')) {
            if (!branchMap.has('north_sink')) branchMap.set('north_sink', []);
            branchMap.get('north_sink').push(child);
          } else if (lname.includes('return') || lname.includes('south')) {
            if (!branchMap.has('south_return')) branchMap.set('south_return', []);
            branchMap.get('south_return').push(child);
          }
        }
      });
      
      this.amocBranches = Object.fromEntries(branchMap);
      
      // Build semantic AMOC label map by branch group
      this.amocLabelsByBranch = {
        warm_branch: [],
        cold_branch: [],
        north_sink: [],
        south_return: []
      };
      
      this.amocLabels.forEach(label => {
        const lname = (label.name || '').toLowerCase();
        if (lname.includes('warm') || lname.includes('gulf')) {
          this.amocLabelsByBranch.warm_branch.push(label);
        } else if (lname.includes('cold') || lname.includes('deep')) {
          this.amocLabelsByBranch.cold_branch.push(label);
        } else if (lname.includes('sink') || lname.includes('north')) {
          this.amocLabelsByBranch.north_sink.push(label);
        } else if (lname.includes('return') || lname.includes('south')) {
          this.amocLabelsByBranch.south_return.push(label);
        }
      });
      
      Object.values(this.amocBranches).forEach(list => {
        list.forEach(mesh => {
          if (!mesh.userData.baseScale) {
            mesh.userData.baseScale = mesh.scale.clone();
          }
        });
      });
      this.amocLabels.forEach(lbl => {
        if (!lbl.userData.baseScale) lbl.userData.baseScale = lbl.scale.clone();
      });

      const { scale } = this.centerFeverOverlay(this.amocOverlay, { includeLabels: true, targetSize: 1.8 });
      this.amocOverlayRoot.scale.setScalar(scale);
      
      this.scene.add(this.amocOverlayRoot);
      this.amocOverlayRoot.visible = false;
      
      console.log('[AMOC] Overlay centered with shared helper');
      return Promise.resolve();
      
    } catch (error) {
      console.error('[AMOC] Error loading overlay:', error);
      return Promise.reject(error);
    }
  }
  
  async loadTippingOverlay() {
    if (this.tippingOverlay) return Promise.resolve();
    
    const loader = new GLTFLoader();
    
    try {
      const gltf = await new Promise((resolve, reject) => {
        loader.load(
          './tipping_point_circular.glb',
          resolve,
          undefined,
          reject
        );
      });
      
      this.tippingOverlay = gltf.scene;
      
      // Create pivot hierarchy: Root (billboarded) -> Pivot -> GLB
      this.tippingOverlayRoot = new THREE.Group();
      this.tippingOverlayPivot = new THREE.Group();
      this.tippingOverlayPivot.add(this.tippingOverlay);
      this.tippingOverlayRoot.add(this.tippingOverlayPivot);
      
      // STEP 1: Apply local correction rotation FIRST
      this.tippingOverlay.rotation.x = Math.PI / 2;
      
      // STEP 2: Parse segments and labels, clone materials
      const segmentMap = new Map();
      const labelMap = new Map();
      const ignoredCurves = [];
      const segmentMeshes = [];
      
      this.tippingOverlay.traverse((child) => {
        // Clone materials for independent control
        if (child.isMesh && child.material) {
          const clonedMaterial = child.material.clone();
          clonedMaterial.transparent = true;
          clonedMaterial.depthWrite = false;
          child.material = clonedMaterial;
        }
        
        if (child.name.startsWith('SEG_')) {
          const normalizedKey = this.normalizeBoundaryKey(child.name.split('_').slice(1, -1).join('_'));
          if (!segmentMap.has(normalizedKey)) {
            segmentMap.set(normalizedKey, []);
          }
          segmentMap.get(normalizedKey).push(child);
          
          // Collect segment meshes for bounding box
          if (child.isMesh) {
            segmentMeshes.push(child);
          }
          
          // Start invisible
          if (child.material) {
            child.material.opacity = 0;
            child.renderOrder = 1;
          }
        } else if (child.name.startsWith('LBL_')) {
          // Ignore curve helper nodes
          if (child.name.includes('_Curve') || child.name.includes('Curve')) {
            ignoredCurves.push(child.name);
            return;
          }
          
          // Real label mesh (may have .001 or numeric suffix)
          const normalizedKey = this.normalizeBoundaryKey(child.name.replace('LBL_', ''));
          
          // Only store if it's an actual mesh (not a helper/empty)
          if (child.isMesh) {
            labelMap.set(normalizedKey, child);
            
            // Start with base color
            if (child.material) {
              child.material.color = new THREE.Color(0x88ccff);
              child.renderOrder = 2;
            }
          }
        }
      });
      
      // Convert maps to objects
      this.tippingSegments = Object.fromEntries(segmentMap);
      this.tippingLabels = Object.fromEntries(labelMap);
      
      // Sort segments numerically for each boundary
      Object.keys(this.tippingSegments).forEach(boundary => {
        this.tippingSegments[boundary].sort((a, b) => {
          const aNum = parseInt(a.name.match(/\d+$/)?.[0] || '0');
          const bNum = parseInt(b.name.match(/\d+$/)?.[0] || '0');
          return aNum - bNum;
        });
      });
      
      // Adjust label positions inward
      Object.values(this.tippingLabels).forEach(label => {
        if (label && label.position) {
          const labelPos = label.position.clone();
          const labelRadius = Math.sqrt(labelPos.x * labelPos.x + labelPos.y * labelPos.y);
          if (labelRadius > 0) {
            const targetRadius = labelRadius * 0.85;
            const relScale = targetRadius / labelRadius;
            label.position.x *= relScale;
            label.position.y *= relScale;
            label.scale.setScalar(1.0);
          }
        }
      });
      
      Object.values(this.tippingSegments).forEach(segments => {
        segments.forEach(seg => {
          if (seg && seg.position) {
            const segPos = seg.position.clone();
            const segRadius = Math.sqrt(segPos.x * segPos.x + segPos.y * segPos.y);
            if (segRadius > 0) {
              const targetRadius = segRadius * 0.95;
              const relScale = targetRadius / segRadius;
              seg.position.x *= relScale;
              seg.position.y *= relScale;
            }
          }
        });
      });
      
      const { scale, center } = this.centerFeverOverlay(this.tippingOverlay, { includeLabels: true, targetSize: 2.0 });
      this.tippingOverlayRoot.scale.setScalar(scale * 0.75);
      
      // Debug logging (report segment-derived scale and final centering)
      console.log('=== Tipping Overlay Debug ===');
      console.log('Ignored curve labels:', ignoredCurves);
      console.log('Segment boundaries found:', Object.keys(this.tippingSegments));
      console.log('Real label boundaries found:', Object.keys(this.tippingLabels));
      console.log('Final fit scale:', scale.toFixed(3), '(from segments only, post-rotation)');
      console.log('Final center offset:', center.toArray().map(v => v.toFixed(3)));
      console.log('=============================');
      
      // Initialize tipping threshold tracking
      this.tippingTriggered = {};
      // Build requiredBoundaries from the parsed tippingSegments to avoid undefined reference
      const requiredBoundaries = Object.keys(this.tippingSegments || {});
      requiredBoundaries.forEach(boundary => {
        this.tippingTriggered[boundary] = { forward: false, reverse: false };
      });
      
      this.scene.add(this.tippingOverlayRoot);
      this.tippingOverlayRoot.visible = false;
      
      console.log('[Tipping] Overlay centered with shared helper');
      return Promise.resolve();
      
    } catch (error) {
      console.error('Error loading tipping overlay:', error);
      return Promise.reject(error);
    }
  }

  detectBrowserFamily() {
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOSWebKit = /iphone|ipad|ipod/.test(userAgent);

    if (!isIOSWebKit && (userAgent.includes('chrome') || userAgent.includes('chromium') || userAgent.includes('edg/') || userAgent.includes('brave') || userAgent.includes('opera'))) {
      return 'chromium';
    } else if (userAgent.includes('firefox') || userAgent.includes('fxios')) {
      return 'firefox';
    } else if (userAgent.includes('safari') || userAgent.includes('crios') || isIOSWebKit) {
      return 'safari';
    }
    return 'unknown';
  }

  getTextureQualitySignals() {
    const userAgent = navigator.userAgent || '';
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) ||
      (/Macintosh/i.test(userAgent) && navigator.maxTouchPoints > 1);

    return {
      browserFamily: this.detectBrowserFamily(),
      isMobile,
      isWebGL2: this.renderer?.capabilities?.isWebGL2 === true,
      deviceMemory: navigator.deviceMemory || 4,
      hardwareConcurrency: navigator.hardwareConcurrency || 4,
      maxTextureSize: this.renderer?.capabilities?.maxTextureSize || 0
    };
  }

  async loadFeverScenarioConfig() {
    if (this.feverScenarioConfigPromise) {
      return this.feverScenarioConfigPromise;
    }

    this.feverScenarioConfigPromise = (async () => {
      try {
        const response = await fetch('./fever-scenarios.json?v=topic-earth-fever-json-i18n-20260422', { cache: 'force-cache' });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const config = await response.json();
        this.feverScenarioConfig = config;
        this.feverTextureSets = config.textureSets || {};

        if (Array.isArray(config.years) && config.years.length > 1) {
          this.feverYears = config.years.map(Number);
        }

        if (config.defaultScenario && config.scenarios && !config.scenarios[this.feverScenario]) {
          this.feverScenario = config.defaultScenario;
        }

        const scenarioKeys = Object.keys(config.scenarios || {}).join(', ');
        console.log(`[Fever Config] JSON loaded successfully from fever-scenarios.json (${this.feverYears.length} years; scenarios: ${scenarioKeys || 'none'})`);
        return config;
      } catch (error) {
        console.warn('[Fever Config] Could not load fever-scenarios.json, using hardcoded fallbacks:', error);
        this.feverScenarioConfig = null;
        this.feverTextureSets = null;
        return null;
      }
    })();

    return this.feverScenarioConfigPromise;
  }

  getFeverYears() {
    return [...this.feverYears];
  }

  getFeverScenarioData(scenario = this.getFeverScenario()) {
    return this.feverScenarioConfig?.scenarios?.[scenario] || null;
  }

  getClosestFeverMilestoneYear(year) {
    const years = this.feverYears.length ? this.feverYears : [1950, 1975, 2000, 2025, 2050, 2075, 2100, 2125];
    return years.reduce((closest, candidate) => {
      return Math.abs(candidate - year) < Math.abs(closest - year) ? candidate : closest;
    }, years[0]);
  }

  getFeverScenarioMilestone(scenario = this.getFeverScenario(), year = this.getFeverCurrentYear()) {
    const milestones = this.getFeverScenarioData(scenario)?.milestones;
    if (!milestones) return null;
    const closestYear = this.getClosestFeverMilestoneYear(Number(year));
    return milestones[String(closestYear)] || null;
  }
  normalizeTextureQualityPreference(preference, allow8k = false) {
    const allowed = allow8k ? ['1k', '4k', '8k'] : ['1k', '4k'];
    return allowed.includes(preference) ? preference : 'auto';
  }

  getAutoTextureQuality(logPrefix = 'Texture Quality', allow8k = false) {
    const settings = window.Settings?.get();
    const signals = this.getTextureQualitySignals();
    const preferLowOnNonChromium = settings?.preferLowResOnNonChromium !== false;

    if (preferLowOnNonChromium && signals.browserFamily !== 'chromium') {
      console.log(`[${logPrefix}] Auto detected: 1k (non-Chromium browser: ${signals.browserFamily})`);
      return '1k';
    }

    if (signals.isMobile) {
      console.log(`[${logPrefix}] Auto detected: 1k (mobile/touch device)`);
      return '1k';
    }

    if (!signals.isWebGL2) {
      console.log(`[${logPrefix}] Auto detected: 1k (WebGL2 unavailable)`);
      return '1k';
    }

    if (signals.deviceMemory < 4 || signals.hardwareConcurrency < 4 || signals.maxTextureSize < 4096) {
      console.log(`[${logPrefix}] Auto detected: 1k (low-end device: mem=${signals.deviceMemory}GB, cores=${signals.hardwareConcurrency}, maxTex=${signals.maxTextureSize})`);
      return '1k';
    }

    if (allow8k && signals.deviceMemory >= 8 && signals.hardwareConcurrency >= 8 && signals.maxTextureSize >= 8192 && (window.devicePixelRatio || 1) >= 1.5) {
      console.log(`[${logPrefix}] Auto detected: 8k (high-end WebGL2 desktop: ${signals.browserFamily}, mem=${signals.deviceMemory}GB, cores=${signals.hardwareConcurrency})`);
      return '8k';
    }

    console.log(`[${logPrefix}] Auto detected: 4k (WebGL2 desktop: ${signals.browserFamily}, mem=${signals.deviceMemory}GB, cores=${signals.hardwareConcurrency})`);
    return '4k';
  }

  getPreferredFeverLoopQuality() {
    const settings = window.Settings?.get();
    const rawPreference = settings?.feverLoopResolution || 'auto';

    console.log(`[Fever Quality] Setting: ${rawPreference}`);

    if (rawPreference === '8k') {
      console.log('[Fever Quality] Downgraded saved/requested 8k to 4k');
      return '4k';
    }

    const userPreference = this.normalizeTextureQualityPreference(rawPreference, false);
    if (userPreference !== 'auto') {
      console.log(`[Fever Quality] User manual resolved: ${userPreference}`);
      return userPreference;
    }

    const autoQuality = this.getAutoTextureQuality('Fever Quality', false);
    console.log(`[Fever Quality] Resolved: ${autoQuality}`);
    return autoQuality;
  }

  normalizeFeverTextureQuality(quality) {
    if (quality === '8k') {
      console.log('[Fever Quality] Downgraded requested 8k to 4k');
      return '4k';
    }

    const normalized = this.normalizeTextureQualityPreference(quality, false);
    return normalized === 'auto' ? this.getPreferredFeverLoopQuality() : normalized;
  }

  async loadFeverTextures(quality = null) {
    const resolvedQuality = this.normalizeFeverTextureQuality(quality || this.getPreferredFeverLoopQuality());
    console.log(`[Fever Textures] Loading with quality: ${resolvedQuality}`);

    const cached = this.textureCache.fever.get(resolvedQuality);
    if (cached?.textures?.length) {
      this.feverTextures = cached.textures;
      this.feverYears = cached.years;
      this.currentFeverQuality = resolvedQuality;
      console.log(`[Texture Cache] Reused Fever textures (${resolvedQuality}) instead of reloading`);
      return true;
    }

    await this.loadFeverScenarioConfig();

    const textureLoader = new THREE.TextureLoader();
    const years = Array.isArray(this.feverScenarioConfig?.years) && this.feverScenarioConfig.years.length
      ? this.feverScenarioConfig.years.map(Number)
      : [...this.feverYears];
    const textureSet = this.feverTextureSets?.[resolvedQuality] || {};
    const legacyTextureSet = this.feverTextureSets?.legacy || {};

    const loadTexturePaths = async (year) => {
      const configuredPath = textureSet[String(year)] ? `./${textureSet[String(year)]}` : null;
      const legacyPath = legacyTextureSet[String(year)] ? `./${legacyTextureSet[String(year)]}` : null;
      const paths = [...new Set([
        configuredPath,
        `./earth_${year}_${resolvedQuality}.png`,
        legacyPath,
        `./earth_${year}.png`,
        resolvedQuality !== '1k' ? `./earth_${year}_1k.png` : null
      ].filter(Boolean))];

      for (const path of paths) {
        try {
          const texture = await new Promise((resolve, reject) => {
            textureLoader.load(
              path,
              (tex) => {
                tex.colorSpace = THREE.SRGBColorSpace;
                tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
                tex.wrapS = THREE.RepeatWrapping;
                tex.repeat.x = -1;
                tex.offset.x = 1;
                console.log(`[Fever Textures] Loaded ${year}: ${path}`);
                resolve(tex);
              },
              undefined,
              reject
            );
          });
          return { year, texture };
        } catch (err) {
          console.log(`[Fever Textures] Fallback ${year}: ${path} not found, trying next...`);
        }
      }
      throw new Error(`No texture found for year ${year}`);
    };

    try {
      const results = await Promise.all(years.map(year => loadTexturePaths(year)));
      this.feverYears = years;
      this.feverTextures = results.map(r => r.texture);
      this.currentFeverQuality = resolvedQuality;
      this.textureCache.fever.set(resolvedQuality, {
        years: [...years],
        textures: [...this.feverTextures]
      });
      console.log(`[Fever Textures] All textures loaded and cached (quality: ${resolvedQuality})`);
      return true;
    } catch (error) {
      console.error('[Fever Textures] Error loading textures:', error);
      return false;
    }
  }

  getBaseColorTexturePath(quality) {
    return this.getMainBaseColorTexturePath(quality);
  }

  getMainBaseColorTexturePath(quality) {
    const path = this.getMainBaseColorTextureCandidates(quality)[0];
    console.log(`[Main Textures] BaseColor path chosen for ${quality}: ${path}`);
    return path;
  }

  getMainBaseColorTextureCandidates(quality) {
    const safeQuality = this.normalizeTextureQualityPreference(quality, true);
    const profiles = {
      '1k': [
        './Material.001_baseColor_1k.jpeg',
        './Material.001_baseColor_1k.jpg',
        './Material.001_baseColor.jpeg'
      ],
      '4k': [
        './Material.001_baseColor_4k.jpeg',
        './Material.001_baseColor_4k.jpg',
        './Material.001_baseColor.jpeg'
      ],
      '8k': [
        './Material.001_baseColor_8k.jpeg',
        './Material.001_baseColor.jpeg'
      ]
    };
    return profiles[safeQuality] || profiles['1k'];
  }

  getMainMaterialTexturePaths(quality) {
    const safeQuality = this.normalizeTextureQualityPreference(quality, true);
    const profiles = {
      '1k': {
        quality: '1k',
        baseColor: this.getMainBaseColorTexturePath('1k'),
        normal: './Material.001_normal_1k.jpeg',
        metallicRoughness: './Material.001_metallicRoughness_1k.png'
      },
      '4k': {
        quality: '4k',
        baseColor: this.getMainBaseColorTexturePath('4k'),
        normal: './Material.001_normal_4k.jpeg',
        metallicRoughness: './Material.001_metallicRoughness_4k.png'
      },
      '8k': {
        quality: '8k',
        baseColor: this.getMainBaseColorTexturePath('8k'),
        normal: './Material.001_normal_4k.jpeg',
        metallicRoughness: './Material.001_metallicRoughness_4k.png'
      }
    };
    return profiles[safeQuality] || profiles['1k'];
  }

  async reloadFeverTextures() {
    if (!this.inFeverMode) return;
    
    // Save current state
    const currentYear = this.getFeverCurrentYear();
    const currentScenario = this.getFeverScenario();
    const wasPaused = this.isFeverPaused();
    const wasReversed = this.isFeverReversed();
    const tippingVisible = this.getTippingOverlayVisible();
    const amocVisible = this.getAMOCOverlayVisible();
    const selectedBoundary = this.getSelectedBoundary();
    
    console.log(`[Fever Reload] Reloading textures, preserving year=${currentYear}, scenario=${currentScenario}`);
    
    this.showLoadingBar();
    const loaded = await this.loadFeverTextures();
    this.hideLoadingBar();
    
    if (!loaded) {
      console.error('[Fever Reload] Failed to reload textures');
      return;
    }
    
    // Restore state
    this.feverScenario = currentScenario;
    this.feverPaused = wasPaused;
    this.feverReverse = wasReversed;
    this.tippingOverlayVisible = tippingVisible;
    this.amocOverlayVisible = amocVisible;
    
    if (selectedBoundary) {
      this.selectBoundary(selectedBoundary);
    }
    
    // Re-apply textures and seek to saved year
    this.seekToYear(currentYear);
    
    console.log(`[Fever Reload] Textures reloaded, state restored`);
  }

  detectPreferredQuality() {
    const settings = window.Settings?.get();
    const manualQuality = this.normalizeTextureQualityPreference(settings?.baseTextureQuality || 'auto', true);

    if (manualQuality !== 'auto') {
      console.log(`[Texture Quality] Using manual setting: ${manualQuality}`);
      return manualQuality;
    }

    return this.getAutoTextureQuality('Texture Quality', true);
  }

  loadCachedTexture(path, cacheMap, cacheKey, label, configureTexture = null) {
    if (cacheMap.has(cacheKey)) {
      console.log(`[Texture Cache] Reused ${label}: ${path}`);
      return cacheMap.get(cacheKey);
    }

    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load(
      path,
      (loadedTexture) => {
        if (configureTexture) {
          configureTexture(loadedTexture);
        }
        console.log(`[${label}] Loaded: ${path}`);
      },
      undefined,
      (err) => console.error(`Error loading ${label} (${path}):`, err)
    );

    cacheMap.set(cacheKey, texture);
    return texture;
  }

  createMainEarthMaterial(qualityOrPath = '1k') {
    const isDirectPath = typeof qualityOrPath === 'string' && qualityOrPath.startsWith('./');
    const texturePaths = isDirectPath
      ? {
          quality: 'direct',
          baseColor: qualityOrPath,
          normal: './Material.001_normal_1k.jpeg',
          metallicRoughness: './Material.001_metallicRoughness_1k.png'
        }
      : this.getMainMaterialTexturePaths(qualityOrPath);
    const materialKey = isDirectPath ? texturePaths.baseColor : texturePaths.quality;

    if (this.textureCache.mainMaterials.has(materialKey)) {
      console.log(`[Texture Cache] Reused main material (${materialKey}) instead of rebuilding`);
      return this.textureCache.mainMaterials.get(materialKey);
    }

    console.log(`[Main Textures] Quality resolved: ${texturePaths.quality}`);
    console.log(`[Main Textures] BaseColor selected: ${texturePaths.baseColor}`);

    const baseColorTexture = this.loadCachedTexture(
      texturePaths.baseColor,
      this.textureCache.mainBaseColor,
      texturePaths.quality === 'direct' ? texturePaths.baseColor : texturePaths.quality,
      'Base Color',
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
      }
    );

    const normalTexture = this.loadCachedTexture(
      texturePaths.normal,
      this.textureCache.mainNormal,
      texturePaths.normal,
      'Normal Map',
      (texture) => {
        texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
      }
    );

    const metallicRoughnessTexture = this.loadCachedTexture(
      texturePaths.metallicRoughness,
      this.textureCache.mainMetallicRoughness,
      texturePaths.metallicRoughness,
      'Metallic/Roughness',
      (texture) => {
        texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
      }
    );

    const material = new THREE.MeshStandardMaterial({
      map: baseColorTexture,
      normalMap: normalTexture,
      normalScale: new THREE.Vector2(1.0, 1.0),
      metalnessMap: metallicRoughnessTexture,
      roughnessMap: metallicRoughnessTexture,
      metalness: 0.1,
      roughness: 0.9
    });

    this.textureCache.mainMaterials.set(materialKey, material);
    return material;
  }

  createEarth() {
    const geometry = new THREE.SphereGeometry(1, 64, 64);

    console.log('[Initial BaseColor] Loading 1k for fast boot');
    const material = this.createMainEarthMaterial('1k');

    this.earth = new THREE.Mesh(geometry, material);
    this.earth.rotation.y = Math.PI;
    this.scene.add(this.earth);

    setTimeout(() => {
      const preferredQuality = this.detectPreferredQuality();
      if (preferredQuality !== '1k' && this.earth) {
        console.log(`[BaseColor Upgrade] Loading ${preferredQuality} using cached material path when available`);
        this.earth.material = this.createMainEarthMaterial(preferredQuality);
        this.earth.material.needsUpdate = true;
        console.log(`[BaseColor Upgraded] Swapped to ${preferredQuality} without full texture rebuild`);
      }
    }, 100);
  }

  createAtmosphere() {
    const geometry = new THREE.SphereGeometry(1.15, 64, 64);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        stressLevel: { value: 0.0 }
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float stressLevel;
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.6 - dot(vNormal, vec3(0, 0, 1.0)), 2.0);
          vec3 coolColor = vec3(0.0, 0.83, 1.0);
          vec3 warmColor = vec3(1.0, 0.4, 0.2);
          vec3 color = mix(coolColor, warmColor, stressLevel * 0.5);
          gl_FragColor = vec4(color, 1.0) * intensity;
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true
    });

    this.atmosphere = new THREE.Mesh(geometry, material);
    this.scene.add(this.atmosphere);
  }

  createStars() {
    const starsGeometry = new THREE.BufferGeometry();
    const starPositions = [];

    for (let i = 0; i < 3000; i++) {
      const x = (Math.random() - 0.5) * 2000;
      const y = (Math.random() - 0.5) * 2000;
      const z = (Math.random() - 0.5) * 2000;
      starPositions.push(x, y, z);
    }

    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));

    const starsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1,
      transparent: true,
      opacity: 0.8
    });

    const stars = new THREE.Points(starsGeometry, starsMaterial);
    this.scene.add(stars);
  }

  initRaycaster() {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
  }

  createTooltip() {
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'globe-tooltip hidden';
    document.body.appendChild(this.tooltip);
  }

  addEventListeners() {
    window.addEventListener('resize', () => this.onWindowResize());
    this.renderer.domElement.addEventListener('click', (e) => this.onMouseClick(e));
    this.renderer.domElement.addEventListener('dblclick', (e) => this.onMouseDoubleClick(e));
    this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));
  }

  latLonToVector3(lat, lon, radius = 1) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);

    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);

    return new THREE.Vector3(x, y, z);
  }

  vector3ToLatLon(vector3) {
    const normalized = vector3.clone().normalize();
    const lat = 90 - (Math.acos(normalized.y) * 180 / Math.PI);
    let lon = ((Math.atan2(normalized.z, -normalized.x) * 180 / Math.PI) - 180);
    
    // Normalize longitude to -180 to 180 range
    while (lon > 180) lon -= 360;
    while (lon < -180) lon += 360;
    
    return { lat, lon };
  }

  ensureCloudLayer(options = {}) {
    this.cloudLayerOptions = { ...this.cloudLayerOptions, ...options };
    if (this.cloudLayer) return this.cloudLayer;

    const geometry = new THREE.SphereGeometry(this.cloudLayerOptions.radius, 64, 64);
    const initialTexture = new THREE.CanvasTexture(this.createCloudLayerCanvas([]));
    initialTexture.colorSpace = THREE.SRGBColorSpace;
    this.cloudLayerTexture = initialTexture;

    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      map: initialTexture,
      transparent: true,
      opacity: this.cloudLayerOptions.opacity,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });

    this.cloudLayer = new THREE.Mesh(geometry, material);
    this.cloudLayer.name = 'meteo-cloud-shell';
    this.cloudLayer.visible = false;
    this.cloudLayer.renderOrder = 1;
    this.cloudLayer.userData.rotationSpeed = this.cloudLayerOptions.rotationSpeed;
    this.earth.add(this.cloudLayer);
    return this.cloudLayer;
  }

  setCloudLayerVisible(visible, options = {}) {
    const layer = this.ensureCloudLayer(options);
    layer.visible = !!visible && !this.inSolarSystemView && !this.inFeverMode;
    return layer.visible;
  }

  updateCloudLayer(samples = [], options = {}) {
    const layer = this.ensureCloudLayer(options);
    const canvas = this.createCloudLayerCanvas(samples);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;

    if (this.cloudLayerTexture) {
      this.cloudLayerTexture.dispose();
    }

    this.cloudLayerTexture = texture;
    layer.material.map = texture;
    layer.material.opacity = this.cloudLayerOptions.opacity;
    layer.material.needsUpdate = true;
    layer.userData.samples = samples;
    layer.userData.rotationSpeed = this.cloudLayerOptions.rotationSpeed;
    return layer;
  }

  createCloudLayerCanvas(samples = []) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const drawBlob = (x, y, radius, alpha) => {
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
      gradient.addColorStop(0.45, `rgba(235, 245, 255, ${alpha * 0.55})`);
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    };

    const safeSamples = samples.length ? samples : [
      { lat: 50, lon: 5, cloudCover: 55, precipitation: 0 },
      { lat: 5, lon: 90, cloudCover: 70, precipitation: 0.3 },
      { lat: -30, lon: 145, cloudCover: 35, precipitation: 0 },
      { lat: 35, lon: -75, cloudCover: 50, precipitation: 0 }
    ];

    const baseCloudCells = [
      { lat: 58, lon: -35, cloudCover: 38, precipitation: 0 },
      { lat: 42, lon: 18, cloudCover: 42, precipitation: 0 },
      { lat: 12, lon: -125, cloudCover: 48, precipitation: 0.1 },
      { lat: 4, lon: 95, cloudCover: 52, precipitation: 0.2 },
      { lat: -24, lon: -30, cloudCover: 45, precipitation: 0 },
      { lat: -42, lon: 130, cloudCover: 55, precipitation: 0.1 }
    ];

    [...baseCloudCells, ...safeSamples].forEach((sample, index) => {
      const cloud = Math.max(0, Math.min(100, Number(sample.cloudCover) || 0)) / 100;
      const x = ((Number(sample.lon) + 180) / 360) * canvas.width;
      const y = ((90 - Number(sample.lat)) / 180) * canvas.height;
      const radius = 72 + cloud * 140;
      const alpha = 0.18 + cloud * 0.58 + Math.min(Number(sample.precipitation) || 0, 5) * 0.05;
      const drift = ((index % 3) - 1) * 22;

      [-canvas.width, 0, canvas.width].forEach(offset => {
        drawBlob(x + offset, y, radius, alpha);
        drawBlob(x + offset + drift, y + 18, radius * 0.62, alpha * 0.72);
        drawBlob(x + offset - drift, y - 15, radius * 0.48, alpha * 0.55);
      });
    });

    ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
    for (let y = 40; y < canvas.height; y += 70) {
      ctx.fillRect(0, y, canvas.width, 2);
    }

    return canvas;
  }

  addMarker(point, color, isCluster = false) {
    const position = this.latLonToVector3(point.lat, point.lon, 1.01);
    
    // Smaller visual size for readability
    const isRealtimeMeteo = !!point.isRealtimeMeteo || point.category === 'meteo-live';
    const visualSize = isCluster ? 0.018 : (isRealtimeMeteo ? 0.014 : 0.008);
    const geometry = new THREE.SphereGeometry(visualSize, 12, 12);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: isCluster ? 1.0 : 0.85
    });
    
    const marker = new THREE.Mesh(geometry, material);
    marker.position.copy(position);
    marker.userData = point;
    marker.userData.isCluster = isCluster;
    marker.renderOrder = 4;
    
    // Larger invisible hit area for easier clicking
    const hitAreaSize = isRealtimeMeteo ? 0.045 : 0.035;
    const hitGeometry = new THREE.SphereGeometry(hitAreaSize, 8, 8);
    const hitMaterial = new THREE.MeshBasicMaterial({
      visible: false
    });
    const hitArea = new THREE.Mesh(hitGeometry, hitMaterial);
    hitArea.renderOrder = 4;
    marker.add(hitArea);
    marker.userData.hitArea = hitArea;
    
    // Cluster badge or subtle glow
    if (isCluster) {
      const glowGeometry = new THREE.SphereGeometry(0.028, 12, 12);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      glow.renderOrder = 5;
      marker.add(glow);
    } else {
      const glowGeometry = new THREE.SphereGeometry(isRealtimeMeteo ? 0.026 : 0.012, 8, 8);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity: isRealtimeMeteo ? 0.42 : 0.2,
        blending: THREE.AdditiveBlending
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      glow.renderOrder = 5;
      marker.add(glow);
    }
    
    marker.userData.pulsePhase = Math.random() * Math.PI * 2;
    
    this.earth.add(marker);
    this.markers.push(marker);
    this.activeMarkers.add(marker);
    
    return marker;
  }

  addLocationMarker(lat, lon) {
    // Remove existing location marker if any
    this.removeLocationMarker();
    
    const position = this.latLonToVector3(lat, lon, 1.01);
    
    const geometry = new THREE.SphereGeometry(0.012, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#00d4ff'),
      transparent: true,
      opacity: 0.9
    });
    
    this.locationMarker = new THREE.Mesh(geometry, material);
    this.locationMarker.position.copy(position);
    
    // Add pulsing glow
    const glowGeometry = new THREE.SphereGeometry(0.018, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#00d4ff'),
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.renderOrder = 5;
    this.locationMarker.add(glow);
    
    this.locationMarker.userData.pulsePhase = 0;
    
    this.earth.add(this.locationMarker);
    return this.locationMarker;
  }
  
  removeLocationMarker() {
    if (this.locationMarker) {
      this.earth.remove(this.locationMarker);
      this.locationMarker.geometry.dispose();
      this.locationMarker.material.dispose();
      if (this.locationMarker.children[0]) {
        this.locationMarker.children[0].geometry.dispose();
        this.locationMarker.children[0].material.dispose();
      }
      this.locationMarker = null;
    }
  }

  removeAllMarkers() {
    this.markers.forEach(marker => {
      this.earth.remove(marker);
      marker.geometry.dispose();
      marker.material.dispose();
      if (marker.children[0]) {
        marker.children[0].geometry.dispose();
        marker.children[0].material.dispose();
      }
    });
    this.markers = [];
    this.activeMarkers.clear();
  }

  updateMarkerVisibility(categoryId, visible) {
    this.markers.forEach(marker => {
      if (marker.userData.category === categoryId) {
        if (visible) {
          this.activeMarkers.add(marker);
          marker.visible = true;
        } else {
          this.activeMarkers.delete(marker);
          marker.visible = false;
        }
      }
    });
  }

  focusOnPoint(lat, lon) {
    this.isFocused = true;
    
    // Calculate the point's actual 3D position on the globe surface
    const pointPosition = this.latLonToVector3(lat, lon, 1);
    
    // Apply Earth's rotation to get actual position in world space
    const earthRotation = this.earth.rotation.y;
    const rotatedPosition = pointPosition.clone();
    rotatedPosition.applyAxisAngle(new THREE.Vector3(0, 1, 0), earthRotation);
    
    // Calculate camera position: move camera to face the point directly
    // Position camera along the line from center through the point, at zoom distance
    const zoomDistance = 1.35;
    const cameraPosition = rotatedPosition.clone().normalize().multiplyScalar(zoomDistance);
    
    const startPosition = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const endTarget = rotatedPosition.clone(); // Look at the actual rotated point
    
    const startTime = Date.now();
    const duration = 1200;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = this.easeInOutCubic(progress);

      this.camera.position.lerpVectors(startPosition, cameraPosition, eased);
      this.controls.target.lerpVectors(startTarget, endTarget, eased);
      this.controls.update();

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // After animation completes, allow user to zoom in further
        // Controls remain enabled for drag and zoom
      }
    };

    animate();
  }

  easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  resetView() {
    this.isFocused = false;
    
    const startPosition = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const endPosition = new THREE.Vector3(0, 0, 2.5);
    const endTarget = new THREE.Vector3(0, 0, 0);
    
    const startTime = Date.now();
    const duration = 1000;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = this.easeInOutCubic(progress);

      this.camera.position.lerpVectors(startPosition, endPosition, eased);
      this.controls.target.lerpVectors(startTarget, endTarget, eased);
      this.controls.update();

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  onMouseMove(event) {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    // Check markers first (including invisible hit areas)
    const visibleMarkers = Array.from(this.activeMarkers);
    const markerIntersects = this.raycaster.intersectObjects(visibleMarkers, true);

    if (markerIntersects.length > 0) {
      // Find the parent marker
      let marker = markerIntersects[0].object;
      while (marker && !marker.userData.id) {
        marker = marker.parent;
      }
      
      if (marker && marker.userData.id) {
        this.showTooltip(marker.userData, event.clientX, event.clientY);
        document.body.style.cursor = 'pointer';
        return;
      }
    }
    
    // Check earth for country hover only in Interaction mode
    if (this.interactionMode === 'interaction') {
      const earthIntersects = this.raycaster.intersectObject(this.earth, false);
      if (earthIntersects.length > 0) {
        const intersect = earthIntersects[0];
        const localPoint = intersect.point.clone();
        localPoint.applyAxisAngle(new THREE.Vector3(0, 1, 0), -this.earth.rotation.y);
        const latLon = this.vector3ToLatLon(localPoint);
        
        // Show country info if we have it
        if (this.countryHoverCallback) {
          this.countryHoverCallback(latLon, event.clientX, event.clientY);
        }
      }
    }
    
    this.hideTooltip();
    document.body.style.cursor = 'default';
  }

  showTooltip(pointData, x, y) {
    const categoryColors = {
      'meteo': '#4fc3f7',
      'regional-news': '#81c784',
      'country-news': '#ffb74d',
      'eu': '#64b5f6',
      'world': '#ba68c8',
      'space': '#9575cd',
      'climate': '#ff8a65',
      'extreme': '#ef5350'
    };

    const color = categoryColors[pointData.category] || '#00d4ff';
    
    // Show cluster info or single point info
    if (pointData.isCluster) {
      this.tooltip.innerHTML = `
        <div class="tooltip-header" style="border-left: 3px solid ${color}">
          <div class="tooltip-title">${pointData.count} events in ${pointData.region}</div>
          <div class="tooltip-meta">Click to view details</div>
        </div>
      `;
    } else {
      this.tooltip.innerHTML = `
        <div class="tooltip-header" style="border-left: 3px solid ${color}">
          <div class="tooltip-title">${pointData.title}</div>
          <div class="tooltip-meta">${pointData.region}, ${pointData.country}</div>
        </div>
      `;
    }
    
    this.tooltip.style.left = x + 15 + 'px';
    this.tooltip.style.top = y + 15 + 'px';
    this.tooltip.classList.remove('hidden');
  }

  hideTooltip() {
    this.tooltip.classList.add('hidden');
  }

  onMouseClick(event) {
    // In fever mode, check for tipping label/segment clicks
    if (this.inFeverMode) {
      const tippingHandled = this.handleFeverModeClick(event);
      if (tippingHandled) return; // Only block if tipping object was actually clicked
    }
    
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    // If in solar system view, check for planet clicks
    if (this.inSolarSystemView && this.solarSystemModel) {
      // Check for any planet/mesh click to focus on it
      const solarSystemIntersects = this.raycaster.intersectObjects(this.solarSystemModel.children, true);
      if (solarSystemIntersects.length > 0) {
        const clickedObject = solarSystemIntersects[0].object;
        
        // Resolve to actual planet (handles bezier/orbit nodes)
        const actualPlanet = this.resolveToPlanet(clickedObject);
        
        // Validate this is a real planet
        const validPlanetNames = ['Sun', 'Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Spaceship', 'Asteroid', 'Asteroid2'];
        const isValidPlanet = validPlanetNames.includes(actualPlanet.name);
        
        if (!isValidPlanet) {
          // Not a valid planet - return to full solar system view
          this.focusedPlanet = null;
          this.focusedPlanetOffset = null;
          this.isPlanetFocused = false;
          return;
        }
        
        // Check if this is Earth
        if (actualPlanet.name === 'Earth') {
          this.transitionBackToGlobe();
          return;
        }
        
        // Focus on the planet
        this.focusOnPlanet(actualPlanet);
        
        // Notify about planet click
        if (this.planetClickCallback) {
          const planetInfo = this.getPlanetInfo(actualPlanet);
          this.planetClickCallback(planetInfo);
        }
        return;
      }
    }
    
    // Check markers first (including hit areas) - works in both modes
    const visibleMarkers = Array.from(this.activeMarkers);
    const markerIntersects = this.raycaster.intersectObjects(visibleMarkers, true);

    if (markerIntersects.length > 0) {
      // Find parent marker
      let marker = markerIntersects[0].object;
      while (marker && !marker.userData.id) {
        marker = marker.parent;
      }
      
      if (marker && marker.userData.id && this.markerClickCallback) {
        this.markerClickCallback(marker.userData);
        return;
      }
    }
    
    // Check for country/location click only in Interaction mode
    if (this.interactionMode === 'interaction') {
      const earthIntersects = this.raycaster.intersectObject(this.earth, false);
      if (earthIntersects.length > 0 && this.countryClickCallback) {
        const intersect = earthIntersects[0];
        const localPoint = intersect.point.clone();
        localPoint.applyAxisAngle(new THREE.Vector3(0, 1, 0), -this.earth.rotation.y);
        const latLon = this.vector3ToLatLon(localPoint);
        this.countryClickCallback(latLon);
      }
    }
  }
  
  getPlanetInfo(planetObject) {
    // Direct planet names from solar-system.glb - including spacecraft and asteroids
    // Support multiple name variations for asteroids and spacecraft
    const validPlanetNames = ['Sun', 'Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Spaceship', 'StarShip', 'Asteroid', 'Asteroid2', 'Atlas31', 'Atlas32'];
    
    let planetName = 'Unknown Planet';
    
    // Check if object name is a direct planet name
    if (planetObject.name && validPlanetNames.includes(planetObject.name)) {
      planetName = planetObject.name;
    } else {
      // Search up the hierarchy
      let current = planetObject;
      while (current && current !== this.solarSystemModel) {
        if (current.name && validPlanetNames.includes(current.name)) {
          planetName = current.name;
          break;
        }
        current = current.parent;
      }
    }
    
    // Comprehensive planet data with detailed scientific information.
    // Keep source ASCII-safe; JS escapes render as real symbols in the detail panel.
    const degreeC = '\u00B0C';
    const carbonDioxide = 'CO\u2082';
    const planetData = {
      'Sun': { 
        emoji: '\u2600\uFE0F', 
        type: 'Star', 
        description: 'The star at the center of our solar system',
        diameter: '1,391,000 km',
        temperature: `5,500${degreeC} (surface), 15,000,000${degreeC} (core)`,
        composition: 'Hydrogen (73%), Helium (25%), trace elements',
        atmosphere: 'Photosphere, chromosphere, and corona'
      },
      'Mercury': { 
        emoji: '\u263F\uFE0F', 
        type: 'Rocky Planet', 
        description: 'The smallest planet and closest to the Sun',
        diameter: '4,879 km',
        temperature: `-173${degreeC} to 427${degreeC}`,
        composition: 'Iron core (70%), rocky mantle and crust',
        atmosphere: 'Extremely thin exosphere (oxygen, sodium, hydrogen)'
      },
      'Venus': { 
        emoji: '\u2640\uFE0F', 
        type: 'Rocky Planet', 
        description: 'The hottest planet with a toxic atmosphere',
        diameter: '12,104 km',
        temperature: `462${degreeC} (average)`,
        composition: 'Rocky with iron core, similar to Earth',
        atmosphere: `Dense ${carbonDioxide} (96.5%), nitrogen (3.5%), sulfuric acid clouds`
      },
      'Earth': { 
        emoji: '\uD83C\uDF0D', 
        type: 'Rocky Planet', 
        description: 'Our home planet, the only known world with life',
        diameter: '12,742 km',
        temperature: `-88${degreeC} to 58${degreeC} (average 15${degreeC})`,
        composition: 'Iron core, silicate mantle, water-covered crust',
        atmosphere: `Nitrogen (78%), oxygen (21%), argon, water vapor, ${carbonDioxide}`
      },
      'Mars': { 
        emoji: '\u2642\uFE0F', 
        type: 'Rocky Planet', 
        description: 'The red planet, target of future human missions',
        diameter: '6,779 km',
        temperature: `-153${degreeC} to 20${degreeC} (average -63${degreeC})`,
        composition: 'Iron-rich core, rocky mantle with iron oxide surface',
        atmosphere: `Thin ${carbonDioxide} (95%), nitrogen (3%), argon (1.6%)`
      },
      'Jupiter': { 
        emoji: '\u2643', 
        type: 'Gas Giant', 
        description: 'The largest planet, a massive gas giant',
        diameter: '139,820 km',
        temperature: `-108${degreeC} (cloud tops), 24,000${degreeC} (core)`,
        composition: 'Hydrogen (90%), helium (10%), trace methane and ammonia',
        atmosphere: 'Hydrogen and helium with colorful cloud bands'
      },
      'Saturn': { 
        emoji: '\u2644', 
        type: 'Gas Giant', 
        description: 'The ringed planet, famous for its ice rings',
        diameter: '116,460 km',
        temperature: `-178${degreeC} (cloud tops)`,
        composition: 'Hydrogen (96%), helium (3%), trace methane',
        atmosphere: 'Hydrogen and helium with ammonia ice clouds'
      },
      'Uranus': { 
        emoji: '\u2645', 
        type: 'Ice Giant', 
        description: 'An ice giant tilted on its side at 98 degrees',
        diameter: '50,724 km',
        temperature: `-224${degreeC} (coldest planetary atmosphere)`,
        composition: 'Water, methane, ammonia ices over rocky core',
        atmosphere: 'Hydrogen (83%), helium (15%), methane (2%)'
      },
      'Neptune': { 
        emoji: '\u2646', 
        type: 'Ice Giant', 
        description: 'The most distant planet with the fastest winds',
        diameter: '49,244 km',
        temperature: `-214${degreeC} (cloud tops)`,
        composition: 'Water, methane, ammonia ices over rocky core',
        atmosphere: 'Hydrogen (80%), helium (19%), methane (1%)'
      },
      'Moon': { 
        emoji: '\uD83C\uDF19', 
        type: 'Natural Satellite', 
        description: 'Earth\'s only natural satellite',
        diameter: '3,474 km',
        temperature: `-173${degreeC} to 127${degreeC}`,
        composition: 'Rocky body with small iron core',
        atmosphere: 'Virtually none (exosphere with trace elements)'
      },
      'Spaceship': {
        emoji: '\uD83D\uDE80',
        type: 'Spacecraft',
        description: 'SpaceX Starship - Next-generation fully reusable launch vehicle designed for missions to Moon, Mars and beyond',
        diameter: '9 meters (diameter), 50+ meters (height with Super Heavy)',
        temperature: 'Variable (cryogenic fuel tanks to re-entry heat)',
        composition: 'Stainless steel construction (301 alloy), methane/oxygen propulsion',
        atmosphere: 'Pressurized crew compartment with life support systems',
        latestNews: 'Latest developments in Starship program and test flights'
      },
      'StarShip': {
        emoji: '\uD83D\uDE80',
        type: 'Spacecraft',
        description: 'SpaceX Starship - Next-generation fully reusable launch vehicle designed for missions to Moon, Mars and beyond',
        diameter: '9 meters (diameter), 50+ meters (height with Super Heavy)',
        temperature: 'Variable (cryogenic fuel tanks to re-entry heat)',
        composition: 'Stainless steel construction (301 alloy), methane/oxygen propulsion',
        atmosphere: 'Pressurized crew compartment with life support systems',
        latestNews: 'Latest developments in Starship program and test flights'
      },
      'Asteroid': {
        emoji: '\u2604\uFE0F',
        type: 'Near-Earth Asteroid',
        description: 'Atlas31 - Recently discovered near-Earth asteroid under close observation by planetary defense systems',
        diameter: 'Estimated 150-300 meters',
        temperature: `-73${degreeC} to 127${degreeC} (depending on solar distance)`,
        composition: 'Carbonaceous chondrite with iron-nickel content',
        atmosphere: 'None (too small to retain atmosphere)',
        latestNews: 'Latest tracking data and orbital predictions for Atlas31'
      },
      'Asteroid2': {
        emoji: '\u2604\uFE0F',
        type: 'Near-Earth Asteroid',
        description: 'Atlas32 - Companion asteroid in similar orbital path',
        diameter: 'Estimated 120-250 meters',
        temperature: `-73${degreeC} to 127${degreeC} (depending on solar distance)`,
        composition: 'Silicate-based with metallic inclusions',
        atmosphere: 'None (too small to retain atmosphere)'
      },
      'Atlas31': {
        emoji: '\u2604\uFE0F',
        type: 'Near-Earth Asteroid',
        description: 'Atlas31 - Recently discovered near-Earth asteroid under close observation by planetary defense systems',
        diameter: 'Estimated 150-300 meters',
        temperature: `-73${degreeC} to 127${degreeC} (depending on solar distance)`,
        composition: 'Carbonaceous chondrite with iron-nickel content',
        atmosphere: 'None (too small to retain atmosphere)',
        latestNews: 'Latest tracking data and orbital predictions for Atlas31'
      },
      'Atlas32': {
        emoji: '\u2604\uFE0F',
        type: 'Near-Earth Asteroid',
        description: 'Atlas32 - Companion asteroid in similar orbital path',
        diameter: 'Estimated 120-250 meters',
        temperature: `-73${degreeC} to 127${degreeC} (depending on solar distance)`,
        composition: 'Silicate-based with metallic inclusions',
        atmosphere: 'None (too small to retain atmosphere)'
      }
    };
    
    // Try to find matching planet data
    let matchedData = null;
    for (const [key, data] of Object.entries(planetData)) {
      if (planetName.toLowerCase().includes(key.toLowerCase())) {
        matchedData = { name: key, ...data };
        break;
      }
    }
    
    if (!matchedData) {
      matchedData = {
        name: planetName,
        emoji: '\uD83E\uDE90',
        type: 'Celestial Object',
        description: 'A celestial body in our solar system',
        diameter: 'Unknown',
        temperature: 'Unknown',
        composition: 'Unknown',
        atmosphere: 'Unknown'
      };
    }
    
    return matchedData;
  }
  
  resolveToPlanet(object) {
    // Direct planet names from solar-system.glb - including spacecraft and asteroids
    // Support multiple name variations
    const validPlanetNames = ['Sun', 'Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Spaceship', 'StarShip', 'Asteroid', 'Asteroid2', 'Atlas31', 'Atlas32'];
    
    // Check object itself first
    if (object.name && validPlanetNames.includes(object.name)) {
      return object;
    }
    
    // Search up hierarchy for valid planet name
    let current = object;
    while (current && current !== this.solarSystemModel) {
      if (current.name && validPlanetNames.includes(current.name)) {
        return current;
      }
      current = current.parent;
    }
    
    return object; // fallback
  }
  
  getPlanetCenter(planetObject) {
    // Get the actual center of the planet using bounding box
    const bbox = new THREE.Box3().setFromObject(planetObject);
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    return center;
  }
  
  focusOnPlanet(planetObject) {
    // Resolve to actual planet (not helper/orbit nodes)
    const actualPlanet = this.resolveToPlanet(planetObject);
    
    // Store reference to focused planet
    this.focusedPlanet = actualPlanet;
    this.isPlanetFocused = true;
    
    // Get planet's center using bounding box (more accurate than world position)
    const planetCenter = this.getPlanetCenter(actualPlanet);
    
    // Calculate appropriate distance based on planet size
    const bbox = new THREE.Box3().setFromObject(actualPlanet);
    const size = bbox.getSize(new THREE.Vector3()).length();
    const distance = Math.max(size * 4, 3);
    
    // Calculate camera offset from planet center
    const cameraOffset = new THREE.Vector3(distance * 0.7, distance * 0.3, distance * 0.7);
    
    // Store the offset for continuous tracking
    this.focusedPlanetOffset = cameraOffset.clone();
    
    // Enable more freedom when focused on a planet
    this.controls.minDistance = size * 2;
    this.controls.maxDistance = 250;
    this.controls.rotateSpeed = 1.0;
    this.controls.zoomSpeed = 1.5;
    
    // Animate camera to planet
    const startPos = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    
    const targetPos = planetCenter.clone().add(cameraOffset);
    
    const duration = 1500;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = this.easeInOutCubic(progress);
      
      // Get current planet center (updates if planet is animated)
      const currentPlanetCenter = this.getPlanetCenter(actualPlanet);
      const currentTargetPos = currentPlanetCenter.clone().add(cameraOffset);
      
      // Update camera position and target
      this.camera.position.lerpVectors(startPos, currentTargetPos, eased);
      this.controls.target.lerpVectors(startTarget, currentPlanetCenter, eased);
      this.controls.update();
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }
  
  transitionBackToGlobe() {
    if (!this.inSolarSystemView) return;
    
    // Clear focused planet and offset
    this.focusedPlanet = null;
    this.focusedPlanetOffset = null;
    this.isPlanetFocused = false;
    
    // Reset control speeds to default
    this.controls.rotateSpeed = 0.5;
    this.controls.zoomSpeed = 0.8;
    
    // Show loading bar
    this.showLoadingBar();
    
    // Simulate loading time
    setTimeout(() => {
      this.inSolarSystemView = false;
      
      // Hide solar system, show globe
      this.solarSystemModel.visible = false;
      this.earth.visible = true;
      this.activeMarkers.forEach(marker => marker.visible = true);
      
      // Reset camera controls
      this.controls.minDistance = this.options.minDistance;
      this.controls.maxDistance = this.options.maxDistance;
      
      // Animate back to globe view
      const startPos = this.camera.position.clone();
      const startTarget = this.controls.target.clone();
      const endPosition = new THREE.Vector3(0, 0, 2.5);
      const endTarget = new THREE.Vector3(0, 0, 0);
      
      const duration = 1500;
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = this.easeInOutCubic(progress);
        
        this.camera.position.lerpVectors(startPos, endPosition, eased);
        this.controls.target.lerpVectors(startTarget, endTarget, eased);
        this.controls.update();
        
        // Update loading bar progress
        this.updateLoadingBar(progress);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          this.hideLoadingBar();
          // Dispatch event for view change
          window.dispatchEvent(new CustomEvent('viewModeChanged', { detail: { mode: 'globe' } }));
        }
      };
      
      animate();
    }, 300);
  }
  
  getViewMode() {
    return this.inSolarSystemView ? 'solar-system' : this.inFeverMode ? 'earths-fever' : 'globe';
  }
  
  toggleViewMode() {
    if (this.inSolarSystemView) {
      this.transitionBackToGlobe();
    } else if (this.inFeverMode) {
      this.exitFeverMode();
    } else {
      // Load solar system if not already loaded
      if (!this.solarSystemLoaded) {
        this.loadSolarSystem().then(() => {
          this.transitionToSolarSystem();
        });
      } else {
        this.transitionToSolarSystem();
      }
    }
  }
  
  async toggleFeverMode() {
    if (this.inSolarSystemView) {
      await this.transitionBackToGlobe();
    }
    
    if (this.inFeverMode) {
      // Reinitialize fever mode instead of exiting
      return await this.reinitializeFeverMode();
    } else {
      return await this.enterFeverMode();
    }
  }
  
  async reinitializeFeverMode() {
    // Reset to beginning of simulation
    this.feverCurrentIndex = 0;
    this.feverAnimationTime = 0;
    this.feverPaused = false;
    this.feverReverse = false;
    this.feverTransitionProgress = 0;

    // Clear transient auto-mute (so user can resume sound if enabled). Do NOT override explicit user mute.
    this.feverAutoMuted = false;

    // Reset tipping triggers
    if (this.tippingTriggered) {
      Object.keys(this.tippingTriggered).forEach(boundary => {
        this.tippingTriggered[boundary].forward = false;
        this.tippingTriggered[boundary].reverse = false;
      });
    }
    
    // Reset to first texture
    if (this.earth.material.uniforms) {
      this.earth.material.uniforms.texture1.value = this.feverTextures[0];
      this.earth.material.uniforms.texture2.value = this.feverTextures[1];
      this.earth.material.uniforms.mixFactor.value = 0.0;
      this.earth.material.uniforms.atmosphereIntensity.value = this.getFeverLightingBrightness(0);
    }
    
    console.log('Fever mode reinitialized - starting from 1950, transient auto-mute cleared');
    return Promise.resolve();
  }
  
  createFeverYearOverlay() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 180px "Space Mono", monospace';
    ctx.fillStyle = '#88eeff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('1950', canvas.width / 2, canvas.height / 2);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    const spriteMaterial = new THREE.SpriteMaterial({ 
      map: texture,
      transparent: true,
      opacity: 0.95
    });
    
    this.feverYearOverlay = new THREE.Sprite(spriteMaterial);
    
    // Scale to 0.33 of original size
    const FEVER_YEAR_SCALE = 0.33;
    this.feverYearOverlay.scale.set(0.8 * FEVER_YEAR_SCALE, 0.4 * FEVER_YEAR_SCALE, 1);
    
    this.feverYearOverlayRoot = new THREE.Group();
    this.feverYearOverlayRoot.add(this.feverYearOverlay);
    this.feverYearOverlayRoot.visible = false;
    
    console.log('[Fever Year] Overlay created at 0.33 scale');
  }
  
  getFeverLightingBrightness(progress = 0) {
    const clampedProgress = Math.max(0, Math.min(1, progress));
    return 1.02 - (clampedProgress * 0.08);
  }

  logFeverLightingBrightness(progress) {
    const bucket = Math.round(Math.max(0, Math.min(1, progress)) * (this.feverYears.length - 1));
    if (this.lastFeverBrightnessBucket === bucket) return;
    this.lastFeverBrightnessBucket = bucket;
    console.log(`[Fever Lighting] Brightness curve applied: ${this.getFeverLightingBrightness(progress).toFixed(2)} at progress ${progress.toFixed(2)}`);
  }
  getFeverYearColor(year) {
    const scenarioColor = this.getFeverScenarioMilestone(this.getFeverScenario(), year)?.color;
    if (scenarioColor) return scenarioColor;

    // Color progression based on climate state
    if (year <= 1975) {
      // 1950-1975: cool pale cyan to white-blue
      const t = (year - 1950) / 25;
      return this.lerpColor('#88eeff', '#ccf5ff', t);
    } else if (year <= 2000) {
      // 1975-2000: white-blue to soft yellow
      const t = (year - 1975) / 25;
      return this.lerpColor('#ccf5ff', '#ffffaa', t);
    } else if (year <= 2025) {
      // 2000-2025: soft yellow to warm amber
      const t = (year - 2000) / 25;
      return this.lerpColor('#ffffaa', '#ffcc66', t);
    } else if (year <= 2050) {
      // 2025-2050: warm amber to orange
      const t = (year - 2025) / 25;
      return this.lerpColor('#ffcc66', '#ff9944', t);
    } else if (year <= 2075) {
      // 2050-2075: orange to hot orange-red
      const t = (year - 2050) / 25;
      return this.lerpColor('#ff9944', '#ff5522', t);
    } else if (year <= 2100) {
      // 2075-2100: hot orange-red to red
      const t = (year - 2075) / 25;
      return this.lerpColor('#ff5522', '#ff0000', t);
    } else {
      // 2100+: red to deep red
      const t = Math.min((year - 2100) / 25, 1);
      return this.lerpColor('#ff0000', '#cc0000', t);
    }
  }
  
  lerpColor(color1, color2, t) {
    const c1 = parseInt(color1.slice(1), 16);
    const c2 = parseInt(color2.slice(1), 16);
    
    const r1 = (c1 >> 16) & 255;
    const g1 = (c1 >> 8) & 255;
    const b1 = c1 & 255;
    
    const r2 = (c2 >> 16) & 255;
    const g2 = (c2 >> 8) & 255;
    const b2 = c2 & 255;
    
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }
  
  updateFeverYearText(year) {
    if (!this.feverYearOverlay) return;
    
    const canvas = this.feverYearOverlay.material.map.image;
    const ctx = canvas.getContext('2d');
    const color = this.getFeverYearColor(year);
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 180px "Space Mono", monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(year.toString(), canvas.width / 2, canvas.height / 2);
    
    this.feverYearOverlay.material.map.needsUpdate = true;
    
    console.log(`[Fever Year] Overlay color updated: ${year} -> ${color}`);
  }
  
  showFeverYearOverlay() {
    if (this.feverYearOverlayRoot && this.inFeverMode) {
      this.feverYearOverlayRoot.visible = true;
      console.log('[Fever Year] Overlay shown');
    }
  }
  
  hideFeverYearOverlay() {
    if (this.feverYearOverlayRoot) {
      this.feverYearOverlayRoot.visible = false;
      console.log('[Fever Year] Overlay hidden');
    }
  }
  
  async enterFeverMode() {
    const preferredQuality = this.getPreferredFeverLoopQuality();
    const needsReload = this.feverTextures.length === 0 || this.currentFeverQuality !== preferredQuality;
    
    if (needsReload) {
      this.showLoadingBar();
      const loaded = await this.loadFeverTextures(preferredQuality);
      this.hideLoadingBar();
      
      if (!loaded) {
        console.error('Failed to load fever textures');
        return Promise.reject('Failed to load fever textures');
      }
    }
    
    if (!this.tippingOverlay) {
      await this.loadTippingOverlay();
    }
    
    if (!this.amocOverlay) {
      await this.loadAMOCOverlay();
    }
    
    if (!this.feverYearOverlay) {
      this.createFeverYearOverlay();
    }
    
    this.inFeverMode = true;
    this.selectedBoundary = null;
    
    // Save pre-Fever camera state
    this.preFeverCameraPosition = this.camera.position.clone();
    this.preFeverCameraTarget = this.controls.target.clone();
    this.preFeverMinDistance = this.controls.minDistance;
    this.preFeverMaxDistance = this.controls.maxDistance;
    
    // Fever shader approximates the main light family; existing scene lights remain active for overlays.
    console.log('[Fever Lighting] Using main light family with shader ambient/key approximation');

    // Set Fever camera preset - wider framing to fit tipping overlay
    this.applyFeverCameraPreset();
    // Always start at 1950 (index 0)
    this.feverCurrentIndex = 0;
    this.feverAnimationTime = 0;
    this.feverSpeed = 0.5;
    this.feverScenario = 'objective';
    this.feverPaused = false;
    this.feverReverse = false;
    this.feverTransitionProgress = 0;
    
    // Create material with two textures for cross-fade - start with 1950 texture
    this.earth.material = new THREE.ShaderMaterial({
      uniforms: {
        texture1: { value: this.feverTextures[0] }, // 1950 texture
        texture2: { value: this.feverTextures[1] }, // 1975 texture
        mixFactor: { value: 0.0 },
        atmosphereIntensity: { value: this.getFeverLightingBrightness(0) }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D texture1;
        uniform sampler2D texture2;
        uniform float mixFactor;
        uniform float atmosphereIntensity;
        varying vec2 vUv;
        varying vec3 vNormal;

        void main() {
          vec4 color1 = texture2D(texture1, vUv);
          vec4 color2 = texture2D(texture2, vUv);
          vec4 baseColor = mix(color1, color2, mixFactor);

          vec3 normal = normalize(vNormal);
          vec3 lightDir = normalize(vec3(0.45, 0.35, 0.82));
          float keyLight = max(dot(normal, lightDir), 0.0);
          float ambient = 0.88;
          float shading = clamp(ambient + keyLight * 0.20, 0.90, 1.08);
          vec3 liftedColor = baseColor.rgb * shading * atmosphereIntensity;

          gl_FragColor = vec4(liftedColor, baseColor.a);
        }
      `
    });
    this.earth.material.needsUpdate = true;
    console.log('[Fever Lighting] Brightness curve applied: 1.02 -> 0.94');
    
    // Keep auto-rotate active
    this.options.autoRotate = true;
    
    // Show tipping overlay if enabled
    if (this.tippingOverlayRoot && this.tippingOverlayVisible) {
      this.tippingOverlayRoot.visible = true;
    }
    
    if (this.amocOverlayRoot) {
      this.amocOverlayRoot.visible = true;
      this.amocOverlayVisible = true;
      try {
        localStorage.setItem('euroearth_amoc_visible', 'true');
      } catch (err) {
        // ignore
      }
      console.log('[AMOC] Overlay enabled by default at Fever start');
      
      window.dispatchEvent(new CustomEvent('amocToggled', { detail: { visible: true, source: 'globe' } }));
    }
    
    // Sound defaults ON from constructor, but entering Fever should not undo an explicit user mute.
    if (this.feverSoundEnabled && window.detailPanel && window.detailPanel.audioContext) {
      const ctx = window.detailPanel.audioContext;
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
          console.log('[Fever Sound] AudioContext resumed on Fever mode start');
        });
      }
    }
    
    console.log('[Fever Sound] Fever mode start:', this.feverSoundEnabled ? 'ON' : 'OFF');
    
    window.dispatchEvent(new CustomEvent('viewModeChanged', { detail: { mode: 'earths-fever' } }));
    console.log(`[Scene Swap] Main -> Fever completed without full texture rebuild (quality: ${preferredQuality})`);
    console.log('Entered Earth\'s Fever mode');
    
    return Promise.resolve();
  }
  
  applyFeverCameraPreset() {
    // Fever-specific camera framing to fit tipping overlay
    this.controls.minDistance = 2.0;
    this.controls.maxDistance = 8;
    
    const startPos = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    
    const targetPos = new THREE.Vector3(0, 0, 3.5); // Wider framing
    const targetLookAt = new THREE.Vector3(0, 0, 0);
    
    const duration = 1200;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = this.easeInOutCubic(progress);
      
      this.camera.position.lerpVectors(startPos, targetPos, eased);
      this.controls.target.lerpVectors(startTarget, targetLookAt, eased);
      this.controls.update();
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }
  
  exitFeverMode() {
    this.inFeverMode = false;
    this.feverCurrentIndex = 0;
    this.feverAnimationTime = 0;
    this.feverPaused = false;
    this.selectedBoundary = null;
    
    // Restore pre-Fever camera state
    if (this.preFeverCameraPosition && this.preFeverCameraTarget) {
      const startPos = this.camera.position.clone();
      const startTarget = this.controls.target.clone();
      
      const duration = 1000;
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = this.easeInOutCubic(progress);
        
        this.camera.position.lerpVectors(startPos, this.preFeverCameraPosition, eased);
        this.controls.target.lerpVectors(startTarget, this.preFeverCameraTarget, eased);
        this.controls.update();
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      animate();
    }
    
    // Restore pre-Fever zoom limits
    if (this.preFeverMinDistance && this.preFeverMaxDistance) {
      this.controls.minDistance = this.preFeverMinDistance;
      this.controls.maxDistance = this.preFeverMaxDistance;
    }
    
    // Hide tipping overlay
    if (this.tippingOverlayRoot) {
      this.tippingOverlayRoot.visible = false;
    }
    
    // Hide AMOC overlay
    if (this.amocOverlayRoot) {
      this.amocOverlayRoot.visible = false;
    }

    // Main/Space tabs must fully stop the Fever date counter overlay.
    this.hideFeverYearOverlay();
    
    // Reset atmosphere
    if (this.atmosphere && this.atmosphere.material.uniforms) {
      this.atmosphere.material.uniforms.stressLevel.value = 0.0;
    }
    
    // Remove fever lights
    if (this.feverSunLight) {
      this.scene.remove(this.feverSunLight);
      this.feverSunLight = null;
    }
    if (this.feverAmbientLight) {
      this.scene.remove(this.feverAmbientLight);
      this.feverAmbientLight = null;
    }
    
    // Restore original PBR material using helper
    const preferredQuality = this.detectPreferredQuality();
    this.earth.material = this.createMainEarthMaterial(preferredQuality);
    this.earth.material.needsUpdate = true;
    console.log(`[Scene Swap] Fever -> main completed without full texture rebuild (quality: ${preferredQuality})`);    
    // Dispatch event
    window.dispatchEvent(new CustomEvent('viewModeChanged', { detail: { mode: 'globe' } }));
    console.log('Exited Earth\'s Fever mode');
  }
  
  setFeverSpeed(speed) {
    this.feverSpeed = speed;
  }
  
  pauseFeverLoop() {
    if (!this.inFeverMode) return;
    this.feverPaused = true;
    this._lastPausedState = true;
    console.log('[Fever Loop] Paused');
  }
  
  resumeFeverLoop() {
    if (!this.inFeverMode) return;
    this.feverPaused = false;
    this._lastPausedState = false;
    console.log('[Fever Loop] Resumed');
  }
  
  toggleFeverPause() {
    if (!this.inFeverMode) return false;
    const newState = !this.feverPaused;
    this.feverPaused = newState;
    this._lastPausedState = newState;
    console.log('[Fever Pause] Toggled:', this.feverPaused ? 'PAUSED' : 'PLAYING');
    
    window.dispatchEvent(new CustomEvent('feverPauseChanged', { 
      detail: { paused: this.feverPaused } 
    }));
    
    return this.feverPaused;
  }
  
  toggleFeverReverse() {
    if (!this.inFeverMode) return false;
    const newState = !this.feverReverse;
    this.feverReverse = newState;
    this._lastReverseState = newState;
    console.log('Fever reverse toggled:', this.feverReverse);
    
    // Dispatch event for UI updates
    window.dispatchEvent(new CustomEvent('feverReverseChanged', { 
      detail: { reversed: this.feverReverse } 
    }));
    
    return this.feverReverse;
  }
  
  seekToYear(targetYear) {
    if (!this.inFeverMode || !this.feverTextures.length) return;
    
    const yearIndex = this.feverYears.indexOf(targetYear);
    if (yearIndex === -1) return;
    
    // Calculate time for this year
    const baseDuration = 3.0;
    const duration = baseDuration / this.feverSpeed;
    this.feverAnimationTime = yearIndex * duration;
    this.feverCurrentIndex = yearIndex;
    
    // Immediately update textures to show this year
    const nextIndex = Math.min(yearIndex + 1, this.feverTextures.length - 1);
    if (this.earth.material.uniforms) {
      this.earth.material.uniforms.texture1.value = this.feverTextures[yearIndex];
      this.earth.material.uniforms.texture2.value = this.feverTextures[nextIndex];
      this.earth.material.uniforms.mixFactor.value = 0.0;
      
      // Update atmosphere intensity
      const globalProgress = yearIndex / (this.feverTextures.length - 1);
      const atmosphereIntensity = this.getFeverLightingBrightness(globalProgress);
      this.earth.material.uniforms.atmosphereIntensity.value = atmosphereIntensity;
      this.logFeverLightingBrightness(globalProgress);
    }
    
    // Immediately update tipping overlay to match
    const yearProgress = yearIndex / (this.feverTextures.length - 1);
    this.updateTippingOverlay(targetYear, targetYear, yearProgress);
    
    // Pause at this year
    this.feverPaused = true;

    console.log(`[Fever Seek] Year ${targetYear} - sound state unchanged`);
  }
  
  getFeverSoundEnabled() {
    return this.feverSoundEnabled;
  }

  isFeverAudioAllowed() {
    return this.feverSoundEnabled;
  }
  
  setFeverSoundEnabled(enabled) {
    this.feverSoundEnabled = !!enabled;
    
    try {
      localStorage.setItem('euroearth_fever_sound', this.feverSoundEnabled.toString());
    } catch (err) {
      console.warn('Unable to persist fever sound setting:', err);
    }

    console.log('[Fever Sound] User toggle:', this.feverSoundEnabled ? 'ON' : 'OFF');
    
    // Dispatch event for immediate UI feedback
    window.dispatchEvent(new CustomEvent('feverSoundChanged', { 
      detail: { enabled: this.feverSoundEnabled } 
    }));
  }

  getFeverVoiceEnabled() {
    return this.feverVoiceEnabled !== false;
  }
  
  setFeverVoiceEnabled(enabled) {
    this.feverVoiceEnabled = enabled;
    console.log('Fever voice:', enabled ? 'enabled' : 'disabled');
    // Stop current speech if disabling
    if (!enabled && window.ttsManager) {
      window.ttsManager.stop();
    }
  }
  
  isFeverPaused() {
    return this.feverPaused;
  }
  
  isFeverReversed() {
    return this.feverReverse || false;
  }
  
  setFeverScenario(scenario) {
    this.feverScenario = scenario;
    
    // Keep current year but recompute tipping state for new scenario
    const currentYear = this.getFeverCurrentYear();
    const yearProgress = this.getFeverProgress();
    
    console.log(`[Fever] Scenario changed to ${scenario}, staying at year ${currentYear}`);
    
    // Reset tipping triggers for new scenario
    if (this.tippingTriggered) {
      Object.keys(this.tippingTriggered).forEach(boundary => {
        this.tippingTriggered[boundary].forward = false;
        this.tippingTriggered[boundary].reverse = false;
      });
    }
    
    // Immediately update tipping overlay for current year with new scenario
    this.updateTippingOverlay(currentYear, this.feverYears[this.feverCurrentIndex], yearProgress);
    
    // Trigger event for UI updates
    window.dispatchEvent(new CustomEvent('feverScenarioChanged', { 
      detail: { scenario, year: currentYear } 
    }));
  }
  
  getFeverScenario() {
    return this.feverScenario || 'objective';
  }
  
  getFeverMilestoneYear() {
    return this.feverYears[this.feverCurrentIndex];
  }
  
  getFeverCurrentYear() {
    // Returns interpolated display year
    if (!this.inFeverMode || this.feverYears.length === 0) return this.feverYears[0];
    
    const segmentDuration = (3.0 / this.feverSpeed);
    const segmentIndex = Math.floor(this.feverAnimationTime / segmentDuration);
    const localProgress = (this.feverAnimationTime % segmentDuration) / segmentDuration;
    const nextIndex = Math.min(segmentIndex + 1, this.feverYears.length - 1);
    
    const milestoneYear = this.feverYears[segmentIndex];
    const nextMilestoneYear = this.feverYears[nextIndex];
    return Math.round(milestoneYear + (nextMilestoneYear - milestoneYear) * localProgress);
  }
  
  getFeverProgress() {
    const intervalCount = this.feverYears.length - 1;
    const segmentDuration = 3.0 / this.feverSpeed;
    const totalDuration = segmentDuration * intervalCount;
    return this.feverAnimationTime / totalDuration;
  }
  
  setTippingOverlayVisible(visible) {
    this.tippingOverlayVisible = visible;
    if (this.tippingOverlayRoot) {
      this.tippingOverlayRoot.visible = visible && this.inFeverMode;
    }
    console.log(`[Tipping] Overlay visibility set to: ${visible}`);
  }
  
  getTippingOverlayVisible() {
    return this.tippingOverlayVisible;
  }
  
  setAMOCOverlayVisible(visible) {
    this.amocOverlayVisible = visible;
    if (this.amocOverlayRoot) {
      this.amocOverlayRoot.visible = visible && this.inFeverMode;
    }
    try {
      localStorage.setItem('euroearth_amoc_visible', visible.toString());
    } catch (err) {
      // ignore
    }
    console.log(`[AMOC] Overlay ${visible ? 'shown' : 'hidden'}, syncing to layer panel`);
    
    // Sync UI state across both panels (include source to prevent loops)
    window.dispatchEvent(new CustomEvent('amocToggled', { detail: { visible, source: 'globe' } }));
  }
  
  getAMOCOverlayVisible() {
    return this.amocOverlayVisible;
  }
  
  getAMOCState() {
    return this.amocState;
  }
  
  updateAMOCOverlay(year, milestoneYear, progress) {
    if (!this.amocOverlay || !this.amocOverlayVisible) return;
    
    const scenario = this.getFeverScenario();
    
    // AMOC data model
    const amocData = {
      best: {
        1950: { flowStrength: 1.0, warmHeat: 0.0, coldStrength: 1.0, sinkStrength: 1.0, returnStrength: 1.0 },
        1975: { flowStrength: 0.98, warmHeat: 0.1, coldStrength: 0.95, sinkStrength: 0.95, returnStrength: 0.97 },
        2000: { flowStrength: 0.95, warmHeat: 0.2, coldStrength: 0.9, sinkStrength: 0.9, returnStrength: 0.93 },
        2025: { flowStrength: 0.9, warmHeat: 0.3, coldStrength: 0.85, sinkStrength: 0.8, returnStrength: 0.88 },
        2050: { flowStrength: 0.85, warmHeat: 0.4, coldStrength: 0.8, sinkStrength: 0.7, returnStrength: 0.83 },
        2075: { flowStrength: 0.8, warmHeat: 0.5, coldStrength: 0.75, sinkStrength: 0.6, returnStrength: 0.78 },
        2100: { flowStrength: 0.75, warmHeat: 0.6, coldStrength: 0.7, sinkStrength: 0.5, returnStrength: 0.73 },
        2125: { flowStrength: 0.7, warmHeat: 0.7, coldStrength: 0.65, sinkStrength: 0.4, returnStrength: 0.68 }
      },
      objective: {
        1950: { flowStrength: 1.0, warmHeat: 0.0, coldStrength: 1.0, sinkStrength: 1.0, returnStrength: 1.0 },
        1975: { flowStrength: 0.95, warmHeat: 0.15, coldStrength: 0.9, sinkStrength: 0.9, returnStrength: 0.93 },
        2000: { flowStrength: 0.88, warmHeat: 0.3, coldStrength: 0.8, sinkStrength: 0.75, returnStrength: 0.84 },
        2025: { flowStrength: 0.78, warmHeat: 0.5, coldStrength: 0.7, sinkStrength: 0.6, returnStrength: 0.74 },
        2050: { flowStrength: 0.65, warmHeat: 0.7, coldStrength: 0.55, sinkStrength: 0.4, returnStrength: 0.6 },
        2075: { flowStrength: 0.5, warmHeat: 0.85, coldStrength: 0.4, sinkStrength: 0.25, returnStrength: 0.45 },
        2100: { flowStrength: 0.35, warmHeat: 0.95, coldStrength: 0.25, sinkStrength: 0.15, returnStrength: 0.3 },
        2125: { flowStrength: 0.2, warmHeat: 1.0, coldStrength: 0.15, sinkStrength: 0.05, returnStrength: 0.18 }
      },
      high: {
        1950: { flowStrength: 1.0, warmHeat: 0.0, coldStrength: 1.0, sinkStrength: 1.0, returnStrength: 1.0 },
        1975: { flowStrength: 0.9, warmHeat: 0.25, coldStrength: 0.85, sinkStrength: 0.8, returnStrength: 0.88 },
        2000: { flowStrength: 0.75, warmHeat: 0.5, coldStrength: 0.65, sinkStrength: 0.55, returnStrength: 0.7 },
        2025: { flowStrength: 0.55, warmHeat: 0.75, coldStrength: 0.45, sinkStrength: 0.3, returnStrength: 0.5 },
        2050: { flowStrength: 0.35, warmHeat: 0.9, coldStrength: 0.25, sinkStrength: 0.15, returnStrength: 0.3 },
        2075: { flowStrength: 0.2, warmHeat: 1.0, coldStrength: 0.15, sinkStrength: 0.05, returnStrength: 0.18 },
        2100: { flowStrength: 0.1, warmHeat: 1.0, coldStrength: 0.08, sinkStrength: 0.02, returnStrength: 0.09 },
        2125: { flowStrength: 0.05, warmHeat: 1.0, coldStrength: 0.03, sinkStrength: 0.01, returnStrength: 0.04 }
      }
    };
    
    const milestones = [1950, 1975, 2000, 2025, 2050, 2075, 2100, 2125];
    
    let currentMilestoneIndex = 0;
    for (let i = 0; i < milestones.length - 1; i++) {
      if (year >= milestones[i] && year < milestones[i + 1]) {
        currentMilestoneIndex = i;
        break;
      }
      if (year >= milestones[milestones.length - 1]) {
        currentMilestoneIndex = milestones.length - 2;
        break;
      }
    }
    
    const milestone1 = milestones[currentMilestoneIndex];
    const milestone2 = milestones[currentMilestoneIndex + 1];
    const milestoneProgress = (year - milestone1) / (milestone2 - milestone1);
    
    const data1 = amocData[scenario][milestone1];
    const data2 = amocData[scenario][milestone2];
    
    const interpolate = (a, b, t) => a + (b - a) * t;
    
    const currentState = {
      flowStrength: interpolate(data1.flowStrength, data2.flowStrength, milestoneProgress),
      warmHeat: interpolate(data1.warmHeat, data2.warmHeat, milestoneProgress),
      coldStrength: interpolate(data1.coldStrength, data2.coldStrength, milestoneProgress),
      sinkStrength: interpolate(data1.sinkStrength, data2.sinkStrength, milestoneProgress),
      returnStrength: interpolate(data1.returnStrength, data2.returnStrength, milestoneProgress)
    };
    
    this.amocState = currentState;
    
    // Update warm branch
    let warmBranchColor = null;
    if (this.amocBranches.warm_branch) {
      this.amocBranches.warm_branch.forEach(mesh => {
        if (!mesh.material) return;
        mesh.material.opacity = currentState.flowStrength * 0.8;
        const heatColor = new THREE.Color().lerpColors(
          new THREE.Color(0x0088ff),
          new THREE.Color(0xff4400),
          currentState.warmHeat
        );
        warmBranchColor = heatColor;
        mesh.material.color = heatColor;
        if (mesh.material.emissive) {
          mesh.material.emissive = heatColor;
          mesh.material.emissiveIntensity = 0.2 + currentState.warmHeat * 0.4;
        }
        mesh.scale.setScalar(0.5 + currentState.flowStrength * 0.5);
      });
    }
    
    // Update cold branch
    let coldBranchColor = null;
    if (this.amocBranches.cold_branch) {
      this.amocBranches.cold_branch.forEach(mesh => {
        if (!mesh.material) return;
        mesh.material.opacity = currentState.coldStrength * 0.7;
        const coldColor = new THREE.Color().lerpColors(
          new THREE.Color(0x004488),
          new THREE.Color(0x001122),
          1 - currentState.coldStrength
        );
        coldBranchColor = coldColor;
        mesh.material.color = coldColor;
        mesh.scale.setScalar(0.5 + currentState.coldStrength * 0.5);
      });
    }
    
    // Update north sink
    if (this.amocBranches.north_sink) {
      this.amocBranches.north_sink.forEach(mesh => {
        if (!mesh.material) return;
        mesh.material.opacity = currentState.sinkStrength * 0.8;
        mesh.scale.setScalar(0.5 + currentState.sinkStrength * 0.5);
      });
    }
    
    // Update south return
    if (this.amocBranches.south_return) {
      this.amocBranches.south_return.forEach(mesh => {
        if (!mesh.material) return;
        mesh.material.opacity = currentState.returnStrength * 0.7;
        mesh.scale.setScalar(0.5 + currentState.returnStrength * 0.5);
      });
    }
    
    // Sync AMOC labels to match branch colors/emissive
    if (this.amocLabelsByBranch) {
      // Warm branch labels
      if (warmBranchColor && this.amocLabelsByBranch.warm_branch) {
        this.amocLabelsByBranch.warm_branch.forEach(label => {
          if (!label.material) return;
          label.material.color.copy(warmBranchColor);
          label.material.opacity = Math.max(0.85, currentState.flowStrength);
          if (!label.material.emissive) label.material.emissive = new THREE.Color();
          label.material.emissive.copy(warmBranchColor);
          label.material.emissiveIntensity = 0.3 + currentState.warmHeat * 0.5;
          label.material.needsUpdate = true;
        });
      }
      
      // Cold branch labels
      if (coldBranchColor && this.amocLabelsByBranch.cold_branch) {
        this.amocLabelsByBranch.cold_branch.forEach(label => {
          if (!label.material) return;
          label.material.color.copy(coldBranchColor);
          label.material.opacity = Math.max(0.85, currentState.coldStrength);
          if (!label.material.emissive) label.material.emissive = new THREE.Color();
          label.material.emissive.copy(coldBranchColor);
          label.material.emissiveIntensity = 0.2 + (1 - currentState.coldStrength) * 0.3;
          label.material.needsUpdate = true;
        });
      }
      
      // North sink labels
      if (this.amocLabelsByBranch.north_sink) {
        this.amocLabelsByBranch.north_sink.forEach(label => {
          if (!label.material) return;
          const sinkColor = new THREE.Color(0x0088ff);
          label.material.color.copy(sinkColor);
          label.material.opacity = Math.max(0.85, currentState.sinkStrength);
          if (!label.material.emissive) label.material.emissive = new THREE.Color();
          label.material.emissive.copy(sinkColor);
          label.material.emissiveIntensity = 0.25 + currentState.sinkStrength * 0.35;
          label.material.needsUpdate = true;
        });
      }
      
      // South return labels
      if (this.amocLabelsByBranch.south_return) {
        this.amocLabelsByBranch.south_return.forEach(label => {
          if (!label.material) return;
          const returnColor = new THREE.Color(0x004488);
          label.material.color.copy(returnColor);
          label.material.opacity = Math.max(0.85, currentState.returnStrength);
          if (!label.material.emissive) label.material.emissive = new THREE.Color();
          label.material.emissive.copy(returnColor);
          label.material.emissiveIntensity = 0.2 + currentState.returnStrength * 0.3;
          label.material.needsUpdate = true;
        });
      }
    }
  }
  
  updateTippingOverlay(year, milestoneYear, progress) {
    if (!this.tippingOverlay || !this.tippingOverlayVisible) return;
    
    // Milestone years matching Fever textures exactly
    const milestones = [1950, 1975, 2000, 2025, 2050, 2075, 2100, 2125];
    
    const scenario = this.getFeverScenario();
    const isReversing = this.isFeverReversed();
    
    // Derive milestone data from canonical TIPPING_BOUNDARIES
    const boundaryMilestones = {};
    Object.keys(TIPPING_BOUNDARIES).forEach(boundaryKey => {
      const boundary = TIPPING_BOUNDARIES[boundaryKey];
      if (!boundary.scenarios || !boundary.scenarios[scenario]) {
        console.warn(`[Tipping] Missing scenario ${scenario} for boundary ${boundaryKey}`);
        return;
      }
      const scenarioData = boundary.scenarios[scenario];
      boundaryMilestones[boundaryKey] = milestones.map(year => scenarioData[year]?.progress ?? 0);
    });
    
    // Find which milestone range we're in
    let currentMilestoneIndex = 0;
    for (let i = 0; i < milestones.length - 1; i++) {
      if (year >= milestones[i] && year < milestones[i + 1]) {
        currentMilestoneIndex = i;
        break;
      }
      if (year >= milestones[milestones.length - 1]) {
        currentMilestoneIndex = milestones.length - 2;
        break;
      }
    }
    
    const milestone1 = milestones[currentMilestoneIndex];
    const milestone2 = milestones[currentMilestoneIndex + 1];
    const milestoneProgress = (year - milestone1) / (milestone2 - milestone1);
    
    // Log only on milestone or scenario change
    const stateChanged = !this.lastLoggedMilestone || 
                        this.lastLoggedMilestone !== milestone1 || 
                        this.lastLoggedScenario !== scenario;
    if (stateChanged) {
      console.log(`[Tipping] Milestone: ${milestone1} -> ${milestone2}, Scenario: ${scenario}`);
      this.lastLoggedMilestone = milestone1;
      this.lastLoggedScenario = scenario;
    }
    
    let totalStress = 0;
    let boundaryCount = 0;
    
    Object.keys(boundaryMilestones).forEach(boundary => {
      const milestoneValues = boundaryMilestones[boundary];
      const segments = this.tippingSegments[boundary];
      const label = this.tippingLabels[boundary];
      
      if (!segments || segments.length === 0) {
        if (!this.loggedMissingBoundaries) this.loggedMissingBoundaries = {};
        if (!this.loggedMissingBoundaries[boundary]) {
          console.warn(`[Tipping] No segments for boundary: ${boundary}`);
          this.loggedMissingBoundaries[boundary] = true;
        }
        return;
      }
      
      // Interpolate between milestone values
      const value1 = milestoneValues[currentMilestoneIndex];
      const value2 = milestoneValues[currentMilestoneIndex + 1];
      const boundaryProgress = value1 + (value2 - value1) * milestoneProgress;
      
      totalStress += boundaryProgress;
      boundaryCount++;
      
      // Check for tipping threshold crossing
      const direction = isReversing ? 'reverse' : 'forward';
      const wasTriggered = this.tippingTriggered[boundary]?.[direction];
      const nowAtThreshold = boundaryProgress >= 1.0;
      
      if (!wasTriggered && nowAtThreshold && !isReversing) {
        this.emitTippingWarning(boundary, year, scenario);
        if (this.tippingTriggered[boundary]) {
          this.tippingTriggered[boundary].forward = true;
        }
        console.log(`[Tipping] Threshold crossed: ${boundary} at year ${year} (${scenario})`);
      } else if (wasTriggered && !nowAtThreshold && isReversing) {
        if (this.tippingTriggered[boundary]) {
          this.tippingTriggered[boundary].reverse = false;
        }
      }
      
      // Calculate segment activation
      const activeCount = Math.floor(boundaryProgress * segments.length);
      const partialProgress = (boundaryProgress * segments.length) % 1;
      
      segments.forEach((seg, i) => {
        if (!seg.material) return;
        
        if (i < activeCount) {
          seg.material.opacity = 1.0;
          const color = this.getBoundaryColor(boundaryProgress);
          seg.material.color = color;
          if (seg.material.emissive) {
            seg.material.emissive = color;
            seg.material.emissiveIntensity = 0.3 + boundaryProgress * 0.4;
          }
        } else if (i === activeCount) {
          seg.material.opacity = partialProgress;
          const color = this.getBoundaryColor(boundaryProgress);
          seg.material.color = color;
          if (seg.material.emissive) {
            seg.material.emissive = color;
            seg.material.emissiveIntensity = 0.2 * partialProgress;
          }
        } else {
          seg.material.opacity = 0;
        }
      });
      
      // Update labels
      if (label && label.material) {
        const labelColor = this.getBoundaryColor(boundaryProgress);
        label.material.color.copy(labelColor);
        
        if (!label.material.emissive) {
          label.material.emissive = new THREE.Color();
        }
        
        if (boundaryProgress >= 1.0) {
          label.material.emissive.setHex(0xff0000);
          label.material.emissiveIntensity = 0.8;
        } else if (boundaryProgress >= 0.75) {
          label.material.emissive.setHex(0xff8800);
          label.material.emissiveIntensity = 0.4;
        } else if (boundaryProgress >= 0.5) {
          label.material.emissive.setHex(0xffff00);
          label.material.emissiveIntensity = 0.2;
        } else {
          label.material.emissive.setHex(0x00ffcc);
          label.material.emissiveIntensity = 0.1;
        }
        
        label.material.needsUpdate = true;
      }
    });
    
    if (boundaryCount > 0) {
      const avgStress = totalStress / boundaryCount;
      this.updateFeverAtmosphere(avgStress);
    }
  }
  
  emitTippingWarning(boundary, year, scenario) {
    // Emit monitoring-style warning instead of topic creation
    const boundaryTitles = {
      'climate_change': 'Climate Change',
      'novel_entities': 'Novel Entities',
      'stratospheric_ozone_depletion': 'Ozone Depletion',
      'atmospheric_aerosol_loading': 'Aerosol Loading',
      'ocean_acidification': 'Ocean Acidification',
      'biogeochemical_flows': 'Biogeochemical Flows',
      'freshwater_change': 'Freshwater Change',
      'land_system_change': 'Land System Change',
      'biosphere_integrity': 'Biosphere Integrity'
    };
    
    const warningText = `WARNING: ${boundaryTitles[boundary]} tipping threshold reached`;
    
    // Dispatch event for monitoring UI to display
    window.dispatchEvent(new CustomEvent('tippingThresholdCrossed', { 
      detail: { 
        boundary,
        year,
        scenario,
        warningText
      } 
    }));
  }
  
  triggerTippingTopic(boundary, year, scenario) {
    console.log(`[Tipping] Threshold crossed: ${boundary} at year ${year} (${scenario} scenario)`);
    
    // Create or dispatch tipping point event
    const boundaryTitles = {
      'climate_change': 'Climate Change Tipping Point',
      'novel_entities': 'Novel Entities Tipping Point',
      'stratospheric_ozone_depletion': 'Ozone Depletion Tipping Point',
      'atmospheric_aerosol_loading': 'Aerosol Loading Tipping Point',
      'ocean_acidification': 'Ocean Acidification Tipping Point',
      'biogeochemical_flows': 'Biogeochemical Flows Tipping Point',
      'freshwater_change': 'Freshwater Change Tipping Point',
      'land_system_change': 'Land System Change Tipping Point',
      'biosphere_integrity': 'Biosphere Integrity Tipping Point'
    };
    
    const topic = {
      id: `tipping_${boundary}_${scenario}`,
      year: year,
      title: boundaryTitles[boundary] || `${boundary} Tipping Point`,
      category: 'earths-fever',
      date: new Date().toISOString().split('T')[0],
      country: 'Global',
      region: 'Worldwide',
      lat: 0,
      lon: 0,
      summary: `The ${boundary.replace(/_/g, ' ')} planetary boundary has reached its tipping threshold under the ${scenario} scenario.`,
      source: 'Earth\'s Fever Tipping Point System',
      insight: `This tipping point marks a critical threshold where feedback loops may accelerate beyond human control. Immediate action is needed.`,
      level: 'critical',
      scenario: scenario,
      isFeverWarning: true,
      ttsText: `${boundaryTitles[boundary]} reached at year ${year}`
    };
    
    // Dispatch event to create/show topic
    window.dispatchEvent(new CustomEvent('feverWarningCreated', { 
      detail: { warning: topic } 
    }));
  }
  
  getBoundaryColor(progress) {
    // Stronger Fever palette: green/cyan/white -> yellow/orange -> strong red
    if (progress < 0.2) {
      // Safe zone: green to cyan
      return new THREE.Color().lerpColors(
        new THREE.Color(0x00ff88), // Green
        new THREE.Color(0x00ffcc), // Cyan
        progress * 5
      );
    } else if (progress < 0.4) {
      // Low stress: cyan to white
      return new THREE.Color().lerpColors(
        new THREE.Color(0x00ffcc), // Cyan
        new THREE.Color(0xffffff), // White
        (progress - 0.2) * 5
      );
    } else if (progress < 0.6) {
      // Rising stress: white to yellow
      return new THREE.Color().lerpColors(
        new THREE.Color(0xffffff), // White
        new THREE.Color(0xffff00), // Yellow
        (progress - 0.4) * 5
      );
    } else if (progress < 0.8) {
      // Mid stress: yellow to orange
      return new THREE.Color().lerpColors(
        new THREE.Color(0xffff00), // Yellow
        new THREE.Color(0xff8800), // Orange
        (progress - 0.6) * 5
      );
    } else {
      // Tipping zone: orange to strong red
      return new THREE.Color().lerpColors(
        new THREE.Color(0xff8800), // Orange
        new THREE.Color(0xff0000), // Strong red
        (progress - 0.8) * 5
      );
    }
  }
  
  updateFeverAtmosphere(stress) {
    if (this.atmosphere && this.atmosphere.material.uniforms) {
      this.atmosphere.material.uniforms.stressLevel.value = Math.min(stress, 1.0);
    }
  }
  
  showLoadingBar() {
    if (!this.loadingBar) {
      this.loadingBar = document.createElement('div');
      this.loadingBar.className = 'globe-loading-bar';
      this.loadingBar.innerHTML = `
        <div class="loading-bar-container">
          <div class="loading-bar-fill"></div>
          <div class="loading-bar-text">Loading Globe...</div>
        </div>
      `;
      document.body.appendChild(this.loadingBar);
    }
    this.loadingBar.style.display = 'block';
  }
  
  updateLoadingBar(progress) {
    if (this.loadingBar) {
      const fill = this.loadingBar.querySelector('.loading-bar-fill');
      if (fill) {
        fill.style.width = (progress * 100) + '%';
      }
    }
  }
  
  hideLoadingBar() {
    if (this.loadingBar) {
      this.loadingBar.style.display = 'none';
    }
  }

  onMouseDoubleClick(event) {
    // Disable double-clicks in fever mode
    if (this.inFeverMode) return;
    
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    // Check if double-clicked on Earth
    const earthIntersects = this.raycaster.intersectObject(this.earth, false);
    if (earthIntersects.length > 0 && this.globeClickCallback) {
      // Only use the first intersection that's facing the camera (front face)
      const validIntersect = earthIntersects.find(intersect => {
        const normal = intersect.face.normal.clone();
        const worldNormal = normal.transformDirection(this.earth.matrixWorld);
        const cameraDirection = new THREE.Vector3()
          .subVectors(intersect.point, this.camera.position)
          .normalize();
        // If dot product is negative, surface is facing camera
        return worldNormal.dot(cameraDirection) < 0;
      });
      
      if (validIntersect) {
        // Transform intersection point from world space to Earth's local space
        const localPoint = validIntersect.point.clone();
        localPoint.applyAxisAngle(new THREE.Vector3(0, 1, 0), -this.earth.rotation.y);
        const latLon = this.vector3ToLatLon(localPoint);
        this.globeClickCallback(latLon);
      }
    }
  }

  onWindowResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    // Enable auto-rotation in fever mode
    if (this.options.autoRotate && !this.isFocused && !this.inSolarSystemView) {
      this.earth.rotation.y += 0.001;
    }

    const time = Date.now() * 0.001;
    const delta = 0.016;
    
    if (this.inFeverMode) {
      if (!this.feverOverlayAnchor) {
        this.feverOverlayAnchor = new THREE.Group();
        this.scene.add(this.feverOverlayAnchor);
        console.log('[Fever Overlay] Shared anchor created');
      }
      
      this.feverOverlayAnchor.quaternion.copy(this.camera.quaternion);
      const cameraToEarth = new THREE.Vector3().subVectors(this.earth.position, this.camera.position).normalize();
      const offsetDistance = 1.15;
      this.feverOverlayAnchor.position.copy(this.earth.position).add(cameraToEarth.multiplyScalar(-offsetDistance));
      
      if (this.tippingOverlayRoot && this.tippingOverlayRoot.parent !== this.feverOverlayAnchor) {
        this.scene.remove(this.tippingOverlayRoot);
        this.feverOverlayAnchor.add(this.tippingOverlayRoot);
        this.tippingOverlayRoot.position.set(0, 0.03, 0);
        console.log('[Fever Overlay] Tipping parented to shared anchor');
      }
      
      if (this.amocOverlayRoot && this.amocOverlayRoot.parent !== this.feverOverlayAnchor) {
        this.scene.remove(this.amocOverlayRoot);
        this.feverOverlayAnchor.add(this.amocOverlayRoot);
        this.amocOverlayRoot.position.set(0, 0, 0.01);
        console.log('[Fever Overlay] AMOC parented to shared anchor');
      }
      
      if (this.feverYearOverlayRoot && this.feverYearOverlayRoot.parent !== this.feverOverlayAnchor) {
        this.scene.remove(this.feverYearOverlayRoot);
        this.feverOverlayAnchor.add(this.feverYearOverlayRoot);
        this.feverYearOverlayRoot.position.set(0, 0, 0.02);
        console.log('[Fever Overlay] Year parented to shared anchor');
      }
    }
    
    // Update Earth's Fever animation
    if (this.inFeverMode && this.feverTextures.length > 0 && !this.feverPaused) {
      // Apply reverse direction
      const direction = this.feverReverse ? -1 : 1;
      this.feverAnimationTime += delta * this.feverSpeed * direction;
      
      // Compute timeline parameters
      const baseDuration = 3.0; // seconds per segment at speed 1.0
      const segmentDuration = baseDuration / this.feverSpeed;
      const intervalCount = this.feverYears.length - 1; // 7 intervals
      const totalTimelineDuration = segmentDuration * intervalCount;
      
      // Clamp and loop
      if (this.feverAnimationTime < 0) {
        this.feverAnimationTime = 0;
        this.feverReverse = false;
      } else if (this.feverAnimationTime >= totalTimelineDuration) {
        // Loop finished -> reset to baseline 2025 (index 3)
        const baselineIndex = 3;
        this.feverAnimationTime = baselineIndex * segmentDuration;
        this.feverCurrentIndex = baselineIndex;
        
        if (this.tippingTriggered) {
          Object.keys(this.tippingTriggered).forEach(boundary => {
            this.tippingTriggered[boundary].forward = false;
          });
        }
        
        console.log(`[Fever Loop] Baseline reset -> 2025 (index ${baselineIndex})`);
      }
      
      // Determine current segment
      const segmentIndex = Math.floor(this.feverAnimationTime / segmentDuration);
      const nextSegmentIndex = Math.min(segmentIndex + 1, this.feverYears.length - 1);
      const localProgress = (this.feverAnimationTime % segmentDuration) / segmentDuration;
      
      const transitionDuration = 0.5;
      const mixFactor = Math.min(localProgress / (transitionDuration / segmentDuration), 1.0);
      
      // Update textures if segment changed
      if (segmentIndex !== this.feverCurrentIndex) {
        this.feverCurrentIndex = segmentIndex;
        if (this.earth.material.uniforms) {
          this.earth.material.uniforms.texture1.value = this.feverTextures[segmentIndex];
          this.earth.material.uniforms.texture2.value = this.feverTextures[nextSegmentIndex];
        }
      }
      
      // Interpolate year within segment
      const milestoneYear = this.feverYears[segmentIndex];
      const nextMilestoneYear = this.feverYears[nextSegmentIndex];
      const interpolatedYear = Math.round(milestoneYear + (nextMilestoneYear - milestoneYear) * localProgress);
      
      // Timeline progress
      const timelineProgress = this.feverAnimationTime / totalTimelineDuration;
      
      // Update overlays
      this.updateTippingOverlay(interpolatedYear, milestoneYear, timelineProgress);
      this.updateAMOCOverlay(interpolatedYear, milestoneYear, timelineProgress);
      
      this.updateFeverYearText(interpolatedYear);
      
      window.dispatchEvent(new CustomEvent('feverYearChanged', { 
        detail: { 
          year: interpolatedYear,
          milestoneYear: milestoneYear,
          progress: timelineProgress
        } 
      }));
      
      // Update shader
      if (this.earth.material.uniforms) {
        this.earth.material.uniforms.mixFactor.value = mixFactor;
        const atmosphereIntensity = this.getFeverLightingBrightness(timelineProgress);
        this.earth.material.uniforms.atmosphereIntensity.value = atmosphereIntensity;
        this.logFeverLightingBrightness(timelineProgress);
      }
      
      // Heartbeat pulse effect - accelerates with progress
      const progress = this.feverCurrentIndex / (this.feverTextures.length - 1);
      const heartbeatSpeed = 1.0 + progress * 3.0; // Speed increases from 1x to 4x
      const pulse = Math.sin(time * heartbeatSpeed * 2) * 0.02 + 1.0;
      this.earth.scale.setScalar(pulse);
    } else if (this.earth.scale.x !== 1.0 && !this.inFeverMode) {
      // Reset scale when not in fever mode
      this.earth.scale.setScalar(1.0);
    }
    
    // Update solar system animations - reduce speed when planet focused
    if (this.solarSystemMixer) {
      const speed = this.isPlanetFocused ? 0.025 : 0.05;
      this.solarSystemMixer.update(delta * speed);
    }
    
    // Keep focused planet centered if one is selected - update every frame to follow planet movement
    if (this.focusedPlanet && this.focusedPlanetOffset && this.inSolarSystemView) {
      // Recompute planet center every frame (handles animation)
      const planetCenter = this.getPlanetCenter(this.focusedPlanet);
      
      // Update controls target to planet center
      this.controls.target.copy(planetCenter);
      
      // Move camera to maintain stable offset from planet center
      this.camera.position.copy(planetCenter).add(this.focusedPlanetOffset);
    }
    
    if (!this.inSolarSystemView) {
      this.markers.forEach(marker => {
        if (marker.visible && marker.children[0]) {
          const pulse = Math.sin(time * 2 + marker.userData.pulsePhase) * 0.2 + 0.8;
          marker.children[0].scale.setScalar(pulse);
        }
      });
      
      // Animate location marker if present
      if (this.locationMarker && this.locationMarker.children[0]) {
        const pulse = Math.sin(time * 3) * 0.3 + 0.7;
        this.locationMarker.children[0].scale.setScalar(pulse);
      }

      if (this.cloudLayer && this.cloudLayer.visible) {
        this.cloudLayer.rotation.y += this.cloudLayer.userData.rotationSpeed || 0.00012;
      }
    }

    this.controls.update();
    
    // After controls update, recalculate offset if user interacted (zoom/rotate)
    if (this.focusedPlanet && this.focusedPlanetOffset && this.inSolarSystemView) {
      const planetCenter = this.getPlanetCenter(this.focusedPlanet);
      // Update offset based on where camera ended up after controls.update()
      // This captures user zoom/rotation while maintaining planet tracking
      this.focusedPlanetOffset.copy(this.camera.position).sub(planetCenter);
    }
    
    this.renderer.render(this.scene, this.camera);
  }

  handleFeverModeClick(event) {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    if (!this.tippingOverlayRoot || !this.tippingOverlayVisible) return false;
    
    // Check for label or segment clicks
    const intersects = this.raycaster.intersectObjects(this.tippingOverlayRoot.children, true);
    
    if (intersects.length > 0) {
      const clicked = intersects[0].object;
      const boundaryKey = this.resolveBoundaryFromMesh(clicked);
      
      if (boundaryKey) {
        // Track click timing for single vs double click
        const now = Date.now();
        const isDoubleClick = this.lastBoundaryClickTime && 
                             this.lastBoundaryClickKey === boundaryKey &&
                             (now - this.lastBoundaryClickTime) < 300;
        
        if (isDoubleClick) {
          // Double click - open detail
          window.dispatchEvent(new CustomEvent('boundaryDoubleClick', {
            detail: { boundary: boundaryKey }
          }));
          this.lastBoundaryClickTime = null;
          this.lastBoundaryClickKey = null;
        } else {
          // Single click - select and highlight
          this.selectBoundary(boundaryKey);
          this.lastBoundaryClickTime = now;
          this.lastBoundaryClickKey = boundaryKey;
        }
        return true; // Tipping object was clicked
      }
    }
    
    return false; // No tipping object clicked
  }
  
  resolveBoundaryFromMesh(mesh) {
    // Walk up hierarchy to find boundary name
    let current = mesh;
    while (current) {
      if (current.name) {
        if (current.name.startsWith('SEG_') || current.name.startsWith('LBL_')) {
          return this.normalizeBoundaryKey(current.name.replace(/^(SEG_|LBL_)/, ''));
        }
      }
      current = current.parent;
      if (current === this.tippingOverlayRoot) break;
    }
    return null;
  }
  
  selectBoundary(boundaryKey) {
    this.selectedBoundary = boundaryKey;
    
    // Highlight selected boundary
    this.highlightBoundary(boundaryKey);
    
    console.log(`[Tipping] Selected boundary: ${boundaryKey}`);
    
    // Dispatch event for UI sync
    window.dispatchEvent(new CustomEvent('boundarySelected', {
      detail: { boundary: boundaryKey }
    }));
  }
  
  highlightBoundary(boundaryKey) {
    const NORMAL_INTENSITY = 0.3;
    const SELECTED_INTENSITY = 1.2;
    const DIM_INTENSITY = 0.1;
    
    // Reset all boundaries to normal or dim using absolute values
    Object.keys(this.tippingSegments).forEach(key => {
      const segments = this.tippingSegments[key];
      const intensity = (boundaryKey && key !== boundaryKey) ? DIM_INTENSITY : NORMAL_INTENSITY;
      segments.forEach(seg => {
        if (seg.material && seg.material.emissiveIntensity !== undefined) {
          seg.material.emissiveIntensity = intensity;
        }
      });
    });
    
    Object.keys(this.tippingLabels).forEach(key => {
      const label = this.tippingLabels[key];
      const intensity = (boundaryKey && key !== boundaryKey) ? DIM_INTENSITY : NORMAL_INTENSITY;
      if (label && label.material && label.material.emissiveIntensity !== undefined) {
        label.material.emissiveIntensity = intensity;
      }
    });
    
    // Highlight selected with absolute value
    if (boundaryKey) {
      const selectedSegments = this.tippingSegments[boundaryKey];
      if (selectedSegments) {
        selectedSegments.forEach(seg => {
          if (seg.material && seg.material.emissiveIntensity !== undefined) {
            seg.material.emissiveIntensity = SELECTED_INTENSITY;
          }
        });
      }
      
      const selectedLabel = this.tippingLabels[boundaryKey];
      if (selectedLabel && selectedLabel.material && selectedLabel.material.emissiveIntensity !== undefined) {
        selectedLabel.material.emissiveIntensity = SELECTED_INTENSITY;
      }
    }
  }
  
  getSelectedBoundary() {
    return this.selectedBoundary;
  }
  
  clearBoundarySelection() {
    if (this.selectedBoundary) {
      console.log(`[Tipping] Cleared boundary selection: ${this.selectedBoundary}`);
    }
    this.selectedBoundary = null;
    const NORMAL_INTENSITY = 0.3;
    
    // Reset all to normal intensity using absolute values
    Object.keys(this.tippingSegments).forEach(key => {
      const segments = this.tippingSegments[key];
      segments.forEach(seg => {
        if (seg.material && seg.material.emissiveIntensity !== undefined) {
          seg.material.emissiveIntensity = NORMAL_INTENSITY;
        }
      });
    });
    
    Object.keys(this.tippingLabels).forEach(key => {
      const label = this.tippingLabels[key];
      if (label && label.material && label.material.emissiveIntensity !== undefined) {
        label.material.emissiveIntensity = NORMAL_INTENSITY;
      }
    });
  }
  
  destroy() {
    this.removeAllMarkers();
    this.scene.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
    this.renderer.dispose();
    this.controls.dispose();
    if (this.tooltip) this.tooltip.remove();
  }
}
