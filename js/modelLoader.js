import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';

/**
 * 加载 GLB 模型并采样点云数据
 * @param {string} url - GLB 文件路径
 * @param {number} count - 需要采样的点数量
 * @returns {Promise<Float32Array>} - 包含点位置的数组 [x, y, z, x, y, z, ...]
 */
export function loadModelPoints(url, count) {
    return new Promise((resolve, reject) => {
        const loader = new GLTFLoader();

        loader.load(url, (gltf) => {
            const group = gltf.scene;
            const meshes = [];

            // 递归查找所有 Mesh
            group.traverse((child) => {
                if (child.isMesh) {
                    meshes.push(child);
                }
            });

            if (meshes.length === 0) {
                reject(new Error('No meshes found in GLB model.'));
                return;
            }

            // 简单起见，我们只对第一个 Mesh 进行采样
            const mesh = meshes[0];
            mesh.updateMatrixWorld();

            const sampler = new MeshSurfaceSampler(mesh)
                .setWeightAttribute(null) // 均匀采样
                .build();

            const points = new Float32Array(count * 3);
            const tempPosition = new THREE.Vector3();

            // 1. 采样
            for (let i = 0; i < count; i++) {
                sampler.sample(tempPosition);
                points[i * 3] = tempPosition.x;
                points[i * 3 + 1] = tempPosition.y;
                points[i * 3 + 2] = tempPosition.z;
            }

            // 2. 计算包围盒和中心
            const min = new THREE.Vector3(Infinity, Infinity, Infinity);
            const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);

            for (let i = 0; i < count; i++) {
                const x = points[i * 3];
                const y = points[i * 3 + 1];
                const z = points[i * 3 + 2];

                min.x = Math.min(min.x, x);
                min.y = Math.min(min.y, y);
                min.z = Math.min(min.z, z);

                max.x = Math.max(max.x, x);
                max.y = Math.max(max.y, y);
                max.z = Math.max(max.z, z);
            }

            const center = new THREE.Vector3()
                .addVectors(min, max)
                .multiplyScalar(0.5);

            // 3. 归一化并缩放
            // 目标半径 2.5 (适配相机距离 4.5)
            const targetRadius = 2.5;

            // 计算当前最大半径 (相对于中心)
            let maxRadius = 0;
            for (let i = 0; i < count; i++) {
                const x = points[i * 3] - center.x;
                const y = points[i * 3 + 1] - center.y;
                const z = points[i * 3 + 2] - center.z;

                const r = Math.sqrt(x * x + y * y + z * z);
                maxRadius = Math.max(maxRadius, r);
            }

            const scale = targetRadius / maxRadius;

            // 应用偏移和缩放
            for (let i = 0; i < count; i++) {
                points[i * 3] = (points[i * 3] - center.x) * scale;
                points[i * 3 + 1] = (points[i * 3 + 1] - center.y) * scale;
                points[i * 3 + 2] = (points[i * 3 + 2] - center.z) * scale;
            }

            resolve(points);

        }, undefined, (error) => {
            reject(error);
        });
    });
}
