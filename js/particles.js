import * as THREE from 'three';

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

    // --- Shader (完全来自 index.html) ---
    const vertexShader = `
        uniform float uTime;
        uniform float uMorphFactor; // 0.0 = Sphere, 1.0 = Target Model
        
        attribute float aRandom;
        attribute vec3 aTarget;
        
        varying float vNoise; 
        varying float vDepth; 

        // Simplex Noise
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
        float snoise(vec3 v) { 
            const vec2 C = vec2(1.0/6.0, 1.0/3.0);
            const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
            vec3 i  = floor(v + dot(v, C.yyy) );
            vec3 x0 = v - i + dot(i, C.xxx) ;
            vec3 g = step(x0.yzx, x0.xyz);
            vec3 l = 1.0 - g;
            vec3 i1 = min( g.xyz, l.zxy );
            vec3 i2 = max( g.xyz, l.zxy );
            vec3 x1 = x0 - i1 + C.xxx;
            vec3 x2 = x0 - i2 + C.yyy;
            vec3 x3 = x0 - D.yyy;
            i = mod289(i); 
            vec4 p = permute( permute( permute( 
                        i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                    + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
                    + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
            float n_ = 0.142857142857;
            vec3  ns = n_ * D.wyz - D.xzx;
            vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
            vec4 x_ = floor(j * ns.z);
            vec4 y_ = floor(j - 7.0 * x_ );
            vec4 x = x_ *ns.x + ns.yyyy;
            vec4 y = y_ *ns.x + ns.yyyy;
            vec4 h = 1.0 - abs(x) - abs(y);
            vec4 b0 = vec4( x.xy, y.xy );
            vec4 b1 = vec4( x.zw, y.zw );
            vec4 s0 = floor(b0)*2.0 + 1.0;
            vec4 s1 = floor(b1)*2.0 + 1.0;
            vec4 sh = -step(h, vec4(0.0));
            vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
            vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
            vec3 p0 = vec3(a0.xy,h.x);
            vec3 p1 = vec3(a0.zw,h.y);
            vec3 p2 = vec3(a1.xy,h.z);
            vec3 p3 = vec3(a1.zw,h.w);
            vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
            p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
            vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
            m = m * m;
            return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
        }

        void main() {
            // 混合当前位置和目标位置
            vec3 mixedPos = mix(position, aTarget, uMorphFactor);
            
            float slowTime = uTime * 0.08;
            
            // 随着 morph 增加，减少噪声幅度，让模型形状更清晰
            float noiseStrength = mix(0.2, 0.05, uMorphFactor); 
            
            float noise = snoise(mixedPos * 0.7 + slowTime * 0.4);
            float displacement = noise * noiseStrength; 
            vec3 direction = normalize(mixedPos);
            
            // 在模型状态下，我们可能不希望沿着法线膨胀太多，保持形状
            vec3 finalPos = mixedPos + direction * displacement;

            vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
            gl_Position = projectionMatrix * mvPosition;

            // 稍微调大粒子 (index.html 参数)
            gl_PointSize = (2.0) * (1.0 / -mvPosition.z);
            
            vNoise = noise;
            vDepth = -mvPosition.z; 
        }
    `;

    const fragmentShader = `
        uniform float uTime;
        varying float vNoise;
        varying float vDepth;

        void main() {
            vec2 center = gl_PointCoord - 0.5;
            float dist = length(center);
            float alphaShape = 1.0 - smoothstep(0.0, 0.5, dist);
            alphaShape = pow(alphaShape, 2.0); 
            
            if (alphaShape < 0.05) discard;

            // === index.html 的黑白配色 ===
            vec3 c_white = vec3(1.0, 1.0, 1.0); 
            vec3 c_black = vec3(0.05, 0.05, 0.05); 

            float n = vNoise * 0.5 + 0.5; 
            float slowCycle = sin(uTime * 0.15) * 0.5 + 0.5;
            
            // 混合阈值
            float mixVal = smoothstep(slowCycle - 0.25, slowCycle + 0.25, n);
            
            vec3 finalColor = mix(c_black, c_white, mixVal);

            // 透明度控制
            float finalAlpha = alphaShape * 0.9; 
            
            gl_FragColor = vec4(finalColor, finalAlpha);
        }
    `;

    material = new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        uniforms: {
            uTime: { value: 0 },
            uMorphFactor: { value: 0.0 }
        },
        transparent: true,
        blending: THREE.NormalBlending,
        depthWrite: false,
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