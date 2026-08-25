/**
 * PHOENIX — 3D Earth Network Visualization
 * Technology: Three.js
 * Features: Dark & Light Mode Color Transitions, Freelancer Nodes, Bezier Packet Arcs, Mouse Drag & Tilt
 */

(function () {
  'use strict';

  const container = document.getElementById('phGlobeContainer');
  const canvas = document.getElementById('phGlobeCanvas');
  const fallback = document.getElementById('phGlobeFallback');

  if (!container || !canvas) return;

  // Check WebGL Support
  function hasWebGL() {
    try {
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!(window.WebGLRenderingContext && gl);
    } catch (e) {
      return false;
    }
  }

  if (!window.THREE || !hasWebGL()) {
    if (fallback) fallback.style.display = 'flex';
    canvas.style.display = 'none';
    return;
  }

  const THREE = window.THREE;

  // Scene, Camera, Renderer
  const scene = new THREE.Scene();
  const width = container.clientWidth || 500;
  const height = container.clientHeight || 500;

  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.z = 280;

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Globe Group (will rotate)
  const globeGroup = new THREE.Group();
  scene.add(globeGroup);

  const GLOBE_RADIUS = 80;
  const isMobile = window.innerWidth < 768;

  function isLightMode() {
    return document.documentElement.getAttribute('data-theme') === 'light';
  }

  // 1. Base Sphere
  const sphereGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 36, 36);
  const sphereMat = new THREE.MeshBasicMaterial({
    color: isLightMode() ? 0xe2e8f0 : 0x090b12,
    transparent: true,
    opacity: 0.95
  });
  const baseSphere = new THREE.Mesh(sphereGeo, sphereMat);
  globeGroup.add(baseSphere);

  // 2. Faint Geographic / Lat-Long Grid Wireframe
  const wireGeo = new THREE.SphereGeometry(GLOBE_RADIUS + 0.5, 24, 24);
  const wireMat = new THREE.MeshBasicMaterial({
    color: isLightMode() ? 0x94a3b8 : 0x1e293b,
    wireframe: true,
    transparent: true,
    opacity: isLightMode() ? 0.25 : 0.35
  });
  const wireSphere = new THREE.Mesh(wireGeo, wireMat);
  globeGroup.add(wireSphere);

  // 3. Subtle Glowing Atmosphere Halo
  const haloGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.15, 32, 32);
  const haloMat = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      void main() {
        float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.5);
        gl_FragColor = vec4(0.22, 0.74, 0.97, 1.0) * intensity * 0.4;
      }
    `,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true
  });
  const halo = new THREE.Mesh(haloGeo, haloMat);
  scene.add(halo);

  // 4. Dot Cloud on Earth Surface
  const particleCount = isMobile ? 400 : 900;
  const pointsGeo = new THREE.BufferGeometry();
  const pointPositions = [];

  for (let i = 0; i < particleCount; i++) {
    const phi = Math.acos(-1 + (2 * i) / particleCount);
    const theta = Math.sqrt(particleCount * Math.PI) * phi;
    const r = GLOBE_RADIUS + 1.2;

    const x = r * Math.cos(theta) * Math.sin(phi);
    const y = r * Math.sin(theta) * Math.sin(phi);
    const z = r * Math.cos(phi);

    pointPositions.push(x, y, z);
  }

  pointsGeo.setAttribute('position', new THREE.Float32BufferAttribute(pointPositions, 3));
  const pointsMat = new THREE.PointsMaterial({
    color: isLightMode() ? 0x0284c7 : 0x38bdf8,
    size: isMobile ? 1.5 : 2.0,
    transparent: true,
    opacity: isLightMode() ? 0.8 : 0.6,
    blending: THREE.AdditiveBlending
  });
  const pointCloud = new THREE.Points(pointsGeo, pointsMat);
  globeGroup.add(pointCloud);

  // Helper: Lat/Lng to Vector3
  function latLngToVector3(lat, lng, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    return new THREE.Vector3(
      -(radius * Math.sin(phi) * Math.cos(theta)),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }

  // 5. Central PHOENIX Hub (MBM University coordinates 26.27 N, 73.03 E)
  const hubPos = latLngToVector3(26.27, 73.03, GLOBE_RADIUS + 2);

  const hubMarkerGeo = new THREE.SphereGeometry(3.5, 16, 16);
  const hubMarkerMat = new THREE.MeshBasicMaterial({
    color: isLightMode() ? 0x0284c7 : 0x38bdf8,
    blending: THREE.AdditiveBlending
  });
  const hubMesh = new THREE.Mesh(hubMarkerGeo, hubMarkerMat);
  hubMesh.position.copy(hubPos);
  globeGroup.add(hubMesh);

  // Hub Pulsing Ring
  const hubRingGeo = new THREE.RingGeometry(4, 7, 32);
  const hubRingMat = new THREE.MeshBasicMaterial({
    color: 0x818cf8,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending
  });
  const hubRing = new THREE.Mesh(hubRingGeo, hubRingMat);
  hubRing.position.copy(hubPos);
  hubRing.lookAt(new THREE.Vector3(0, 0, 0));
  globeGroup.add(hubRing);

  // 6. Student Freelancer Nodes
  const freelancerNodes = [
    { name: 'Rahul', skill: 'Web Dev', lat: 28.61, lng: 77.20, color: 0x38bdf8 },
    { name: 'Rishabh', skill: 'AI/ML', lat: 19.07, lng: 72.87, color: 0xa855f7 },
    { name: 'Priya', skill: 'UI/UX', lat: 12.97, lng: 77.59, color: 0xf43f5e },
    { name: 'Aman', skill: 'Video', lat: 22.57, lng: 88.36, color: 0xf59e0b },
    { name: 'Aarav', skill: 'App Dev', lat: 23.02, lng: 72.57, color: 0x10b981 },
    { name: 'Sneha', skill: 'Marketing', lat: 17.38, lng: 78.48, color: 0xec4899 },
    { name: 'Dev', skill: 'Cloud', lat: 30.73, lng: 76.77, color: 0x60a5fa }
  ];

  const networkCurves = [];
  const animatedPackets = [];

  freelancerNodes.forEach((node) => {
    const nodePos = latLngToVector3(node.lat, node.lng, GLOBE_RADIUS + 2);

    // Node Dot
    const nodeGeo = new THREE.SphereGeometry(2.2, 12, 12);
    const nodeMat = new THREE.MeshBasicMaterial({ color: node.color });
    const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
    nodeMesh.position.copy(nodePos);
    globeGroup.add(nodeMesh);

    // 3D Bezier Arc to PHOENIX Hub
    const midPoint = new THREE.Vector3().addVectors(nodePos, hubPos).multiplyScalar(0.5);
    const distance = nodePos.distanceTo(hubPos);
    midPoint.normalize().multiplyScalar(GLOBE_RADIUS + distance * 0.45);

    const curve = new THREE.QuadraticBezierCurve3(nodePos, midPoint, hubPos);
    networkCurves.push(curve);

    const curvePoints = curve.getPoints(36);
    const curveGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);
    const curveMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending
    });
    const curveLine = new THREE.Line(curveGeo, curveMat);
    globeGroup.add(curveLine);

    // Animated packet on curve
    const packetGeo = new THREE.SphereGeometry(1.6, 8, 8);
    const packetMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      blending: THREE.AdditiveBlending
    });
    const packet = new THREE.Mesh(packetGeo, packetMat);
    globeGroup.add(packet);

    animatedPackets.push({
      mesh: packet,
      curve: curve,
      progress: Math.random(),
      speed: 0.006 + Math.random() * 0.004
    });
  });

  // Dynamic Theme Transition Listener
  window.addEventListener('themeChanged', (e) => {
    const theme = e.detail.theme;
    const isLight = theme === 'light';
    baseSphere.material.color.setHex(isLight ? 0xe2e8f0 : 0x090b12);
    wireSphere.material.color.setHex(isLight ? 0x94a3b8 : 0x1e293b);
    wireSphere.material.opacity = isLight ? 0.25 : 0.35;
    pointsMat.color.setHex(isLight ? 0x0284c7 : 0x38bdf8);
    hubMarkerMat.color.setHex(isLight ? 0x0284c7 : 0x38bdf8);
  });

  // Mouse / Drag Interaction
  let isDragging = false;
  let prevMousePos = { x: 0, y: 0 };
  let targetRotation = { x: 0.2, y: -0.6 };
  let currentRotation = { x: 0.2, y: -0.6 };

  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    prevMousePos = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) {
      const normX = (e.clientX / window.innerWidth) - 0.5;
      const normY = (e.clientY / window.innerHeight) - 0.5;
      globeGroup.position.x = normX * 15;
      globeGroup.position.y = -normY * 15;
      return;
    }

    const deltaX = e.clientX - prevMousePos.x;
    const deltaY = e.clientY - prevMousePos.y;

    targetRotation.y += deltaX * 0.005;
    targetRotation.x += deltaY * 0.005;

    prevMousePos = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  // Touch Support
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      isDragging = true;
      prevMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    const deltaX = e.touches[0].clientX - prevMousePos.x;
    const deltaY = e.touches[0].clientY - prevMousePos.y;

    targetRotation.y += deltaX * 0.006;
    targetRotation.x += deltaY * 0.006;

    prevMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });

  window.addEventListener('touchend', () => {
    isDragging = false;
  });

  // Resize Handler
  function onWindowResize() {
    const newW = container.clientWidth || 500;
    const newH = container.clientHeight || 500;
    camera.aspect = newW / newH;
    camera.updateProjectionMatrix();
    renderer.setSize(newW, newH);
  }

  window.addEventListener('resize', onWindowResize);

  // Animation Loop
  let clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    if (!isDragging) {
      targetRotation.y += 0.0025;
    }

    currentRotation.x += (targetRotation.x - currentRotation.x) * 0.05;
    currentRotation.y += (targetRotation.y - currentRotation.y) * 0.05;

    globeGroup.rotation.x = currentRotation.x;
    globeGroup.rotation.y = currentRotation.y;

    const time = clock.getElapsedTime();
    const scale = 1 + Math.sin(time * 3) * 0.15;
    hubRing.scale.set(scale, scale, scale);

    animatedPackets.forEach((p) => {
      p.progress += p.speed;
      if (p.progress > 1) p.progress = 0;
      const point = p.curve.getPoint(p.progress);
      p.mesh.position.copy(point);
    });

    renderer.render(scene, camera);
  }

  animate();
})();
