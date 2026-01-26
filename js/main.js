import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// 导入我们的三个子模块
import { createParticles, updateParticles, updateMorphTarget } from './particles.js';
import { createBagua, resizeBagua, updateBagua } from './bagua.js';
import { initText } from './text.js';
import { initGyro, updateGyro } from './gyro.js';
import { loadModelPoints } from './modelLoader.js';
import { initInteraction, updateInteraction, onResize } from './interaction.js';
import { initElasticInteraction, updateElasticInteraction } from './elastic_interaction.js';
import { initAudio } from './audio.js';

initAudio();

// --- 1. 基础场景设置 (参考 index.html) ---
const scene = new THREE.Scene();
const bgColorLight = new THREE.Color(0xD1D1D1); // 浅灰 (黑粒子背景)
const bgColorDark = new THREE.Color(0x777777);  // 中灰 (白粒子背景)
scene.background = bgColorLight.clone();
// Fog 也会随背景变色，在 animate 中更新
// 使用 Linear Fog 实现 40-50 距离的渐隐效果
scene.fog = new THREE.Fog(0xd1d1d1, 13, 50);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);

// 响应式相机位置调整函数
function updateCameraPosition() {
    const aspect = window.innerWidth / window.innerHeight;
    // 如果是竖屏（手机），拉远相机以完整显示内容
    const baseDistance = 4.5;
    camera.position.z = aspect < 1 ? baseDistance * 2 : baseDistance;

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
controls.dampingFactor = 0.025; // 增加惯性阻尼 (数值越小，惯性越大)
controls.autoRotate = true;
controls.autoRotateSpeed = 0.15;

// --- 交互配置 ---
// 1. 左键/单指：自定义逻辑 (旋转八卦)，OrbitControls 不处理
// 2. 中键/双指：旋转视角 + 缩放 (OrbitControls 接管)
controls.enablePan = false;
controls.enableRotate = true; // 开启旋转
controls.enableZoom = true;   // 开启缩放

// 设置相机距离限制
controls.minDistance = 0.1;
controls.maxDistance = 50;

// 鼠标按键映射
controls.mouseButtons = {
    LEFT: null,               // 左键留给自定义八卦旋转
    MIDDLE: THREE.MOUSE.ROTATE, // 中键旋转视角
    RIGHT: null
};

// 触摸手势映射
controls.touches = {
    ONE: null,                // 单指留给自定义八卦旋转
    TWO: THREE.TOUCH.DOLLY_ROTATE // 双指缩放 + 旋转
};

// --- 2. 加载各个模块 ---

// A. 加载水墨粒子 (来自 index.html)
const particleSystem = createParticles();
scene.add(particleSystem);

// 移动端优化：屏幕宽度小于 768px 时，减少粒子数量
const isMobile = window.innerWidth < 768;
const particleCount = isMobile ? 150000 : 400000;

// 模型列表
const modelFiles = [
    './model/tai_chi.glb',
    './model/上古神剑.glb',
    './model/黄金鸭子.glb'
];
const modelCache = {};

// 预加载所有模型
function preloadModels() {
    const promises = modelFiles.map(url => {
        return loadModelPoints(url, particleCount)
            .then(points => {
                modelCache[url] = points;
                console.log(`Preloaded: ${url}`);
            })
            .catch(err => console.error(`Failed to load ${url}:`, err));
    });
    return Promise.all(promises);
}

// 获取随机模型数据
function getRandomModelPoints() {
    const keys = Object.keys(modelCache);
    if (keys.length === 0) return null;
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    console.log(`Switching to model: ${randomKey}`);
    return modelCache[randomKey];
}

// 启动预加载 (不阻塞后续逻辑，但第一次点击前最好加载完)
preloadModels().then(() => {
    console.log("All models preloaded.");
});


// B. 加载八卦背景 (来自 BW.html)
const baguaSystem = createBagua();
camera.add(baguaSystem); // <--- 关键：加到相机上！
scene.add(camera);       // <--- 关键：把相机加到场景里（否则相机的子元素可能不渲染）

// --- 3. 动画循环 ---
const clock = new THREE.Clock();

// C. 启动文字系统
initText(() => {
    // 根据当前时间计算背景亮度状态
    // 逻辑需与 animate 中的背景色呼吸保持一致
    const time = clock.getElapsedTime();
    const slowCycle = Math.sin(time * 0.15) * 0.5 + 0.5;
    // slowCycle 接近 1 (Black Cloud) -> Light BG -> Text Dark
    // slowCycle 接近 0 (White Cloud) -> Dark BG -> Text Light
    return slowCycle > 0.5 ? '#333' : '#fff';
});

// D. 启动陀螺仪 (视差效果)
initGyro(particleSystem, baguaSystem);

// E. 初始化交互逻辑 (NEW)
// 传入 onMorphStart 回调：每次开始变形时，随机切换目标模型
initInteraction(scene, camera, renderer, controls, baguaSystem, () => {
    const points = getRandomModelPoints();
    if (points) {
        updateMorphTarget(points);
    }
});

// F. 初始化弹性交互 (NEW)
initElasticInteraction(scene, camera, renderer, controls, particleSystem);

function animate() {
    const time = clock.getElapsedTime();

    // 更新粒子 Shader 时间
    updateParticles(time);

    // 更新交互逻辑 (变形、旋转、缩放)
    updateInteraction(time);
    updateElasticInteraction();

    // 更新八卦盘动画 (NEW)
    updateBagua(time);

    // 更新陀螺仪视差
    updateGyro();

    // --- 背景色呼吸逻辑 ---
    const slowCycle = Math.sin(time * 0.15) * 0.5 + 0.5;
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

    updateCameraPosition();
});