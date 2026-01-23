import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// 导入我们的三个子模块
import { createParticles, updateParticles, updateMorphTarget } from './particles.js';
import { createBagua, resizeBagua } from './bagua.js';
import { initText } from './text.js';
import { initGyro, updateGyro } from './gyro.js';
import { loadModelPoints } from './modelLoader.js';
import { initInteraction, updateInteraction, onResize } from './interaction.js';

// --- 1. 基础场景设置 (参考 index.html) ---
const scene = new THREE.Scene();
const bgColorLight = new THREE.Color(0xd1d1d1); // 浅灰 (黑粒子背景)
const bgColorDark = new THREE.Color(0x777777);  // 中灰 (白粒子背景)
scene.background = bgColorLight.clone();
// Fog 也会随背景变色，在 animate 中更新
scene.fog = new THREE.FogExp2(0xd1d1d1, 0.01);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);

// 响应式相机位置调整函数
function updateCameraPosition() {
    const aspect = window.innerWidth / window.innerHeight;
    // 如果是竖屏（手机），拉远相机以完整显示内容
    const baseDistance = 4.5;
    camera.position.z = aspect < 1 ? baseDistance * 1.8 : baseDistance;

    // 同时调整八卦图的大小
    resizeBagua(aspect);

    // 通知交互模块重置缩放状态
    onResize();
}
updateCameraPosition(); // 初始化调用

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.03;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.15;
// 禁用平移，固定中心
controls.enablePan = false;
// 禁用相机旋转，改为单独控制八卦旋转
controls.enableRotate = false;
// 默认禁用原生缩放（使用下方自定义滚轮逻辑），但在移动端 Touch 时开启
controls.enableZoom = false;

// --- 2. 加载各个模块 ---

// A. 加载水墨粒子 (来自 index.html)
const particleSystem = createParticles();
scene.add(particleSystem);

// 加载模型数据并注入粒子系统
// 移动端优化：屏幕宽度小于 768px 时，减少粒子数量
const isMobile = window.innerWidth < 768;
const particleCount = isMobile ? 150000 : 400000;

loadModelPoints('./model/上古神剑.glb', particleCount)
    .then(points => {
        console.log("Model loaded, updating particles...");
        updateMorphTarget(points);
    })
    .catch(err => {
        console.error("Failed to load model:", err);
    });


// B. 加载八卦背景 (来自 BW.html)
const baguaSystem = createBagua();
camera.add(baguaSystem); // <--- 关键：加到相机上！
scene.add(camera);       // <--- 关键：把相机加到场景里（否则相机的子元素可能不渲染）

// C. 启动文字系统
initText();

// D. 启动陀螺仪 (视差效果)
initGyro(particleSystem, baguaSystem);

// E. 初始化交互逻辑 (NEW)
initInteraction(scene, camera, renderer, controls, baguaSystem);

// --- 3. 动画循环 ---
const clock = new THREE.Clock();

function animate() {
    const time = clock.getElapsedTime();

    // 更新粒子 Shader 时间
    updateParticles(time);

    // 更新交互逻辑 (变形、旋转、缩放)
    updateInteraction(time);

    // 更新陀螺仪视差
    updateGyro();

    // --- 背景色呼吸逻辑 ---
    const slowCycle = Math.sin(time * 0.15) * 0.5 + 0.5;
    const bgLerpFactor = 1 - slowCycle;

    scene.background.lerpColors(bgColorLight, bgColorDark, bgLerpFactor);
    scene.fog.color.copy(scene.background);

    // --- 文字颜色同步 ---
    const textEl = document.getElementById('dynamic-text');
    if (textEl) {
        const startC = 51;
        const endC = 255;
        const currentC = Math.floor(startC + (endC - startC) * bgLerpFactor);
        textEl.style.color = `rgb(${currentC}, ${currentC}, ${currentC})`;
    }

    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

animate();

// 窗口自适应
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);

    updateCameraPosition();
});