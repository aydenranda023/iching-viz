let textElement = null;
let isAIResponseMode = false; // 是否正在显示 AI 回复

let disclaimerContent = [
    "本產品基於傳統周易哲學與現代隨機算法生成，僅供娛樂與心理療癒，不作為現實決策依據。",
    "請相信科學，理性生活。",
    "演算結果如過眼雲煙，閱後即焚。所有數據絕不留存，請君寬心。"
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
            fontSize: "16px",
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

// --- 流式新增：流式緩衝區和顯示隊列 ---
let streamBuffer = "";
let displayQueue = [];
let isDisplayLoopRunning = false;
let isLoadingSequenceActive = false; // 新增：标记加载动画是否正在播放

// 接收來自後端的流式片段
export function appendAIResponse(chunk) {
    if (!chunk) return;

    // 1. 如果是第一次接收（隊列空且緩衝空且未運行），切換狀態
    if (!isAIResponseMode) {
        isAIResponseMode = true;
        if (currentTimeout) clearTimeout(currentTimeout);
        textElement.classList.remove('visible');
    }

    // 2. 追加到緩衝區
    streamBuffer += chunk;

    // 3. 嘗試提取完整句子
    // 正則：匹配 句號、問號、感嘆號、換行符。保留分隔符。
    // split技巧：使用捕獲組 () 會保留分隔符在結果數組中
    const segments = streamBuffer.split(/([。！？\n]+)/);

    // 如果 segments 長度大於 1，說明至少找到了一個分隔符
    // 注意：最後一項通常是剩餘的不完整片段，或者空字符串（如果剛好以分隔符結尾）

    // 清空緩衝區，重新構建
    streamBuffer = "";

    for (let i = 0; i < segments.length - 1; i += 2) {
        const sentence = segments[i]; // 句子內容
        const punctuation = segments[i + 1]; // 標點

        if (sentence.trim() || punctuation.trim()) {
            // 加入隊列
            displayQueue.push(sentence + punctuation);
        }
    }

    // 將剩下的部分放回緩衝區
    streamBuffer = segments[segments.length - 1];

    // 4. 嘗試啟動顯示循環
    if (!isDisplayLoopRunning) {
        processDisplayQueue();
    }
}

// 處理顯示隊列
async function processDisplayQueue() {
    // 1. 如果加载动画还在播放，绝对不开始显示 AI 内容
    //    等到加载动画结束时，会再次手动调用 processDisplayQueue
    if (isLoadingSequenceActive) return;

    if (displayQueue.length === 0) {
        // 如果隊列空了，但緩衝區還有剩（比如最後一句沒有標點，或者流結束了）
        // 這裡需要外部通知流是否結束，暫時我們先假設只要隊列空了就等待
        // 簡單優化：如果隊列空了，且流已經結束（這裡沒傳入標誌，暫且不處理，等待下一次 chunk 觸發）

        // 如果隊列空了，檢查緩衝區是否有殘留（且長時間沒更新？），這裡簡化：暫停循環
        isDisplayLoopRunning = false;

        // 【兜底邏輯】如果緩衝區裡有東西，且確實很長時間沒新數據了（流結束），應該怎麼辦？
        // 由於 appendAIResponse 無法知道流何時結束，我們通常需要一個 finishAIResponse 接口
        return;
    }

    isDisplayLoopRunning = true;
    const currentSegment = displayQueue.shift(); // 取出第一句

    const isMobile = window.innerWidth < 768;
    const config = isMobile ? TextConfig.mobile : TextConfig.desktop;

    textElement.style.fontFamily = config.normal.fontFamily;
    textElement.style.fontSize = config.normal.fontSize;
    textElement.style.color = '#333';

    textElement.innerHTML = currentSegment;
    textElement.classList.add('visible');

    // 計算閱讀時間
    // 基礎 2.5秒 + 每字 0.1秒
    // 比全量模式稍微快一點，因為流式通常是一句句來，節奏緊湊
    const readTime = 2500 + currentSegment.length * 100;

    await new Promise(r => setTimeout(r, readTime));

    textElement.classList.remove('visible');

    // 淡出間隔
    await new Promise(r => setTimeout(r, 800));

    // 遞歸處理下一句
    processDisplayQueue();
}

// 通知的接口：流結束了，把最後剩下的緩衝區也顯示出來
export function finishAIResponse() {
    if (streamBuffer.trim()) {
        displayQueue.push(streamBuffer);
        streamBuffer = "";
    }

    // 確保循環在運行
    if (!isDisplayLoopRunning) {
        processDisplayQueue();
    }

    // 監控隊列何時徹底排空，然後恢復默認輪播
    // 這裡做一個簡單的輪詢檢查
    checkQueueEmpty();
}

function checkQueueEmpty() {
    if (displayQueue.length === 0 && streamBuffer === "" && !isDisplayLoopRunning) {
        isAIResponseMode = false;
        defaultIndex = 0;
        startDefaultCycle(null);
    } else {
        setTimeout(checkQueueEmpty, 1000);
    }
}

// 舊接口改名或標記廢棄（為了兼容 main.js 調用，先留個空殼或報錯）
// 實際上 main.js 會改用 appendAIResponse，所以這裡刪除舊 showAIResponse 邏輯
export async function showAIResponse(fullText) {
    console.warn("showAIResponse deprecated in streaming mode.");
}

// 显示加载状态 (拆分为两句)
export async function showLoading() {
    isAIResponseMode = true;
    isLoadingSequenceActive = true; // 锁定，阻止 AI 内容抢播

    if (currentTimeout) clearTimeout(currentTimeout);
    textElement.classList.remove('visible');

    // 等待上一句淡出
    await new Promise(r => setTimeout(r, 1000));

    // 1. 第一句：感应天道
    textElement.style.color = '#333';
    textElement.innerHTML = "感應天道...";
    textElement.classList.add('visible');

    // 显示 2 秒
    await new Promise(r => setTimeout(r, 2000));
    textElement.classList.remove('visible');

    // 淡出等待 1 秒
    await new Promise(r => setTimeout(r, 1000));

    // 2. 第二句：推演天机
    textElement.innerHTML = "推演天機...";
    textElement.classList.add('visible');

    // 显示 2 秒
    await new Promise(r => setTimeout(r, 2000));
    textElement.classList.remove('visible');

    // 淡出等待 1 秒
    await new Promise(r => setTimeout(r, 1000));

    // 3. 加载动画结束，解锁
    isLoadingSequenceActive = false;

    // 此时如果缓冲队列里已经有 AI 返回的内容了，立即开始播放
    if (displayQueue.length > 0) {
        processDisplayQueue();
    }
}