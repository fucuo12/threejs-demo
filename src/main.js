import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// 场景初始化
const scene = new THREE.Scene();

// 相机设置
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 10;

// 渲染器设置
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// 后处理：创建 EffectComposer
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// Bloom 效果配置
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.5, // strength
  0.4, // radius
  0.9  // threshold
);
composer.addPass(bloomPass);

// 轨道控制器
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
  let hue;
  if (Math.random() < 0.5) {
    hue = (270 + Math.random() * 30) / 360;
  } else {
    hue = (30 + Math.random() * 30) / 360;
  }
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
  const minRadius = 2.8;
  const radialRange = 6;
  let rFactor = Math.random();
  rFactor = Math.pow(rFactor, 2);
  const radius = minRadius + rFactor * radialRange;
  const thickness = 1.2;
  let t = Math.random();
  t = Math.pow(t, 2);
  const zSign = Math.random() < 0.5 ? -1 : 1;
  const height = zSign * t * thickness;
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;
  const z = height;
  asteroidPositions[i * 3] = x;
  asteroidPositions[i * 3 + 1] = y;
  asteroidPositions[i * 3 + 2] = z;
  asteroidSizes[i] = (0.3 + Math.random() * 0.2) * 10;
  let hue;
  if (Math.random() < 0.5) {
    hue = (270 + Math.random() * 30) / 360;
  } else {
    hue = (30 + Math.random() * 30) / 360;
  }
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
      float totalFactor = centerFactor;
      vec3 mixedColor = mix(blue, white, totalFactor);

      float brightness = 1.6 + totalFactor * 0.3;
      gl_FragColor = vec4(mixedColor * brightness, 1.0);
    }
  `,
  transparent: true,
  depthWrite: false
});

const asteroidParticleSystem = new THREE.Points(asteroidGeometry, asteroidMaterial);
scene.add(asteroidParticleSystem);

// 加载星空背景图
const textureLoader = new THREE.TextureLoader();
textureLoader.load('/stars.png', function(texture) {
  texture.minFilter = THREE.LinearFilter;
  scene.background = texture;
  animate();
});

// 动画循环
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const time = clock.getElapsedTime();
  asteroidMaterial.uniforms.uTime.value = time;
  particleSystem.rotation.z += 0.002;
  asteroidParticleSystem.rotation.z += 0.001;
  controls.update();
  composer.render(); // 使用后处理渲染
}

// 音频部分
const listener = new THREE.AudioListener();
camera.add(listener);

const backgroundMusic = new THREE.Audio(listener);
let hasUserInteracted = false;

function handleFirstInteraction() {
  if (!hasUserInteracted) {
    const audioLoader = new THREE.AudioLoader();
    audioLoader.load('/stars.mp3', function(buffer) {
      backgroundMusic.setBuffer(buffer);
      backgroundMusic.setLoop(true);
      backgroundMusic.setVolume(0.5); // 设置正常音量
      backgroundMusic.play();         // 开始播放
      hasUserInteracted = true;
      console.log('🎵 背景音乐已开始播放');
    }, undefined, function(error) {
      console.error('❌ 音频加载失败:', error);
    });

    // 移除监听器防止重复触发
    window.removeEventListener('click', handleFirstInteraction);
    window.removeEventListener('touchstart', handleFirstInteraction);
  }
}

window.addEventListener('click', handleFirstInteraction, { once: true });
window.addEventListener('touchstart', handleFirstInteraction, { once: true });

// 响应式窗口变化
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});