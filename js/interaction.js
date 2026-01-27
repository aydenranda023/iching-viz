import * as THREE from 'three';
import { setMorphFactor } from './particles.js';

// --- State Variables ---
let isDragging = false;
let previousMsgX = 0;
let previousMsgY = 0;
let baguaVelocity = 0;
let lastPointerTime = 0;
let clickStartX = 0;
let clickStartY = 0;
let isMultiTouch = false;
let isWheelZooming = false; // NEW: Track if we are zooming via wheel
import { playRotatingSound, stopRotatingSound } from './audio.js';

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

    // Listen for OrbitControls start event (touch/mouse drag)
    // When user starts interacting manually, disable our custom wheel smoothing
    _controls.addEventListener('start', () => {
        isWheelZooming = false;
        // Sync target distance to current to prevent jump when wheeling later
        targetZoomDist = _camera.position.distanceTo(_controls.target);
    });

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
        e.preventDefault(); // Prevent focus loss on input

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
        onPointerMove(e.clientX, e.clientY);
    });
    canvas.addEventListener('mouseup', (e) => {
        if (performance.now() - lastTouchTime < 500) return;
        // Only allow Left Click (button 0) to trigger click logic
        if (e.button === 0) {
            onPointerUp(e.clientX, e.clientY);
        }
    });

    // --- Multi-touch Cooldown ---
    let multiTouchCooldown = 0;

    canvas.addEventListener('touchstart', (e) => {
        if (e.cancelable) e.preventDefault(); // Prevent focus loss on input

        lastTouchTime = performance.now();
        _controls.enableZoom = true;

        if (e.touches.length > 1) {
            isMultiTouch = true;
            isDragging = false; // Cancel any single-finger drag
        }

        if (e.touches.length === 1) {
            // Only start drag if not in cooldown
            if (performance.now() > multiTouchCooldown) {
                isMultiTouch = false;
                onPointerDown(e.touches[0].clientX, e.touches[0].clientY);
            }
        }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        if (e.cancelable) e.preventDefault(); // Prevent default scrolling

        lastTouchTime = performance.now();

        if (isMultiTouch || performance.now() < multiTouchCooldown) return;

        if (e.touches.length === 1) {
            onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
        }
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
        lastTouchTime = performance.now();
        if (e.cancelable) e.preventDefault();

        // If we were multi-touching, or still have fingers, set cooldown
        if (isMultiTouch || e.touches.length > 0) {
            // If we are ending a multi-touch (going from 2+ to <2), trigger cooldown
            // Actually, just always set cooldown if we were in multi-touch mode recently
            if (isMultiTouch) {
                multiTouchCooldown = performance.now() + 300; // 300ms cooldown
            }
        }

        // Reset multi-touch flag if no fingers left
        if (e.touches.length === 0) {
            isMultiTouch = false;
        }

        if (performance.now() < multiTouchCooldown) {
            isDragging = false;
            return;
        }

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
    previousMsgY = y;
    baguaVelocity = 0;
    lastPointerTime = performance.now();
    clickStartX = x;
    clickStartY = y;
}

function onPointerMove(x, y) {
    if (!isDragging) return;

    // Calculate center of screen
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;

    // Vector from center to current mouse position
    const rx = x - cx;
    const ry = y - cy;

    const dx = x - previousMsgX;
    const dy = y - previousMsgY;

    previousMsgX = x;
    previousMsgY = y;

    // Normalize radius vector to avoid extreme speeds near center/far edge
    const rMag = Math.sqrt(rx * rx + ry * ry);
    if (rMag < 10) return; // Too close to center, ignore

    // Tangent direction: (-ry, rx)
    // Dot product: dx * (-ry) + dy * (rx)
    // Cross(R, D) = rx * dy - ry * dx.
    const crossProduct = (rx * dy) - (ry * dx);

    // dTheta = (Component along tangent) / radius.
    const dTheta = crossProduct / (rMag * rMag);

    if (_baguaSystem) {
        // Apply a sensitivity factor
        // Inverted to match user expectation (tangent push)
        const sensitivity = -1.5;
        const rotateDelta = dTheta * sensitivity;

        _baguaSystem.rotation.z += rotateDelta;
        baguaVelocity = rotateDelta;

        // Play sound when dragging
        if (Math.abs(rotateDelta) > 0.0001) {
            playRotatingSound();
        }
    }
}

function onPointerUp(x, y) {
    if (isMultiTouch) return; // Ignore click if it was a multi-touch gesture

    isDragging = false;
    const clickDx = x - clickStartX;
    const clickDy = y - clickStartY;
    const distance = Math.sqrt(clickDx * clickDx + clickDy * clickDy);

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

    // If we weren't wheel zooming, sync up first to avoid jumps
    if (!isWheelZooming) {
        targetZoomDist = _camera.position.distanceTo(_controls.target);
        isWheelZooming = true;
    }

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

                // Stop sound when stopped
                stopRotatingSound();
            } else {
                // Keep playing if still has significant velocity
                if (Math.abs(baguaVelocity) > 0.001) {
                    playRotatingSound();
                } else {
                    stopRotatingSound();
                }
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

    // 4. Camera Zoom Viscosity (Only when using Wheel)
    if (isWheelZooming && (isZoomInit || Math.abs(targetZoomDist) > 0.001)) {
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
        } else {
            // Reached target, stop wheel zooming state
            // isWheelZooming = false; // Optional: auto-disable
        }
    }
}

// Helper to reset zoom state on resize
export function onResize() {
    if (_camera && _controls) {
        targetZoomDist = _camera.position.distanceTo(_controls.target);
        isZoomInit = true;
        isWheelZooming = false; // Reset wheel zoom on resize
    }
}
