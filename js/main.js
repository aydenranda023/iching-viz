import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// 导入我们的三个子模块
import { createParticles, updateParticles, updateMorphTarget, setMorphFactor } from './particles.js';
import { createBagua, updateBagua, resizeBagua } from './bagua.js';
import { initText } from './text.js';
import { initGyro, updateGyro } from './gyro.js';
import { loadModelPoints } from './modelLoader.js';

// --- 1. 基础场景设置 (参考 index.html) ---
const scene = new THREE.Scene();
const bgColorLight = new THREE.Color(0xd1d1d1); // 浅灰 (黑粒子背景)
const bgColorDark = new THREE.Color(0x777777);  // 中灰 (白粒子背景) - 从 0x333333 提亮，减淡约 40%
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
// 禁用平移，固定中心
controls.enablePan = false;
// 禁用相机旋转，改为单独控制八卦旋转
controls.enableRotate = false;
// 默认禁用原生缩放（使用下方自定义滚轮逻辑），但在移动端 Touch 时开启
controls.enableZoom = false;
// 缩放目标距离 (用于实现丝滑的粘滞感)
let targetZoomDist = 0;
// 初始化标记
let isZoomInit = false;

// --- 自定义交互逻辑 ---
// 1. 移动端/桌面端 通用拖拽旋转八卦
let isDragging = false;
let previousMsgX = 0;
let baguaVelocity = 0; // 旋转速度 (惯性)
let lastPointerTime = 0;
let clickStartX = 0;
let clickStartY = 0;

// Raycaster for particle interaction
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let isMorphing = false; // 目标状态：true = 模型, false = 球体
let currentMorphFactor = 0.0; // 当前变形进度

// 创建不可见的交互球体
const interactionGeometry = new THREE.SphereGeometry(2.5, 32, 32);
const interactionMaterial = new THREE.MeshBasicMaterial({
    visible: false, // 不可见
    side: THREE.DoubleSide
});
const interactionSphere = new THREE.Mesh(interactionGeometry, interactionMaterial);
scene.add(interactionSphere);

function onPointerDown(x, y) {
    isDragging = true;
    previousMsgX = x;
    baguaVelocity = 0; // 按下时停止惯性
    lastPointerTime = performance.now();

    // 记录点击起始位置
    clickStartX = x;
    clickStartY = y;
}

function checkClick(x, y) {
    // 检测点击粒子
    // 将鼠标坐标归一化为 -1 到 +1
    mouse.x = (x / window.innerWidth) * 2 - 1;
    mouse.y = -(y / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    // 检测与交互球体的相交
    const intersects = raycaster.intersectObject(interactionSphere);

    if (intersects.length > 0) {
        // 点击到了中心区域，切换变形状态
        isMorphing = !isMorphing;
        console.log("Interaction sphere clicked. Morphing:", isMorphing);
    }
}

function onPointerMove(x) {
    if (!isDragging) return;
    const deltaX = x - previousMsgX;
    previousMsgX = x;

    // 旋转八卦
    if (baguaSystem) {
        const rotateDelta = deltaX * 0.012; // 0.005 -> 0.012 提高灵敏度
        baguaSystem.rotation.z += rotateDelta;
        // 惯性
        baguaVelocity = rotateDelta;
    }
}

function onPointerUp(x, y) {
    isDragging = false;

    // 计算移动距离
    const dx = x - clickStartX;
    const dy = y - clickStartY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // 如果移动距离小于 30px，则视为点击
    if (distance < 30) {
        checkClick(x, y);
    }
}

// --- Event Listeners ---

renderer.domElement.addEventListener('mousedown', (e) => {
    onPointerDown(e.clientX, e.clientY);
});

renderer.domElement.addEventListener('mousemove', (e) => {
    onPointerMove(e.clientX);
});

renderer.domElement.addEventListener('mouseup', (e) => {
    onPointerUp(e.clientX, e.clientY);
});

renderer.domElement.addEventListener('touchstart', (e) => {
    controls.enableZoom = true; // 允许缩放
    if (e.touches.length === 1) {
        onPointerDown(e.touches[0].clientX, e.touches[0].clientY);
    }
}, { passive: true });

renderer.domElement.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1) {
        onPointerMove(e.touches[0].clientX);
    }
}, { passive: true });

