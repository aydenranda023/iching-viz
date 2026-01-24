export const vertexShader = `
    uniform float uTime;
    uniform float uMorphFactor; // 0.0 = Sphere, 1.0 = Target Model
    
    attribute float aRandom;
    attribute vec3 aTarget;
    
    varying float vNoise; 
    varying float vDepth; 

    #include <common>
    #include <fog_pars_vertex>

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

        // 增大粒子尺寸，让它们重叠形成柔和感
        gl_PointSize = (3.5) * (1.0 / -mvPosition.z);
        
        vNoise = noise;
        vDepth = -mvPosition.z; 

        #include <fog_vertex>
    }
`;

export const fragmentShader = `
    uniform float uTime;
    varying float vNoise;
    varying float vDepth;

    #include <common>
    #include <fog_pars_fragment>

    void main() {
        vec2 center = gl_PointCoord - 0.5;
        float dist = length(center);
        
        // 更加柔和的圆形 alpha (无硬边)
        float alphaShape = smoothstep(0.5, 0.0, dist);
        
        // 移除 discard，避免边缘锯齿
        // if (alphaShape < 0.05) discard; 

        // === index.html 的黑白配色 ===
        vec3 c_white = vec3(1.0, 1.0, 1.0); 
        vec3 c_black = vec3(0.05, 0.05, 0.05); 

        float n = vNoise * 0.5 + 0.5; 
        float slowCycle = sin(uTime * 0.15) * 0.5 + 0.5;
        
        // 增大混合过渡区，使得颜色变化不那么剧烈
        float mixVal = smoothstep(slowCycle - 0.4, slowCycle + 0.4, n);
        
        vec3 finalColor = mix(c_black, c_white, mixVal);

        // 降低整体透明度，让粒子堆积出体积感而不这遮挡太快
        float finalAlpha = alphaShape * 0.4; 
        
        gl_FragColor = vec4(finalColor, finalAlpha);

        #include <fog_fragment>
    }
`;
