import * as THREE from 'three';

let _scene, _camera, _renderer, _controls;
let _particleMaterial; // Reference to the particle material to update uniforms

// Configuration
const ELASTIC_RETURN_SPEED = 0.05; // How fast points return (0.0 - 1.0)
const DRAG_RADIUS = 1.0; // Radius of influence
const MAX_DRAG_DISTANCE = 1.0; // Maximum distance points can be dragged
const DRAG_RESISTANCE = 0.4; // Resistance factor (lower = heavier)

// State
let isRightDragging = false;
let dragStartPoint = new THREE.Vector3(); // Mouse position at start of drag

// Slot 1 (Active / Primary)
let dragCenter1 = new THREE.Vector3();
let dragOffset1 = new THREE.Vector3();

// Slot 2 (Decaying / Secondary)
let dragCenter2 = new THREE.Vector3();
let dragOffset2 = new THREE.Vector3();

let dragPlane = new THREE.Plane();
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

export function initElasticInteraction(scene, camera, renderer, controls, particleSystem) {
    _scene = scene;
    _camera = camera;
    _renderer = renderer;
    _controls = controls;

    if (particleSystem && particleSystem.material) {
        _particleMaterial = particleSystem.material;
        // Initialize radius
        if (_particleMaterial.uniforms.uDragRadius) {
            _particleMaterial.uniforms.uDragRadius.value = DRAG_RADIUS;
        }
        if (_particleMaterial.uniforms.uDragRadius2) {
            _particleMaterial.uniforms.uDragRadius2.value = DRAG_RADIUS;
        }
    }

    const canvas = renderer.domElement;

    // Prevent context menu on right click
    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    }, false);

    canvas.addEventListener('mousedown', onMouseDown, false);
    canvas.addEventListener('mousemove', onMouseMove, false);
    window.addEventListener('mouseup', onMouseUp, false); // Window to catch release outside canvas
}

function onMouseDown(event) {
    // Only handle Right Click (button 2)
    if (event.button !== 2) return;

    event.preventDefault();

    updateMouse(event);
    raycaster.setFromCamera(mouse, _camera);

    // Create a plane facing the camera
    const planeNormal = new THREE.Vector3();
    _camera.getWorldDirection(planeNormal);
    dragPlane.setFromNormalAndCoplanarPoint(planeNormal, new THREE.Vector3(0, 0, 0));

    const intersectPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(dragPlane, intersectPoint);

    if (intersectPoint) {
        isRightDragging = true;
        dragStartPoint.copy(intersectPoint);

        // --- Dual Slot Logic ---
        // If Slot 1 is currently active (has offset), push it to Slot 2 to decay in background
        if (dragOffset1.lengthSq() > 0.001) {
            // Move Slot 1 -> Slot 2
            dragCenter2.copy(dragCenter1);
            dragOffset2.copy(dragOffset1);

            // Sync Shader Slot 2
            if (_particleMaterial) {
                _particleMaterial.uniforms.uDragCenter2.value.copy(dragCenter2);
                _particleMaterial.uniforms.uDragOffset2.value.copy(dragOffset2);
            }
        }

        // Reset Slot 1 for new drag
        dragCenter1.copy(intersectPoint);
        dragOffset1.set(0, 0, 0);

        // Sync Shader Slot 1
        if (_particleMaterial) {
            _particleMaterial.uniforms.uDragCenter.value.copy(dragCenter1);
            _particleMaterial.uniforms.uDragOffset.value.set(0, 0, 0);
        }

        // Disable orbit controls while dragging
        _controls.enabled = false;
    }
}

function onMouseMove(event) {
    if (!isRightDragging) return;

    updateMouse(event);
    raycaster.setFromCamera(mouse, _camera);

    const intersectPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(dragPlane, intersectPoint);

    if (intersectPoint) {
        // Calculate raw delta from start point
        const delta = new THREE.Vector3().subVectors(intersectPoint, dragStartPoint);

        // Apply resistance (scale down the movement)
        delta.multiplyScalar(DRAG_RESISTANCE);

        // Update Slot 1 Offset
        dragOffset1.copy(delta);

        // If dragged too far, snap back (release drag)
        if (dragOffset1.length() > MAX_DRAG_DISTANCE) {
            onMouseUp();
            return;
        }

        // Update Shader Slot 1
        if (_particleMaterial) {
            _particleMaterial.uniforms.uDragOffset.value.copy(dragOffset1);
        }
    }
}

function onMouseUp(event) {
    if (isRightDragging) {
        isRightDragging = false;
        _controls.enabled = true; // Re-enable controls
    }
}

function updateMouse(event) {
    const rect = _renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

export function updateElasticInteraction() {
    if (!_particleMaterial) return;

    // 1. Decay Slot 1 (if not dragging)
    if (!isRightDragging) {
        dragOffset1.lerp(new THREE.Vector3(0, 0, 0), ELASTIC_RETURN_SPEED);
        if (dragOffset1.lengthSq() < 0.0001) dragOffset1.set(0, 0, 0);
        _particleMaterial.uniforms.uDragOffset.value.copy(dragOffset1);
    }

    // 2. Decay Slot 2 (Always)
    if (dragOffset2.lengthSq() > 0.0001) {
        dragOffset2.lerp(new THREE.Vector3(0, 0, 0), ELASTIC_RETURN_SPEED);
        if (dragOffset2.lengthSq() < 0.0001) dragOffset2.set(0, 0, 0);
        _particleMaterial.uniforms.uDragOffset2.value.copy(dragOffset2);
    }
}
