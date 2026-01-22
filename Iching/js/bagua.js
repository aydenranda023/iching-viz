import * as THREE from 'three';

let baguaGroup;

export function createBagua() {
    baguaGroup = new THREE.Group();

    // 1. 位置：依然放在相机视角的远处
    baguaGroup.position.z = -20;

    // 2.【关键修改】尺寸：之前是 3.5，太大了。
    // 改成 1.5 或 1.8，让它能完整显示在屏幕内
    baguaGroup.scale.set(1.5, 1.5, 1.5);

    // 材质
    const trigramMaterial = new THREE.MeshBasicMaterial({
        color: 0x666666,
        transparent: true,
        opacity: 0.1,
        side: THREE.DoubleSide,
        depthWrite: false // 防止遮挡粒子导致闪烁
    });

    const baguaData = [
        [1, 1, 1], [0, 1, 1], [1, 0, 1], [0, 0, 1],
        [1, 1, 0], [0, 1, 0], [1, 0, 0], [0, 0, 0]
    ];

    function createTrigramMesh(yaoData) {
        const group = new THREE.Group();
        const lineWidth = 1.2;
        const lineHeight = 0.15;
        const lineGap = 0.25;
        const brokenGap = 0.2;

        yaoData.forEach((yaoType, index) => {
            const yPos = (1 - index) * (lineHeight + lineGap);
            // 计算偏移量，确保旋转中心在几何中心
            const yOffset = yPos - (lineHeight + lineGap);

            if (yaoType === 1) {
                const geo = new THREE.PlaneGeometry(lineWidth, lineHeight);
                // 修正中心点
                geo.translate(0, yOffset, 0);
                group.add(new THREE.Mesh(geo, trigramMaterial));
            } else {
                const segmentWidth = (lineWidth - brokenGap) / 2;
                const geo = new THREE.PlaneGeometry(segmentWidth, lineHeight);

                // 左半段修正
                const leftGeo = geo.clone().translate(-(segmentWidth + brokenGap) / 2, yOffset, 0);
                // 右半段修正
                const rightGeo = geo.clone().translate((segmentWidth + brokenGap) / 2, yOffset, 0);

                group.add(new THREE.Mesh(leftGeo, trigramMaterial));
                group.add(new THREE.Mesh(rightGeo, trigramMaterial));
            }
        });
        return group;
    }

    const radius = 5.0;
    for (let i = 0; i < 8; i++) {
        const trigram = createTrigramMesh(baguaData[i]);
        const angle = (i / 8) * Math.PI * 2;
        trigram.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
        trigram.rotation.z = angle + Math.PI / 2;
        baguaGroup.add(trigram);
    }

    return baguaGroup;
}

export function updateBagua(time) {
    if (baguaGroup) {
        // 缓慢自转 + 微微摇晃
        const baseRotation = time * -0.02;
        const wobble = Math.sin(time * 0.5) * 0.05;
        baguaGroup.rotation.z = baseRotation + wobble;
    }
}