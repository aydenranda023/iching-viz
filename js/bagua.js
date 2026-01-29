import * as THREE from 'three';

let baguaGroup;
let rings = [];

export function createBagua() {
    baguaGroup = new THREE.Group();
    rings = [];

    baguaGroup.position.z = -20;
    baguaGroup.scale.set(1.5, 1.5, 1.5);

    const baseMaterial = new THREE.MeshBasicMaterial({
        color: 0x666666,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
        depthWrite: false,
        fog: false
    });

    const baguaData = [
        [1, 1, 1], [0, 1, 1], [1, 0, 1], [0, 0, 1],
        [1, 1, 0], [0, 1, 0], [1, 0, 0], [0, 0, 0]
    ];

    function pushRect(vertices, x, y, w, h, rotation, offsetX, offsetY) {
        const halfW = w / 2;
        const halfH = h / 2;
        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);

        const corners = [
            { x: -halfW + offsetX, y: halfH + offsetY },
            { x: halfW + offsetX, y: halfH + offsetY },
            { x: -halfW + offsetX, y: -halfH + offsetY },
            { x: halfW + offsetX, y: -halfH + offsetY }
        ];

        for (let i = 0; i < 4; i++) {
            const cx = corners[i].x;
            const cy = corners[i].y;
            const rx = cx * cos - cy * sin;
            const ry = cx * sin + cy * cos;
            corners[i].finalX = rx + x;
            corners[i].finalY = ry + y;
        }

        vertices.push(corners[0].finalX, corners[0].finalY, 0);
        vertices.push(corners[2].finalX, corners[2].finalY, 0);
        vertices.push(corners[1].finalX, corners[1].finalY, 0);
        vertices.push(corners[2].finalX, corners[2].finalY, 0);
        vertices.push(corners[3].finalX, corners[3].finalY, 0);
        vertices.push(corners[1].finalX, corners[1].finalY, 0);
    }

    const totalRings = 9;
    const baseRadius = 5.0;
    const ringSpacing = 1.8;

    for (let layer = 0; layer < totalRings; layer++) {
        const vertices = [];

        const isBaseLayer = (layer === 0);
        const radius = baseRadius + (layer * ringSpacing);
        const count = 8 * Math.pow(2, layer);
        const scale = Math.max(0.02, 1.0 / (layer * 1 + 1.2));

        const lineWidth = 1.2 * scale;
        const lineHeight = 0.15 * scale;
        const lineGap = 0.25 * scale;
        const widthBrokenGap = 0.2 * scale;

        for (let i = 0; i < count; i++) {
            let yaoData;
            if (isBaseLayer) {
                yaoData = baguaData[i % 8];
            } else {
                yaoData = baguaData[Math.floor(Math.random() * 8)];
            }

            const angle = (i / count) * Math.PI * 2;
            const posX = Math.cos(angle) * radius;
            const posY = Math.sin(angle) * radius;
            const rotation = angle + Math.PI / 2;

            yaoData.forEach((yaoType, index) => {
                const yOffsetLocal = (1 - index) * (lineHeight + lineGap) - (lineHeight + lineGap);
                if (yaoType === 1) {
                    pushRect(vertices, posX, posY, lineWidth, lineHeight, rotation, 0, yOffsetLocal);
                } else {
                    const segmentWidth = (lineWidth - widthBrokenGap) / 2;
                    pushRect(vertices, posX, posY, segmentWidth, lineHeight, rotation, -(segmentWidth + widthBrokenGap) / 2, yOffsetLocal);
                    pushRect(vertices, posX, posY, segmentWidth, lineHeight, rotation, (segmentWidth + widthBrokenGap) / 2, yOffsetLocal);
                }
            });
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

        const material = baseMaterial.clone();

        const maxOpacity = Math.max(0.04, 0.6 - (layer * 0.05));

        material.opacity = isBaseLayer ? maxOpacity : 0;

        const ringMesh = new THREE.Mesh(geometry, material);

        rings.push({
            mesh: ringMesh,
            material: material,
            layer: layer,
            maxOpacity: maxOpacity,
            virtualRotation: 0,
            lastVirtualRotation: 0,
            lerpFactor: Math.max(0.0005, 0.05 * Math.pow(0.6, layer)),
            breathePhase: Math.random() * Math.PI * 2
        });

        baguaGroup.add(ringMesh);
    }

    return baguaGroup;
}

export function updateBagua(time) {
    if (!baguaGroup || rings.length === 0) return;

    const parentRotation = baguaGroup.rotation.z;

    const ROTATION_THRESHOLD = 0.01;
    let anyRingMoving = false;

    for (let i = 0; i < rings.length; i++) {
        const ring = rings[i];
        let targetRotation;

        if (i === 0) {
            targetRotation = parentRotation;
        } else {
            const prevRing = rings[i - 1];
            targetRotation = -prevRing.virtualRotation;

            const prevSpeed = Math.abs(prevRing.virtualRotation - prevRing.lastVirtualRotation);

            if (prevSpeed > ROTATION_THRESHOLD) {
                ring.shouldFadeIn = true;
            }
        }

        ring.lastVirtualRotation = ring.virtualRotation;

        const diff = targetRotation - ring.virtualRotation;
        ring.virtualRotation += diff * ring.lerpFactor;

        const currentSpeed = Math.abs(ring.virtualRotation - ring.lastVirtualRotation);
        if (currentSpeed > ROTATION_THRESHOLD) {
            anyRingMoving = true;
        }

        ring.mesh.rotation.z = ring.virtualRotation - parentRotation;

        const breathe = Math.sin(time * 0.5 + ring.breathePhase) * 0.002;
        ring.mesh.rotation.z += breathe;
    }

    if (!anyRingMoving) {
        for (let i = 1; i < rings.length; i++) {
            rings[i].shouldFadeIn = false;
        }
    }

    for (let i = 0; i < rings.length; i++) {
        const ring = rings[i];

        let targetOpacity;
        if (i === 0) {
            targetOpacity = ring.maxOpacity;
        } else {
            if (ring.shouldFadeIn) {
                targetOpacity = ring.maxOpacity;
            } else {
                targetOpacity = 0;
            }
        }

        if (Math.abs(ring.material.opacity - targetOpacity) > 0.001) {
            ring.material.opacity += (targetOpacity - ring.material.opacity) * 0.05;
        } else {
            ring.material.opacity = targetOpacity;
        }

        ring.mesh.visible = ring.material.opacity > 0.01;
    }
}

export function resizeBagua(aspect) {
    if (!baguaGroup) return;
    const baseScale = 1.5;
    // 增加对屏幕宽度的判断：如果是小屏幕（手机），强制使用小比例，
    // 防止键盘弹出导致高度变小、aspect 变大 (>1) 从而误判为桌面模式
    const isSmallScreen = window.innerWidth < 768;
    const targetScale = (aspect < 1 || isSmallScreen) ? baseScale * 0.55 : baseScale;

    baguaGroup.scale.set(targetScale, targetScale, targetScale);
    baguaGroup.userData.baseScale = targetScale;
}