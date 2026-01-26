import * as THREE from 'three';
import { setMorphFactor } from './particles.js';

// --- State Variables ---
let isDragging = false;
let previousMsgX = 0;
let baguaVelocity = 0;
let lastPointerTime = 0;
let clickStartX = 0;
let clickStartY = 0;
let isMultiTouch = false;

let isMorphing = false;
let currentMorphFactor = 0.0;

let targetZoomDist = 0;
let isZoomInit = false;

// --- References ---
let _scene, _camera, _renderer, _controls, _baguaSystem;
let _interactionSphere;
let _onMorphStart; // Callback for random model selection

// --- Raycaster ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// --- Initialization ---
export function initInteraction(scene, camera, renderer, controls, baguaSystem, onMorphStart) {
    _scene = scene;
    _camera = camera;
    _renderer = renderer;
    _controls = controls;
    _controls.enableZoom = false; // 禁用原生缩放
    _baguaSystem = baguaSystem;
    _onMorphStart = onMorphStart;

    // Create invisible interaction sphere
    const interactionGeometry = new THREE.SphereGeometry(3.0, 32, 32);
    const interactionMaterial = new THREE.MeshBasicMaterial({
        visible: false,
        side: THREE.DoubleSide
    });
    _interactionSphere = new THREE.Mesh(interactionGeometry, interactionMaterial);
    _scene.add(_interactionSphere);

    // Bind events
    const canvas = _renderer.domElement;
    // --- Double-fire prevention ---
    let lastTouchTime = 0;

    canvas.addEventListener('mousedown', (e) => {
        // Ignore emulated mouse events (within 500ms of a touch)
        if (performance.now() - lastTouchTime < 500) return;

        // Only allow Left Click (button 0) for custom interaction
        if (e.button === 0) {
            isMultiTouch = false; // Mouse is always single touch
            onPointerDown(e.clientX, e.clientY);
        }
    });
    canvas.addEventListener('mousemove', (e) => {
        if (performance.now() - lastTouchTime < 500) return;
        onPointerMove(e.clientX);
    });
    canvas.addEventListener('mouseup', (e) => {
        if (performance.now() - lastTouchTime < 500) return;
        // Only allow Left Click (button 0) to trigger click logic
        if (e.button === 0) {
            onPointerUp(e.clientX, e.clientY);
        }
    });

    canvas.addEventListener('touchstart', (e) => {
        lastTouchTime = performance.now();
        _controls.enableZoom = true;

        // Reset if this is the start of a single touch
        if (e.touches.length === 1) {
            isMultiTouch = false;
        }
        // Flag as multi-touch if more than one finger
        if (e.touches.length > 1) {
            isMultiTouch = true;
        }

        if (e.touches.length === 1) {
            onPointerDown(e.touches[0].clientX, e.touches[0].clientY);
        }
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
        lastTouchTime = performance.now();
        if (e.touches.length === 1) {
            onPointerMove(e.touches[0].clientX);
        }
    }, { passive: true });

    canvas.addEventListener('touchend', (e) => {
        lastTouchTime = performance.now();
        // Prevent default to stop mouse emulation (click/mousedown/mouseup)
        // Note: This might block some default browser behaviors, but for this canvas app it's usually desired.
        if (e.cancelable) e.preventDefault();

        if (e.changedTouches.length > 0) {
            onPointerUp(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
        } else {
            isDragging = false;
        }
    });

    // Custom wheel zoom
    canvas.addEventListener('wheel', onWheel, { passive: false });
}

// --- Event Handlers ---

function onPointerDown(x, y) {
    isDragging = true;
    previousMsgX = x;
    baguaVelocity = 0;
    lastPointerTime = performance.now();
    clickStartX = x;
    clickStartY = y;
}

function onPointerMove(x) {
    if (!isDragging) return;
    const deltaX = x - previousMsgX;
    previousMsgX = x;

    if (_baguaSystem) {
        const rotateDelta = deltaX * 0.012;
        _baguaSystem.rotation.z += rotateDelta;
        baguaVelocity = rotateDelta;
    }
}

function onPointerUp(x, y) {
    if (isMultiTouch) return; // Ignore click if it was a multi-touch gesture

    isDragging = false;
    const dx = x - clickStartX;
    const dy = y - clickStartY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Threshold for click vs drag (10px is standard for mobile tap)
    if (distance < 10) {
        checkClick(x, y);
    }
}

function checkClick(x, y) {
    mouse.x = (x / window.innerWidth) * 2 - 1;
    mouse.y = -(y / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, _camera);
    const intersects = raycaster.intersectObject(_interactionSphere);

    if (intersects.length > 0) {
        // Only switch model if we are currently near the "sphere" state (factor < 0.1)
        // If we are already morphing or fully morphed, just reverse direction.
        if (!isMorphing && currentMorphFactor < 0.1 && _onMorphStart) {
            _onMorphStart();
        }

        isMorphing = !isMorphing;
        console.log("Interaction sphere clicked. Morphing:", isMorphing);
    }
}

let wheelTimeout;

function onWheel(event) {
    event.preventDefault();

    if (!isZoomInit) {
        targetZoomDist = _camera.position.distanceTo(_controls.target);
        isZoomInit = true;
    }

    // 1. 数据清洗 (Safe Zoom) - 忽略数值大小，只看方向
    const direction = Math.sign(event.deltaY);
    if (direction === 0) return;

    // 2. 定步长缩放 (Dolly)
    const factor = 0.95;

    if (direction < 0) {
        // 拉近 (Dolly In)
        // 死锁保护：防止相机与目标点重合
        if (targetZoomDist < 0.0001) return;
        targetZoomDist *= factor;
    } else {
        // 拉远 (Dolly Out)
        targetZoomDist *= (1 / factor);
    }

    // 限制范围
    targetZoomDist = Math.max(_controls.minDistance, Math.min(targetZoomDist, _controls.maxDistance));

    // Log distance when wheel stops
    clearTimeout(wheelTimeout);
    wheelTimeout = setTimeout(() => {
        const dist = _camera.position.distanceTo(_controls.target);
        console.log("Safe Zoom Distance:", dist.toFixed(4));
    }, 200);
}

// --- Update Loop ---

export function updateInteraction(time) {
    // 1. Morphing Animation
    const targetFactor = isMorphing ? 1.0 : 0.0;
    if (Math.abs(currentMorphFactor - targetFactor) > 0.001) {
        currentMorphFactor += (targetFactor - currentMorphFactor) * 0.02;
        setMorphFactor(currentMorphFactor);
    }

    // 2. Bagua Inertia & Wobble
    if (_baguaSystem) {
        if (!isDragging) {
            _baguaSystem.rotation.z += baguaVelocity;
            baguaVelocity *= 0.97;

            if (Math.abs(baguaVelocity) < 0.00001) {
                baguaVelocity = 0;
                const wobble = Math.sin(time * 0.5) * 0.001;
                _baguaSystem.rotation.z += wobble;
            }
        }
    }

    // 3. Elastic Scaling (Parallax)
    const baseDistance = 4.5;
    if (typeof window.currentSmoothedScale === 'undefined') window.currentSmoothedScale = 1.0;

    const currentDist = _camera.position.distanceTo(_controls.target);
    const targetScaleMultiplier = baseDistance / Math.max(0.1, currentDist);

    window.currentSmoothedScale += (targetScaleMultiplier - window.currentSmoothedScale) * 0.008;

    if (_baguaSystem) {
        const baseS = _baguaSystem.userData.baseScale || 1.5;
        const finalS = baseS * window.currentSmoothedScale;
        _baguaSystem.scale.setScalar(finalS);
    }

    // 4. Camera Zoom Viscosity
    if (isZoomInit || Math.abs(targetZoomDist) > 0.001) {
        if (!isZoomInit && targetZoomDist === 0) {
            targetZoomDist = _camera.position.distanceTo(_controls.target);
            isZoomInit = true;
        }

        const currentDist = _camera.position.distanceTo(_controls.target);
        const lerpFactor = 0.08;

        if (Math.abs(currentDist - targetZoomDist) > 0.01) {
            const newDist = currentDist + (targetZoomDist - currentDist) * lerpFactor;
            const offset = new THREE.Vector3().copy(_camera.position).sub(_controls.target);
            offset.setLength(newDist);
            _camera.position.copy(_controls.target).add(offset);
        }
    }
}

// Helper to reset zoom state on resize
export function onResize() {
    if (_camera && _controls) {
        targetZoomDist = _camera.position.distanceTo(_controls.target);
        isZoomInit = true;
    }
}
