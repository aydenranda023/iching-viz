import * as THREE from 'three';

let isGyroEnabled = false;
let initialBeta = 0;
let initialGamma = 0;
let targetX = 0;
let targetY = 0;

// 我们需要引用的对象
let particleSystemRef = null;
let baguaRef = null;

export function initGyro(particleSystem, baguaSystem) {
    particleSystemRef = particleSystem;
    baguaRef = baguaSystem;

    // 检查是否支持 DeviceOrientation
    if (window.DeviceOrientationEvent && typeof window.DeviceOrientationEvent.requestPermission === 'function') {
        // iOS 13+ 需要权限
        createPermissionButton();
    } else if (window.DeviceOrientationEvent) {
        // Android 或旧版 iOS 直接监听
        window.addEventListener('deviceorientation', handleOrientation);
        isGyroEnabled = true;
    }
}

function createPermissionButton() {
    const btn = document.createElement('button');
    btn.innerText = "開啟沉浸體驗";
    btn.style.position = 'absolute';
    btn.style.bottom = '20px';
    btn.style.left = '50%';
    btn.style.transform = 'translateX(-50%)';
    btn.style.padding = '10px 20px';
    btn.style.zIndex = '1000';
    btn.style.background = 'rgba(255, 255, 255, 0.8)';
    btn.style.border = 'none';
    btn.style.borderRadius = '20px';
    btn.style.fontFamily = 'sans-serif';
    btn.style.cursor = 'pointer';

    btn.addEventListener('click', () => {
        window.DeviceOrientationEvent.requestPermission()
            .then(response => {
                if (response === 'granted') {
                    window.addEventListener('deviceorientation', handleOrientation);
                    isGyroEnabled = true;
                    btn.style.display = 'none';
                } else {
                    alert('需要陀螺儀權限來啟用視差效果');
                }
            })
            .catch(console.error);
    });

    document.body.appendChild(btn);
}

function handleOrientation(event) {
    // beta:前后倾斜 (-180, 180)
    // gamma:左右倾斜 (-90, 90)

    // 第一次读数作为基准
    if (initialBeta === 0 && initialGamma === 0) {
        initialBeta = event.beta;
        initialGamma = event.gamma;
    }

    // 计算相对偏移
    const tiltX = (event.gamma - initialGamma); // 左右
    const tiltY = (event.beta - initialBeta);   // 前后

    // 限制范围，避免旋转过度
    // 将偏移量映射为旋转角度 (弧度)
    // 稍微缩小系数，让效果细腻
    const factor = 0.005; // 灵敏度

    targetX = tiltY * factor;
    targetY = tiltX * factor;
}

export function updateGyro() {
    if (!isGyroEnabled) return;

    // 使用简单的缓动 (Lerp) 平滑过渡
    const easing = 0.05;

    // 1. 旋转粒子系统 (World Space)
    if (particleSystemRef) {
        particleSystemRef.rotation.x += (targetX - particleSystemRef.rotation.x) * easing;
        particleSystemRef.rotation.y += (targetY - particleSystemRef.rotation.y) * easing;
    }

    // 2. 旋转八卦图 (Camera Local Space)
    // 因为 Bagua 在相机上，我们希望它随着手机倾斜产生一种"悬浮HUD"并在反方向微动的视差感?
    // 或者跟随重力保持水平?
    // 假设我们希望它也有一点视差，稍微反向动一点，或者同向动?
    // 试一下稍微反向移动，产生深度感
    if (baguaRef) {
        baguaRef.rotation.x += (targetX * 0.5 - baguaRef.rotation.x) * easing;
        baguaRef.rotation.y += (targetY * 0.5 - baguaRef.rotation.y) * easing;
    }
}
