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
import { initInputUI, updateInputUI } from './inputUI.js';

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
updateCameraPosition(true);

// --- 2. 加载模块 ---
const particleSystem = createParticles();
scene.add(particleSystem);

const isMobileDevice = window.innerWidth < 768;
const particleCount = isMobileDevice ? 150000 : 400000;

const modelFiles = [
    './model/tai_chi.glb',
    './model/上古神剑.glb',
    './model/黄金鸭子.glb'
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

const clock = new THREE.Clock();

initText(() => {
    const time = clock.getElapsedTime();
    const slowCycle = Math.sin(time * 0.15) * 0.5 + 0.5;
    return slowCycle > 0.5 ? '#333' : '#fff';
});

initGyro(particleSystem, baguaSystem);

initInteraction(scene, camera, renderer, controls, baguaSystem, () => {
    const points = getRandomModelPoints();
    if (points) updateMorphTarget(points);
});

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
window.addEventListener('resize', () => {
    if (Math.abs(window.innerWidth - initialWindowWidth) > 100) {
        initialWindowWidth = window.innerWidth;
        initialWindowHeight = window.innerHeight;
        isKeyboardOpen = false;
        document.body.classList.remove('keyboard-active');
    }
    updateCameraPosition(false);
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

    window.addEventListener('resize', () => {
        if (!document.body.classList.contains('keyboard-active')) {
            setTimeout(() => {
                baseHeight = viewport.height;
            }, 100);
        }
    });
}