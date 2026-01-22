import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// 导入我们的三个子模块
import { createParticles, updateParticles } from './particles.js';
import { createBagua, updateBagua, resizeBagua } from './bagua.js';
import { initText } from './text.js';
import { initGyro, updateGyro } from './gyro.js';

// --- 1. 基础场景设置 (参考 index.html) ---
const scene = new THREE.Scene();
const bgColor = 0xd1d1d1; // 浅灰背景
scene.background = new THREE.Color(bgColor);
scene.fog = new THREE.FogExp2(bgColor, 0.01); // 浅色雾气

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
// 默认禁用原生缩放（使用下方自定义滚轮逻辑），但在移动端 Touch 时开启
controls.enableZoom = false;

// 移动端交互优化：触屏开始时开启原生缩放（支持 Pinch），鼠标操作时关闭（避免冲突）
renderer.domElement.addEventListener('touchstart', () => {
    controls.enableZoom = true;
}, { passive: true });

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
    updateParticles(time);

    // 更新八卦旋转
    updateBagua(time);

    // 更新陀螺仪视差
    updateGyro();

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