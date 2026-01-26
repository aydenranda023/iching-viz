import * as THREE from 'three';

let baguaGroup;
let rings = [];

export function createBagua() {
    baguaGroup = new THREE.Group();
    rings = [];

    // 位置与缩放
    baguaGroup.position.z = -20;
    baguaGroup.scale.set(1.5, 1.5, 1.5);

    // 材质
    const trigramMaterial = new THREE.MeshBasicMaterial({
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

    // --- 几何构建辅助函数 (保持极速版逻辑) ---
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

    // --- 生成 9 圈 ---
    const totalRings = 9;
    const baseRadius = 5.0;
    const ringSpacing = 1.8;

    for (let layer = 0; layer < totalRings; layer++) {
        const vertices = [];

        const isBaseLayer = (layer === 0);
        const radius = baseRadius + (layer * ringSpacing);
        const count = 8 * Math.pow(2, layer);
        const scale = Math.max(0.15, 1.0 / (layer * 0.6 + 1));

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
        const ringMesh = new THREE.Mesh(geometry, trigramMaterial);

        // --- 核心动力学参数配置 ---
        rings.push({
            mesh: ringMesh,
            layer: layer,
            // 虚拟旋转角度
            virtualRotation: 0,

            // 1. 惯性/延迟系数 (Lag Factor)
            // 极大的启动延迟：内圈较快，外圈极慢
            // 使用指数衰减
            lerpFactor: Math.max(0.0005, 0.05 * Math.pow(0.6, layer)),

            // 2. 呼吸相位
            breathePhase: Math.random() * Math.PI * 2
        });

        baguaGroup.add(ringMesh);
    }

    return baguaGroup;
}

export function updateBagua(time) {
    if (!baguaGroup || rings.length === 0) return;

    // 获取父容器（整体）的旋转角度
    const parentRotation = baguaGroup.rotation.z;

    // 链式反应
    for (let i = 0; i < rings.length; i++) {
        const ring = rings[i];
        let targetRotation;

        if (i === 0) {
            // Ring 0 (最内圈) 跟随鼠标
            targetRotation = parentRotation;
        } else {
            // 后续每一圈的目标是上一圈的"当前状态"的反向
            // 这样保证了严格的 0(正), 1(反), 2(正), 3(反)...
            const prevRing = rings[i - 1];
            targetRotation = -prevRing.virtualRotation;
        }

        // 核心：使用 lerp 逼近目标
        const diff = targetRotation - ring.virtualRotation;

        // 增加一个非线性的"粘滞"效果，当差异很大时加速，差异小时极慢
        ring.virtualRotation += diff * ring.lerpFactor;

        // --- 抵消父级旋转 ---
        // 这一步至关重要：因为 ringMesh 是 baguaGroup 的子物体，
        // 它默认会随着 baguaGroup 转。
        // 如果我们要它表现出 virtualRotation 的绝对角度，
        // 必须减去 parentRotation。
        ring.mesh.rotation.z = ring.virtualRotation - parentRotation;

        // --- 极微弱的呼吸 ---
        const breathe = Math.sin(time * 0.5 + ring.breathePhase) * 0.002;
        ring.mesh.rotation.z += breathe;
    }
}

export function resizeBagua(aspect) {
    if (!baguaGroup) return;
    const baseScale = 1.5;
    const targetScale = aspect < 1 ? baseScale * 0.55 : baseScale;
    baguaGroup.scale.set(targetScale, targetScale, targetScale);
    baguaGroup.userData.baseScale = targetScale;
}