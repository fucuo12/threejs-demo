import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 10;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// 创建 EffectComposer（后处理核心）
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// 配置 Bloom 效果
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.5, // strength
  0.4, // radius
  0.9  // threshold
);
composer.addPass(bloomPass);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// 添加环境光
const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
scene.add(ambientLight);

// 创建核心粒子系统
const coreCount = 10000;
const coreGeometry = new THREE.BufferGeometry();
const corePositions = new Float32Array(coreCount * 3);
const coreSizes = new Float32Array(coreCount);
const coreColors = new Float32Array(coreCount * 3);

for (let i = 0; i < coreCount; i++) {
  const theta = Math.PI * 2 * Math.random();
  const phi = Math.acos(2 * Math.random() - 1);
  const minRadius = 2.5;
  const maxRadius = 3.0;
  const radius = minRadius + Math.random() * (maxRadius - minRadius);
  const x = Math.sin(phi) * Math.cos(theta) * radius;
  const y = Math.sin(phi) * Math.sin(theta) * radius;
  const z = Math.cos(phi) * radius;
  corePositions[i * 3] = x;
  corePositions[i * 3 + 1] = y;
  corePositions[i * 3 + 2] = z;
  coreSizes[i] = (0.3 + Math.random() * 0.2) * 10;
  let hue = Math.random() < 0.5 ? (270 + Math.random() * 30) / 360 : (30 + Math.random() * 30) / 360;
  const color = new THREE.Color().setHSL(hue, 1, 0.6);
  coreColors[i * 3] = color.r;
  coreColors[i * 3 + 1] = color.g;
  coreColors[i * 3 + 2] = color.b;
}

coreGeometry.setAttribute('position', new THREE.Float32BufferAttribute(corePositions, 3));
coreGeometry.setAttribute('size', new THREE.Float32BufferAttribute(coreSizes, 1));
coreGeometry.setAttribute('color', new THREE.Float32BufferAttribute(coreColors, 3));

const coreMaterial = new THREE.ShaderMaterial({
  vertexShader: `
    attribute float size;
    attribute vec3 color;
    varying vec3 vColor;
    varying vec3 vPosition;
    void main() {
      vColor = color;
      vPosition = position;
      gl_PointSize = size;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    precision mediump float;
    varying vec3 vColor;
    varying vec3 vPosition;
    void main() {
      vec2 uv = gl_PointCoord - vec2(0.5);
      float dist = length(uv);
      if (dist > 0.5) discard;
      vec3 blue = vec3(0.2, 0.2, 1.0);
      vec3 white = vec3(1.0, 1.0, 1.0);
      float zFactor = smoothstep(0.0, 2.0, abs(vPosition.z));
      vec3 mixedColor = mix(white, blue, zFactor);
      float brightness = 1.6 + (1.0 - zFactor) * 0.3;
      gl_FragColor = vec4(mixedColor * brightness, 1.0);
    }
  `,
  transparent: true,
  depthWrite: false
});

const particleSystem = new THREE.Points(coreGeometry, coreMaterial);
scene.add(particleSystem);

// 创建星环粒子系统
const asteroidCount = 10000;
const asteroidGeometry = new THREE.BufferGeometry();
const asteroidPositions = new Float32Array(asteroidCount * 3);
const asteroidSizes = new Float32Array(asteroidCount);
const asteroidColors = new Float32Array(asteroidCount * 3);

for (let i = 0; i < asteroidCount; i++) {
  const angle = Math.PI * 2 * Math.random();
  const radius = 2.8 + Math.pow(Math.random(), 2) * 6;
  const height = (Math.pow(Math.random(), 2) * 1.2) * (Math.random() < 0.5 ? -1 : 1);
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;
  const z = height;
  asteroidPositions[i * 3] = x;
  asteroidPositions[i * 3 + 1] = y;
  asteroidPositions[i * 3 + 2] = z;
  asteroidSizes[i] = (0.3 + Math.random() * 0.2) * 10;
  let hue = Math.random() < 0.5 ? (270 + Math.random() * 30) / 360 : (30 + Math.random() * 30) / 360;
  const color = new THREE.Color().setHSL(hue, 1, 0.6);
  asteroidColors[i * 3] = color.r;
  asteroidColors[i * 3 + 1] = color.g;
  asteroidColors[i * 3 + 2] = color.b;
}

