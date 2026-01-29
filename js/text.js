let textElement = null;
let isAIResponseMode = false; // 是否正在显示 AI 回复

let disclaimerContent = [
    "本產品基於傳統周易哲學與現代隨機算法生成，僅供娛樂與心理療癒，不作為現實決策依據。",
    "請相信科學，理性生活。"
];

let defaultContent = [
    "想像焦慮是一滴墨入水，被巨大的空白稀釋、消解...",
    "知其白，守其黑，為天下式。",
    `<span class="hex-highlight">既濟 · Completion</span>黑白咬合，陰陽歸位。能量處於完美的平衡。`,
    "在這一張巨大的灰色宣紙上，當下的困擾不過是一個噪點。",
    `<span class="hex-highlight">屯 · Beginnings</span>混沌之中，秩序正在萌芽。`,
    "萬物負陰而抱陽，沖氣以為和。"
];

let defaultIndex = 0;
let disclaimerIndex = 0;
let isDisclaimerMode = true; // 初始为免责声明模式
let currentTimeout = null;

const TextConfig = {
    desktop: {
        disclaimer: {
            fontSize: "14px",
            fontFamily: "inherit"
        },
        normal: {
            fontSize: "22px",
            fontFamily: '"Garamond", "Georgia", "Times New Roman", "KaiTi", "STKaiti", serif'
        }
    },
    mobile: {
        disclaimer: {
            fontSize: "14px",
            fontFamily: "inherit"
        },
        normal: {
            fontSize: "16px",
            fontFamily: '"Garamond", "Georgia", "Times New Roman", "KaiTi", "STKaiti", serif'
        }
    }
};

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

    // 1. 确定内容和字体
    let content = "";
    let stayTime = 6000; // 默认停留 6 秒
    let fadeOutWait = 1600; // 默认淡出后等待 1.6 秒

    const isMobile = window.innerWidth < 768;
    const config = isMobile ? TextConfig.mobile : TextConfig.desktop;

    if (isDisclaimerMode) {
        // --- 免责声明模式 ---
        content = disclaimerContent[disclaimerIndex];
        textElement.style.fontFamily = config.disclaimer.fontFamily;
        textElement.style.fontSize = config.disclaimer.fontSize;
    } else {
        // --- 正常轮播模式 ---
        content = defaultContent[defaultIndex];
        textElement.style.fontFamily = config.normal.fontFamily;
        textElement.style.fontSize = config.normal.fontSize;
    }

    textElement.innerHTML = content;

    // 2. 淡入
    textElement.classList.add('visible');

    // 3. 停留
    currentTimeout = setTimeout(() => {
        // 4. 淡出
        textElement.classList.remove('visible');

        // 特殊逻辑：如果是免责声明的最后一句，淡出后要等待更久
        if (isDisclaimerMode && disclaimerIndex === disclaimerContent.length - 1) {
            fadeOutWait = 3000; // 长等待 3 秒
        }

        // 5. 等待淡出动画结束
        currentTimeout = setTimeout(() => {
            if (isDisclaimerMode) {
                disclaimerIndex++;
                if (disclaimerIndex >= disclaimerContent.length) {
                    // 免责声明播放完毕，切换到正常模式
                    isDisclaimerMode = false;
                    defaultIndex = 0;
                }
            } else {
                defaultIndex = (defaultIndex + 1) % defaultContent.length;
            }
            startDefaultCycle(getColor); // 递归调用
        }, fadeOutWait);

    }, stayTime);
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

    const isMobile = window.innerWidth < 768;
    const config = isMobile ? TextConfig.mobile : TextConfig.desktop;

    // 确保使用正常模式的字体样式
    textElement.style.fontFamily = config.normal.fontFamily;
    textElement.style.fontSize = config.normal.fontSize;

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
        textElement.innerHTML = "感應天道...<br>推演天機...";
        textElement.classList.add('visible');
    }, 1000);
}