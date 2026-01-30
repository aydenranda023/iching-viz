import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// 导入我们的三个子模块
import { createParticles, updateParticles, updateMorphTarget } from './particles.js';
import { createBagua, resizeBagua, updateBagua } from './bagua.js';
import { initGyro, updateGyro } from './gyro.js';
import { loadModelPoints } from './modelLoader.js';
import { initInteraction, updateInteraction, onResize } from './interaction.js';
import { initElasticInteraction, updateElasticInteraction } from './elastic_interaction.js';
import { initAudio } from './audio.js';
import { initInputUI, updateInputUI } from './inputUI.js';
import { askOracle } from './ai.js';
import { getInputContent, resetInputUI } from './inputUI.js'; // 导入新接口
import { appendAIResponse, finishAIResponse, showLoading } from './text.js'; // 导入新接口

initAudio();

// --- 1. 基础场景设置 ---
const scene = new THREE.Scene();
const bgColorLight = new THREE.Color(0xD1D1D1);
const bgColorDark = new THREE.Color(0x777777);
scene.background = bgColorLight.clone();
scene.fog = new THREE.Fog(0xd1d1d1, 13, 50);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.025;
controls.zoomSpeed = 1.5; // 设置手机端缩放速率 (默认 1.0)
controls.autoRotate = true;
controls.autoRotateSpeed = 0.15;

controls.enablePan = false;
controls.enableRotate = true;
controls.enableZoom = true;
controls.minDistance = 0.1;
controls.maxDistance = 50;

controls.mouseButtons = {
    LEFT: null,
    MIDDLE: THREE.MOUSE.ROTATE,
    RIGHT: null
};

controls.touches = {
    ONE: null,
    TWO: THREE.TOUCH.DOLLY_ROTATE
};

// 响应式变量
let initialWindowWidth = window.innerWidth;
let initialWindowHeight = window.innerHeight;
let isKeyboardOpen = false;

function updateCameraPosition(isInit = false) {
    const currentWidth = window.innerWidth;
    const currentHeight = window.innerHeight;

    const isMobile = currentWidth < 768;
    const widthUnchanged = Math.abs(currentWidth - initialWindowWidth) < 50;
    const heightReduced = currentHeight < initialWindowHeight * 0.75;

    if (isMobile && widthUnchanged && heightReduced) {
        if (!isKeyboardOpen) isKeyboardOpen = true;
    } else if (isKeyboardOpen && (!heightReduced || !widthUnchanged)) {
        isKeyboardOpen = false;
    }

    const effectiveWidth = currentWidth;
    const effectiveHeight = currentHeight;
    const effectiveAspect = effectiveWidth / effectiveHeight;

    const baseDistance = 4.5;
    if (isInit) {
        camera.position.z = effectiveAspect < 1 ? baseDistance * 2 : baseDistance;
    }

    resizeBagua(effectiveAspect);
    onResize();

    renderer.setSize(currentWidth, currentHeight);
    camera.aspect = effectiveAspect;
    camera.updateProjectionMatrix();
}


// --- 2. 加载模块 ---
const particleSystem = createParticles();
scene.add(particleSystem);

const isMobileDevice = window.innerWidth < 768;
const particleCount = isMobileDevice ? 150000 : 400000;

const modelFiles = [
    './model/tai_chi.glb',
    './model/上古神剑.glb',
    //'./model/黄金鸭子.glb',
    './model/户型.glb'
];
const modelCache = {};

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

function getRandomModelPoints() {
    const keys = Object.keys(modelCache);
    if (keys.length === 0) return null;
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    return modelCache[randomKey];
}

preloadModels().then(() => {
    console.log("All models preloaded.");
});

const baguaSystem = createBagua();
camera.add(baguaSystem);
scene.add(camera);

updateCameraPosition(true);

const clock = new THREE.Clock();

initText(() => {
    const time = clock.getElapsedTime();
    const slowCycle = Math.sin(time * 0.15) * 0.5 + 0.5;
    return slowCycle > 0.5 ? '#333' : '#fff';
});