asteroidGeometry.setAttribute('position', new THREE.Float32BufferAttribute(asteroidPositions, 3));
asteroidGeometry.setAttribute('size', new THREE.Float32BufferAttribute(asteroidSizes, 1));
asteroidGeometry.setAttribute('color', new THREE.Float32BufferAttribute(asteroidColors, 3));

const asteroidMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 }
  },
  vertexShader: `
    attribute float size;
    attribute vec3 color;
    varying vec3 vColor;
    varying float vDistance;
    uniform float uTime;
    void main() {
      vColor = color;
      float radius = length(position.xy);
      float angle = atan(position.y, position.x);
      float wave = sin(radius * 2.0 - uTime * 5.0) * 0.7 + 0.5;
      float displacement = sin(angle * 3.0 + uTime * 2.0) * wave * 0.3;
      vec4 pos = vec4(position.xy, position.z + displacement, 1.0);
      vec3 worldPos = (modelMatrix * pos).xyz;
      vDistance = length(worldPos);
      gl_PointSize = size;
      gl_Position = projectionMatrix * modelViewMatrix * pos;
    }
  `,
  fragmentShader: `
    precision mediump float;
    varying vec3 vColor;
    varying float vDistance;
    void main() {
      vec2 uv = gl_PointCoord - vec2(0.5);
      float dist = length(uv);
      if (dist > 0.5) discard;
      vec3 blue = vec3(0.2, 0.2, 1.0);
      vec3 white = vec3(1.0, 1.0, 1.0);
      float centerFactor = smoothstep(6.0, 0.0, vDistance);
      vec3 mixedColor = mix(blue, white, centerFactor);
      float brightness = 1.6 + centerFactor * 0.3;
      gl_FragColor = vec4(mixedColor * brightness, 1.0);
    }
  `,
  transparent: true,
  depthWrite: false
});

const asteroidParticleSystem = new THREE.Points(asteroidGeometry, asteroidMaterial);
scene.add(asteroidParticleSystem);

// 加载星空背景
const textureLoader = new THREE.TextureLoader();
textureLoader.load('/stars.png', function(texture) {
  texture.minFilter = THREE.LinearFilter;
  scene.background = texture;
  animate(); // 背景图加载完成后开始动画
}, undefined, function(err) {
  console.error('❌ 背景图加载失败:', err);
  animate(); // 即使失败也尝试启动动画
});

// 动画循环
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const time = clock.getElapsedTime();

  // 更新星环动画
  asteroidMaterial.uniforms.uTime.value = time;

  // 粒子缓慢旋转（形成“星盘”动态效果）
  particleSystem.rotation.z += 0.002;
  asteroidParticleSystem.rotation.z += 0.001;

  // 控制器更新
  controls.update();

  // 后处理渲染
  composer.render();
}

// 创建 AudioListener 并绑定到相机
const listener = new THREE.AudioListener();
camera.add(listener);

// 创建背景音乐对象
const backgroundMusic = new THREE.Audio(listener);
let hasUserInteracted = false;

// 加载音频
const audioLoader = new THREE.AudioLoader();
audioLoader.load('/stars.mp3', function(buffer) {
  backgroundMusic.setBuffer(buffer);
  backgroundMusic.setLoop(true);
  backgroundMusic.setVolume(0); // 初始为静音
  backgroundMusic.play();        // 自动播放（在静音状态下）
}, undefined, function(err) {
  console.error('❌ 音频加载失败:', err);
});

// 监听用户首次交互事件（点击、触摸等）
window.addEventListener('click', handleFirstInteraction, { once: true });
window.addEventListener('touchstart', handleFirstInteraction, { once: true });

function handleFirstInteraction() {
  if (!hasUserInteracted && backgroundMusic && backgroundMusic.buffer) {
    backgroundMusic.setVolume(0.5); // 设置正常音量
    hasUserInteracted = true;
  }
}

// 自适应窗口
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});
