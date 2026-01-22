import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// 导入我们的三个子模块
import { createParticles, updateParticles } from './particles.js';
import { createBagua, updateBagua, resizeBagua } from './bagua.js';
import { initText } from './text.js';
import { initGyro, updateGyro } from './gyro.js';

// --- 1. 基础场景设置 (参考 index.html) ---
const scene = new THREE.Scene();
const bgColorLight = new THREE.Color(0xd1d1d1); // 浅灰 (黑粒子背景)
const bgColorDark = new THREE.Color(0x333333);  // 深灰 (白粒子背景) - 稍微深一点增强对比
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
controls.autoRotateSpeed = 0.15;
// 禁用平移，固定中心
controls.enablePan = false;
// 禁用相机旋转，改为单独控制八卦旋转
controls.enableRotate = false;
// 默认禁用原生缩放（使用下方自定义滚轮逻辑），但在移动端 Touch 时开启
controls.enableZoom = false;

// --- 自定义交互逻辑 ---
// 1. 移动端/桌面端 通用拖拽旋转八卦
let isDragging = false;
let previousMsgX = 0;

function onPointerDown(x) {
    isDragging = true;
    previousMsgX = x;
}

function onPointerMove(x) {
    if (!isDragging) return;
    const deltaX = x - previousMsgX;
    previousMsgX = x;

    // 旋转八卦 (反向使其符合直觉: 向左滑 -> 逆时针?)
    // 试一下正向
    if (baguaSystem) {
        baguaSystem.rotation.z += deltaX * 0.005;
    }
}

function onPointerUp() {
    isDragging = false;
}

// Mouse Events
renderer.domElement.addEventListener('mousedown', (e) => onPointerDown(e.clientX));
renderer.domElement.addEventListener('mousemove', (e) => onPointerMove(e.clientX));
renderer.domElement.addEventListener('mouseup', onPointerUp);

// Touch Events
renderer.domElement.addEventListener('touchstart', (e) => {
    controls.enableZoom = true; // 允许缩放
    if (e.touches.length === 1) {
        onPointerDown(e.touches[0].clientX);
    }
}, { passive: true });

renderer.domElement.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1) {
        onPointerMove(e.touches[0].clientX);
    }
}, { passive: true });

renderer.domElement.addEventListener('touchend', () => {
    onPointerUp();
    // 只有在没有手指时才需要考虑 status, 这里 OrbitControls 自己会处理 zoom 结束
});

// 自定义滚轮缩放逻辑
const zoomStep = 1.1; // 每次缩放 10%
renderer.domElement.addEventListener('wheel', (event) => {
    event.preventDefault(); // 阻止默认滚动行为

    // 获取方向，忽略 delta 的大小（解决远程桌面数据乱跳问题）
    const direction = Math.sign(event.deltaY);

    // 计算相机到目标的向量
    const offset = new THREE.Vector3().copy(camera.position).sub(controls.target);
    let distance = offset.length();

    if (direction > 0) {
        // 滚轮向下，缩小（拉远）
        distance *= zoomStep;
    } else {
        // 滚轮向上，放大（拉近）
        distance /= zoomStep;
    }

    // 限制距离 (参考 OrbitControls 默认 min/max)
    distance = Math.max(controls.minDistance, Math.min(distance, controls.maxDistance));

    // 更新相机位置
    offset.setLength(distance);
    camera.position.copy(controls.target).add(offset);

    // 手动触发更新，确保平滑
    // controls.update(); // 动画循环里有调 update，这里其实只需要改位置
}, { passive: false });

// --- 2. 加载各个模块 ---

// A. 加载水墨粒子 (来自 index.html)
const particleSystem = createParticles();
scene.add(particleSystem);

// B. 加载八卦背景 (来自 BW.html)
const baguaSystem = createBagua();
camera.add(baguaSystem); // <--- 关键：加到相机上！
scene.add(camera);       // <--- 关键：把相机加到场景里（否则相机的子元素可能不渲染）

// C. 启动文字系统
initText();

// D. 启动陀螺仪 (视差效果)
initGyro(particleSystem, baguaSystem);

// --- 3. 动画循环 ---
const clock = new THREE.Clock();

function animate() {
    const time = clock.getElapsedTime();

    // 更新粒子 Shader 时间
    // 更新粒子 Shader 时间
    updateParticles(time);

    // 更新八卦旋转 (保留自动旋转作为基底，叠加用户旋转?)
    // 之前的 updateBagua 会覆盖 rotation.z。
    // 我们在这里直接操作 baguaSystem，不再调用 updateBagua
    if (baguaSystem) {
        // 自动微转 (很慢)
        baguaSystem.rotation.z -= 0.0005;
        // 呼吸摇摆
        const wobble = Math.sin(time * 0.5) * 0.001;
        baguaSystem.rotation.z += wobble;
    }

    // 更新陀螺仪视差
    updateGyro();

    // --- 背景色呼吸逻辑 ---
    // particles.js: slowCycle = sin(uTime * 0.15) * 0.5 + 0.5;
    // 0 (White Cloud) -> Dark BG
    // 1 (Black Cloud) -> Light BG
    const slowCycle = Math.sin(time * 0.15) * 0.5 + 0.5;

    // 插值 factor: 当 slowCycle 小时，BG Dark (factor -> 1). 当 slowCycle 大时，BG Light (factor -> 0)
    // 也就是 factor = 1 - slowCycle
    const bgLerpFactor = 1 - slowCycle;

    scene.background.lerpColors(bgColorLight, bgColorDark, bgLerpFactor);
    scene.fog.color.copy(scene.background);

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

    // 窗口大小改变时，也重新评估相机距离（例如手机横竖屏切换）
    updateCameraPosition();
});