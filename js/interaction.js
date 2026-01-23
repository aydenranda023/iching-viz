import * as THREE from 'three';
import { setMorphFactor } from './particles.js';

// --- State Variables ---
let isDragging = false;
let previousMsgX = 0;
let baguaVelocity = 0;
let lastPointerTime = 0;
let clickStartX = 0;
let clickStartY = 0;

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
    _baguaSystem = baguaSystem;
    _onMorphStart = onMorphStart;

    // Create invisible interaction sphere
    const interactionGeometry = new THREE.SphereGeometry(2.5, 32, 32);
    const interactionMaterial = new THREE.MeshBasicMaterial({
        visible: false,
        side: THREE.DoubleSide
    });
    _interactionSphere = new THREE.Mesh(interactionGeometry, interactionMaterial);
    _scene.add(_interactionSphere);

    // Bind events
    const canvas = _renderer.domElement;
    canvas.addEventListener('mousedown', (e) => {
        // Only allow Left Click (button 0) for custom interaction
        if (e.button === 0) {
            onPointerDown(e.clientX, e.clientY);
        }
    });
    canvas.addEventListener('mousemove', (e) => onPointerMove(e.clientX));
    canvas.addEventListener('mouseup', (e) => onPointerUp(e.clientX, e.clientY));

    canvas.addEventListener('touchstart', (e) => {
        _controls.enableZoom = true;
        if (e.touches.length === 1) {
            onPointerDown(e.touches[0].clientX, e.touches[0].clientY);
        }
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1) {
            onPointerMove(e.touches[0].clientX);
        }
    }, { passive: true });

    canvas.addEventListener('touchend', (e) => {
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
    isDragging = false;
    const dx = x - clickStartX;
    const dy = y - clickStartY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 30) {
        checkClick(x, y);
    }
}

function checkClick(x, y) {
    mouse.x = (x / window.innerWidth) * 2 - 1;
    mouse.y = -(y / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, _camera);
    const intersects = raycaster.intersectObject(_interactionSphere);

    if (intersects.length > 0) {
        // If we are about to morph TO model (currently sphere), trigger callback
        if (!isMorphing && _onMorphStart) {
            _onMorphStart();
        }

        isMorphing = !isMorphing;
        console.log("Interaction sphere clicked. Morphing:", isMorphing);
    }
}

const zoomStep = 1.1;
function onWheel(event) {
    event.preventDefault();

    if (!isZoomInit) {
        targetZoomDist = _camera.position.distanceTo(_controls.target);
        isZoomInit = true;
    }

    const direction = Math.sign(event.deltaY);
    if (direction > 0) {
        targetZoomDist *= zoomStep;
    } else {
        targetZoomDist /= zoomStep;
    }

    targetZoomDist = Math.max(_controls.minDistance, Math.min(targetZoomDist, _controls.maxDistance));
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