renderer.domElement.addEventListener('touchend', (e) => {
    if (e.changedTouches.length > 0) {
        onPointerUp(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    } else {
        isDragging = false;
    }
});

// 自定义滚轮缩放逻辑
const zoomStep = 1.1; // 每次缩放 10%
renderer.domElement.addEventListener('wheel', (event) => {
    event.preventDefault(); // 阻止默认滚动行为

    // 初始化 target (防止从未初始化)
    if (!isZoomInit) {
        targetZoomDist = camera.position.distanceTo(controls.target);
        isZoomInit = true;
    }

    const direction = Math.sign(event.deltaY);

    if (direction > 0) {
        // 滚轮向下，缩小（拉远）
        targetZoomDist *= zoomStep;
    } else {
        // 滚轮向上，放大（拉近）
        targetZoomDist /= zoomStep;
    }

    // 限制距离
    targetZoomDist = Math.max(controls.minDistance, Math.min(targetZoomDist, controls.maxDistance));
}, { passive: false });

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

// --- 3. 动画循环 ---
const clock = new THREE.Clock();

function animate() {
    const time = clock.getElapsedTime();

    // 更新粒子 Shader 时间
    updateParticles(time);

    // 处理变形动画
    const targetFactor = isMorphing ? 1.0 : 0.0;
    // 平滑插值
    if (Math.abs(currentMorphFactor - targetFactor) > 0.001) {
        currentMorphFactor += (targetFactor - currentMorphFactor) * 0.02; // 调整速度
        setMorphFactor(currentMorphFactor);
    }

    // 更新八卦旋转
    if (baguaSystem) {
        if (!isDragging) {
            baguaSystem.rotation.z += baguaVelocity;
            // 摩擦力衰减
            baguaVelocity *= 0.96;

            if (Math.abs(baguaVelocity) < 0.00001) {
                baguaVelocity = 0;
                const wobble = Math.sin(time * 0.5) * 0.001;
                baguaSystem.rotation.z += wobble;
            }
        }
    }

    // --- 滞后缩放 (Elastic Scaling) ---
    const baseDistance = 4.5;
    if (typeof window.currentSmoothedScale === 'undefined') window.currentSmoothedScale = 1.0;

    const currentDist = camera.position.distanceTo(controls.target);
    const targetScaleMultiplier = baseDistance / Math.max(0.1, currentDist);

    window.currentSmoothedScale += (targetScaleMultiplier - window.currentSmoothedScale) * 0.008;

    if (baguaSystem) {
        const baseS = baguaSystem.userData.baseScale || 1.5;
        const finalS = baseS * window.currentSmoothedScale;
        baguaSystem.scale.setScalar(finalS);
    }

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

    // --- 相机缩放平滑 (Viscosity) ---
    if (isZoomInit || Math.abs(targetZoomDist) > 0.001) {
        if (!isZoomInit && targetZoomDist === 0) {
            targetZoomDist = camera.position.distanceTo(controls.target);
            isZoomInit = true;
        }

        const currentDist = camera.position.distanceTo(controls.target);
        const lerpFactor = 0.08;

        if (Math.abs(currentDist - targetZoomDist) > 0.01) {
            const newDist = currentDist + (targetZoomDist - currentDist) * lerpFactor;
            const offset = new THREE.Vector3().copy(camera.position).sub(controls.target);
            offset.setLength(newDist);
            camera.position.copy(controls.target).add(offset);
        }
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
    targetZoomDist = camera.position.distanceTo(controls.target);
    isZoomInit = true;
});