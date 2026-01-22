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
// 1. 移动端/桌面端 通用拖拽旋转八卦
let isDragging = false;
let previousMsgX = 0;
let baguaVelocity = 0; // 旋转速度 (惯性)
let lastPointerTime = 0;

function onPointerDown(x) {
    isDragging = true;
    previousMsgX = x;
    baguaVelocity = 0; // 按下时停止惯性
    lastPointerTime = performance.now();
}

function onPointerMove(x) {
    if (!isDragging) return;
    const deltaX = x - previousMsgX;
    previousMsgX = x;

    // 旋转八卦 (反向使其符合直觉: 向左滑 -> 逆时针?)
    // 试一下正向
    if (baguaSystem) {
        const rotateDelta = deltaX * 0.012; // 0.005 -> 0.012 提高灵敏度
        baguaSystem.rotation.z += rotateDelta;

        // 计算瞬时速度 (简单移动平均或直接赋值)
        baguaVelocity = rotateDelta;
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

    // 注意：不再这里直接修改 camera.position，交给 animate 做平滑过渡
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
        // 如果正在拖拽，速度由 onPointerMove 控制
        // 如果松手 (惯性阶段)
        if (!isDragging) {
            baguaSystem.rotation.z += baguaVelocity;
            // 摩擦力衰减 (0.95 -> 0.99 极低摩擦，滑行很久)
            baguaVelocity *= 0.96;

            // 当速度极小时归零，避免无休止计算
            if (Math.abs(baguaVelocity) < 0.00001) {
                baguaVelocity = 0;

                // 静止时添加原本的微弱 wobble (呼吸感)
                // 注意：这需要在 velocity 归零后才生效，否则会冲突
                const wobble = Math.sin(time * 0.5) * 0.001;
                baguaSystem.rotation.z += wobble;
            }
        }
    }

    // --- 滞后缩放 (Elastic Scaling) ---
    // 目标: Camera Distance 变化时，Bagua Scale 随之变化，但有 5s 延迟
    // 初始距离 4.5
    const baseDistance = 4.5;
    if (typeof window.currentSmoothedScale === 'undefined') window.currentSmoothedScale = 1.0;

    // 计算当前相机距离
    const currentDist = camera.position.distanceTo(controls.target);

    // Scale Factor Logic: 
    // Camera is CLOSER (e.g. 2.25) -> We want Bagua to appear LARGER.
    // Since Bagua is in Camera space, it usually looks same size on screen.
    // To make it look larger (like world object), we increase scale.
    // factor = base / current.  4.5 / 2.25 = 2.0. Scale becomes 2.0x. Correct.
    const targetScaleMultiplier = baseDistance / Math.max(0.1, currentDist);

    // 平滑插值 (Damping)
    // 5秒延迟. 0.008 per frame (60fps) ~= 5s settle time logic
    window.currentSmoothedScale += (targetScaleMultiplier - window.currentSmoothedScale) * 0.008;

    if (baguaSystem) {
        // 读取 bagua.js 中保存的基础 scale (例如 1.5 或 0.8)
        const baseS = baguaSystem.userData.baseScale || 1.5;
        const finalS = baseS * window.currentSmoothedScale;
        baguaSystem.scale.setScalar(finalS);
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

    // --- 文字颜色同步 ---
    // bgLerpFactor: 0 (Light BG) -> 1 (Dark BG)
    // text color: Black -> White
    const textEl = document.getElementById('dynamic-text');
    if (textEl) {
        // 简单的 0-255 插值
        const val = Math.floor(bgLerpFactor * 255);
        // 背景越黑(1)，文字越白(255)。 背景越亮(0)，文字越黑(0)。
        // 错误：背景亮 (0) -> 文字黑 (0)。 背景黑 (1) -> 文字白 (255)
        // 也就是 val = bgLerpFactor * 255.
        // 但文字原本是 #333 (非纯黑) 和 #fff (纯白)。
        // 让我们稍微细腻一点：
        // Start: rgb(51, 51, 51) (Light BG)
        // End:   rgb(255, 255, 255) (Dark BG)
        const startC = 51;
        const endC = 255;
        const currentC = Math.floor(startC + (endC - startC) * bgLerpFactor);
        textEl.style.color = `rgb(${currentC}, ${currentC}, ${currentC})`;

        // 只有白色背景时需要阴影来看清? 或者一直保持阴影?
        // 原 CSS 有 text-shadow, 这里保持即可。
    }

    // --- 相机缩放平滑 (Viscosity) ---
    // 如果 targetZoomDist 已初始化，则进行 Lerp
    if (isZoomInit || Math.abs(targetZoomDist) > 0.001) {
        // 初始化检查 (处理第一次运行)
        if (!isZoomInit && targetZoomDist === 0) {
            targetZoomDist = camera.position.distanceTo(controls.target);
            isZoomInit = true;
        }

        const currentDist = camera.position.distanceTo(controls.target);
        // 粘滞系数: 0.05 (非常滑/慢) ~ 0.2 (快). 
        // 用户要求 "微小的拖延的延迟" -> 0.08 左右试试
        const lerpFactor = 0.08;

        if (Math.abs(currentDist - targetZoomDist) > 0.01) {
            const newDist = currentDist + (targetZoomDist - currentDist) * lerpFactor;

            // 更新相机位置 (保持方向)
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

    // 窗口大小改变时，也重新评估相机距离（例如手机横竖屏切换）
    updateCameraPosition();
    // 重置缩放目标，避免跳回旧位置
    targetZoomDist = camera.position.distanceTo(controls.target);
    isZoomInit = true;
});