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
createParticleSystem(scene);

// 加载星空背景图（✅ 已修改为相对路径）
const textureLoader = new THREE.TextureLoader();
const starsTexturePath = new URL('./stars.png', import.meta.url).href;
textureLoader.load(starsTexturePath, function(texture) {
  texture.minFilter = THREE.LinearFilter;
  scene.background = texture;
  animate();
}, undefined, function(err) {
  console.error('❌ 纹理加载失败:', err);
});

// 动画循环
const clock = new THREE.Clock();
let hasUserInteracted = false;
let backgroundMusic = null;

function animate() {
  requestAnimationFrame(animate);
  const time = clock.getElapsedTime();
  updateParticles(time);
  controls.update();
  composer.render(); // 使用后处理渲染
}

// 音频部分（✅ 已修改为相对路径）
function handleFirstInteraction(event) {
  if (hasUserInteracted) return;

  // 创建新的 AudioListener 和 Audio 对象
  const listener = new THREE.AudioListener();
  camera.add(listener);

  const context = listener.context;

  // 在用户交互内创建和恢复 AudioContext
  context.resume().then(() => {
    console.log('🎵 [Mobile] AudioContext 已恢复');

    const audioLoader = new THREE.AudioLoader();
    const starsAudioPath = new URL('./stars.mp3', import.meta.url).href;

    backgroundMusic = new THREE.Audio(listener);
    audioLoader.load(
      starsAudioPath,
      function(buffer) {
        backgroundMusic.setBuffer(buffer);
        backgroundMusic.setLoop(true);
        backgroundMusic.setVolume(0.5);
        backgroundMusic.play();
        hasUserInteracted = true;
        console.log('🔊 背景音乐已开始播放');
      },
      undefined,
      function(error) {
        console.error('❌ 音频加载失败:', error);
      }
    );
  });

  // 移除监听器
  window.removeEventListener('click', handleFirstInteraction);
  window.removeEventListener('touchstart', handleFirstInteraction);
}

// 同时监听 click 和 touchstart（移动设备）
window.addEventListener('click', handleFirstInteraction, { once: false });
window.addEventListener('touchstart', handleFirstInteraction, { once: false });

// 响应式窗口变化
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

/**
 * 粒子系统相关函数
 */
function createParticleSystem(scene) {
  // 核心粒子系统
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
}

/**
 * ✅ 可选：添加粒子动画效果
 */
function updateParticles(time) {
  const positions = this.scene.children[1]?.geometry.attributes.position.array;
  if (!positions) return;

  for (let i = 0; i < positions.length; i += 3) {
    positions[i + 2] += Math.sin(time + i) * 0.001; // Z轴轻微波动
  }
  this.scene.children[1].geometry.attributes.position.needsUpdate = true;
}
