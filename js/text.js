let textElement = null;
let isAIResponseMode = false; // 是否正在显示 AI 回复
let defaultContent = [
    "本产品基于传统周易哲学与现代随机算法生成，仅供娱乐与心理疗愈，不作为现实决策依据。",
    "请相信科学，理性生活。",
    "想象焦虑是一滴墨入水，被巨大的空白稀释、消解...",
    "知其白，守其黑，为天下式。",
    `<span class="hex-highlight">既济 · Completion</span>黑白咬合，阴阳归位。能量处于完美的平衡。`,
    "在这一张巨大的灰色宣纸上，当下的困扰不过是一个噪点。",
    `<span class="hex-highlight">屯 · Beginnings</span>混沌之中，秩序正在萌芽。`,
    "万物负阴而抱阳，冲气以为和。"
];
let defaultIndex = 0;
let currentTimeout = null;

export function initText(getColor) {
    textElement = document.getElementById('dynamic-text');
    startDefaultCycle(getColor);
}

// 播放默认轮播
async function startDefaultCycle(getColor) {
    if (isAIResponseMode) return;

    // 0. 设置颜色
    if (getColor && textElement) {
        textElement.style.color = getColor();
    }

    // 1. 设置内容
    textElement.innerHTML = defaultContent[defaultIndex];

    // 2. 淡入
    textElement.classList.add('visible');

    // 3. 停留 6 秒 (使用 setTimeout 方便打断)
    currentTimeout = setTimeout(() => {
        // 4. 淡出
        textElement.classList.remove('visible');

        // 5. 等待淡出动画结束 (1.6s)
        currentTimeout = setTimeout(() => {
            defaultIndex = (defaultIndex + 1) % defaultContent.length;
            startDefaultCycle(getColor); // 递归调用
        }, 1600);

    }, 6000);
}

// --- 新增：显示 AI 回复 (一段一段显示) ---
export async function showAIResponse(fullText) {
    isAIResponseMode = true;

    // 清除当前的轮播定时器
    if (currentTimeout) clearTimeout(currentTimeout);

    // 立即淡出当前文字
    textElement.classList.remove('visible');

    // 等待淡出
    await new Promise(r => setTimeout(r, 1000));

    // 预处理文字：按句号、感叹号、换行符分割，但保留标点
    // 过滤空行
    const segments = fullText
        .split(/([。！？\n]+)/)
        .reduce((acc, curr, i) => {
            if (i % 2 === 0) {
                if (curr.trim()) acc.push(curr);
            } else {
                if (acc.length > 0) acc[acc.length - 1] += curr;
            }
            return acc;
        }, []);

    // 如果分割失败（比如全是英文没有标点），就当一段
    if (segments.length === 0 && fullText.trim()) segments.push(fullText);

    // 循环播放每一段
    for (let i = 0; i < segments.length; i++) {
        // 设置为黑色或深色，确保 AI 回复清晰可见（或者你可以传入 getColor）
        textElement.style.color = '#333';
        textElement.innerHTML = segments[i];

        textElement.classList.add('visible');

        // 阅读时间根据字数动态调整 (基础 3秒 + 每字 0.1秒)
        const readTime = 3000 + segments[i].length * 100;
        await new Promise(r => setTimeout(r, readTime));

        textElement.classList.remove('visible');
        await new Promise(r => setTimeout(r, 1500));
    }

    // 播放完毕，恢复默认轮播
    isAIResponseMode = false;
    defaultIndex = 0; // 重置轮播
    startDefaultCycle(null); // 这里可能需要重新传入 getColor，或者在 main.js 里处理
}

// 显示加载状态
export function showLoading() {
    isAIResponseMode = true;
    if (currentTimeout) clearTimeout(currentTimeout);
    textElement.classList.remove('visible');

    setTimeout(() => {
        textElement.style.color = '#333';
        textElement.innerHTML = "正在连接阿卡西记录...<br>演算中...";
        textElement.classList.add('visible');
    }, 1000);
}