initGyro(particleSystem, baguaSystem);

initInteraction(scene, camera, renderer, controls, baguaSystem,
    // 1. 点击交互球的回调 (Morph)
    () => {
        const points = getRandomModelPoints();
        if (points) updateMorphTarget(points);
    },
    // 2. [新增] 八卦旋转一圈的回调 (提交 AI)
    async () => {
        // 获取输入框内容
        const content = getInputContent();

        // 只有当输入框有字时，才触发 AI 逻辑
        if (content && content.length > 0) {
            console.log("触发 AI 请求:", content);

            // 1. UI 状态更新
            resetInputUI(); // 清空并收起输入框
            showLoading();  // 显示"正在连接..."

            // 2. 发送请求 (流式)
            // 传入 onChunk 回调，将数据片传给 text.js 的缓冲器
            await askOracle(content, (chunk) => {
                appendAIResponse(chunk);
            });

            // 3. 结束通知
            // 当 askOracle await 结束时，说明流已关闭
            finishAIResponse();
        } else {
            console.log("转动了八卦，但没有输入内容，忽略。");
        }
    }
);

initElasticInteraction(scene, camera, renderer, controls, particleSystem);
initInputUI();

function animate() {
    const time = clock.getElapsedTime();
    updateParticles(time);
    updateInteraction(time);
    updateElasticInteraction();
    updateBagua(time);
    updateGyro();

    const cameraDist = camera.position.distanceTo(controls.target);
    updateInputUI(cameraDist);

    const slowCycle = Math.sin(time * 0.15) * 0.5 + 0.5;
    const bgLerpFactor = 1 - slowCycle;

    scene.background.lerpColors(bgColorLight, bgColorDark, bgLerpFactor);
    scene.fog.color.copy(scene.background);

    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

animate();

// --- 4. 事件监听 ---
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        // 只有当尺寸变化超过阈值（防抖动），或者单纯为了响应旋转后的最终尺寸
        // 这里主要逻辑是：旋转后宽高互换，通过延时确保获取到的是最终稳定的 innerWidth/Height
        if (Math.abs(window.innerWidth - initialWindowWidth) > 50 || Math.abs(window.innerHeight - initialWindowHeight) > 50) {
            initialWindowWidth = window.innerWidth;
            initialWindowHeight = window.innerHeight;
            isKeyboardOpen = false;
            document.body.classList.remove('keyboard-active');
        }
        updateCameraPosition(false);
    }, 500); // 500ms 防抖，等待旋转动画结束
});

if (window.visualViewport) {
    const viewport = window.visualViewport;
    let baseHeight = viewport.height;

    const onViewportResize = () => {
        const currentHeight = viewport.height;
        if (currentHeight < baseHeight * 0.85) {
            if (!document.body.classList.contains('keyboard-active')) {
                document.body.classList.add('keyboard-active');
                isKeyboardOpen = true;
            }
        } else if (currentHeight >= baseHeight * 0.95) {
            if (document.body.classList.contains('keyboard-active')) {
                document.body.classList.remove('keyboard-active');
                isKeyboardOpen = false;
                if (document.activeElement) document.activeElement.blur();
            }
        }
    };

    viewport.addEventListener('resize', onViewportResize);

    // Update base height on orientation change (window resize)
    let lastWidth = window.innerWidth;

    window.addEventListener('resize', () => {
        const currentWidth = window.innerWidth;

        // Only update baseHeight if:
        // 1. Width changed significantly (Orientation change)
        // 2. OR Viewport got LARGER (e.g. address bar hidden)
        // We IGNORE height decreases if width is constant (likely keyboard opening)
        if (Math.abs(currentWidth - lastWidth) > 50 || viewport.height > baseHeight) {
            // Delay slightly to ensure viewport is settled
            setTimeout(() => {
                baseHeight = viewport.height;
                lastWidth = currentWidth;
            }, 100);
        }
    });
}