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
            gltf.scene.updateMatrixWorld(true); // 确保世界矩阵是最新的

            group.traverse((child) => {
                if (child.isMesh) {
                    meshes.push(child);
                }
            });

            if (meshes.length === 0) {
                resolve(new Float32Array(0));
                return;
            }

            // --- 1. 计算每个 Mesh 的表面积 ---
            let totalArea = 0;
            const meshAreas = [];

            meshes.forEach(mesh => {
                const geometry = mesh.geometry.toNonIndexed(); // 确保有 position 属性
                const positions = geometry.attributes.position.array;
                let area = 0;

                // 遍历所有三角形计算面积
                const pA = new THREE.Vector3();
                const pB = new THREE.Vector3();
                const pC = new THREE.Vector3();
                const triangle = new THREE.Triangle();

                // 应用 matrixWorld 到顶点再算面积，以获得真实世界尺寸的面积
                for (let i = 0; i < positions.length; i += 9) {
                    pA.set(positions[i], positions[i + 1], positions[i + 2]).applyMatrix4(mesh.matrixWorld);
                    pB.set(positions[i + 3], positions[i + 4], positions[i + 5]).applyMatrix4(mesh.matrixWorld);
                    pC.set(positions[i + 6], positions[i + 7], positions[i + 8]).applyMatrix4(mesh.matrixWorld);

                    triangle.set(pA, pB, pC);
                    area += triangle.getArea();
                }

                meshAreas.push(area);
                totalArea += area;
            });

            // --- 2. 按面积权重分配点数并采样 ---
            const positions = [];
            const tempPosition = new THREE.Vector3();

            meshes.forEach((mesh, index) => {
                if (totalArea === 0) return;

                const area = meshAreas[index];
                // 分配点数：按面积比例
                // 至少分配 0 个点
                const meshPointCount = Math.floor(count * (area / totalArea));
                if (meshPointCount === 0) return;

                const sampler = new MeshSurfaceSampler(mesh).build();

                for (let i = 0; i < meshPointCount; i++) {
                    sampler.sample(tempPosition);
                    // 关键：应用 Mesh 的世界矩阵
                    tempPosition.applyMatrix4(mesh.matrixWorld);
                    positions.push(tempPosition.x, tempPosition.y, tempPosition.z);
                }
            });

            const float32Array = new Float32Array(positions);

            // --- 归一化处理 (Normalization) ---
            // 1. 计算包围盒
            let minX = Infinity, minY = Infinity, minZ = Infinity;
            let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

            for (let i = 0; i < float32Array.length; i += 3) {
                const x = float32Array[i];
                const y = float32Array[i + 1];
                const z = float32Array[i + 2];

                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (z < minZ) minZ = z;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
                if (z > maxZ) maxZ = z;
            }

            // 2. 计算中心点
            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;
            const centerZ = (minZ + maxZ) / 2;

            // 3. 计算最大尺寸 (用于缩放)
            const sizeX = maxX - minX;
            const sizeY = maxY - minY;
            const sizeZ = maxZ - minZ;
            const maxDim = Math.max(sizeX, sizeY, sizeZ);

            // 目标半径 (八卦盘内部)
            const targetRadius = 2.0;
            // 缩放比例
            const scale = (targetRadius * 2) / maxDim;

            // 4. 应用居中和缩放
            for (let i = 0; i < float32Array.length; i += 3) {
                float32Array[i] = (float32Array[i] - centerX) * scale;
                float32Array[i + 1] = (float32Array[i + 1] - centerY) * scale;
                float32Array[i + 2] = (float32Array[i + 2] - centerZ) * scale;
            }

            resolve(float32Array);
        }, undefined, (error) => {
            reject(error);
        });
    });
}
