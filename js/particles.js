import * as THREE from 'three';
import { vertexShader, fragmentShader } from './shaders/particleShader.js';

let material; // 保存材质引用以便更新时间
let geometry; // 保存几何体引用以便更新属性

export function createParticles() {
    // 移动端优化：屏幕宽度小于 768px 时，减少粒子数量
    const isMobile = window.innerWidth < 768;
    const count = isMobile ? 150000 : 400000;

    geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const targets = new Float32Array(count * 3); // 目标位置
    const randoms = new Float32Array(count);

    for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        // 保持紧凑的内核 (index.html 参数)
        const r = 1.2 + Math.pow(Math.random(), 2) * 0.3;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);

        positions[i3] = x;
        positions[i3 + 1] = y;
        positions[i3 + 2] = z;

        // 初始目标位置与当前位置相同 (无变形)
        targets[i3] = x;
        targets[i3 + 1] = y;
        targets[i3 + 2] = z;

        randoms[i] = Math.random();
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aTarget', new THREE.BufferAttribute(targets, 3));
    geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));

    material = new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        uniforms: THREE.UniformsUtils.merge([
            THREE.UniformsLib.fog,
            {
                uTime: { value: 0 },
                uMorphFactor: { value: 0.0 },
                uDragCenter: { value: new THREE.Vector3(0, 0, 0) },
                uDragOffset: { value: new THREE.Vector3(0, 0, 0) },
                uDragRadius: { value: 2.0 },
                uDragCenter2: { value: new THREE.Vector3(0, 0, 0) },
                uDragOffset2: { value: new THREE.Vector3(0, 0, 0) },
                uDragRadius2: { value: 2.0 }
            }
        ]),
        transparent: true,
        blending: THREE.NormalBlending,
        depthWrite: false,
        fog: true
    });

    const particles = new THREE.Points(geometry, material);
    return particles;
}

export function updateParticles(time) {
    if (material) {
        material.uniforms.uTime.value = time;
    }
}

/**
 * 更新粒子的目标位置
 * @param {Float32Array} targetPoints - 目标点位数组
 */
export function updateMorphTarget(targetPoints) {
    if (!geometry) return;

    const count = geometry.attributes.position.count;
    const targets = geometry.attributes.aTarget.array;

    // 填充目标数组
    // 如果目标点少于粒子数，循环使用；如果多于，截断
    for (let i = 0; i < count; i++) {
        const srcIndex = (i % (targetPoints.length / 3)) * 3;
        targets[i * 3] = targetPoints[srcIndex];
        targets[i * 3 + 1] = targetPoints[srcIndex + 1];
        targets[i * 3 + 2] = targetPoints[srcIndex + 2];
    }

    geometry.attributes.aTarget.needsUpdate = true;
}

/**
 * 设置变形因子
 * @param {number} factor - 0.0 ~ 1.0
 */
export function setMorphFactor(factor) {
    if (material) {
        material.uniforms.uMorphFactor.value = factor;
    }
}