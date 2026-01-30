let textElement = null;
let isAIResponseMode = false; // 是否正在显示 AI 回复

let disclaimerContent = [
    "本產品基於傳統周易哲學與現代隨機算法生成，僅供娛樂與心理療癒，不作為現實決策依據。",
    "請相信科學，理性生活。",
    "演算結果如過眼雲煙，閱後即焚。所有數據絕不留存，請君寬心。"
];

let defaultContent = [
    `<span class="hex-highlight">乾 · The Creative</span>天行健，君子以自強不息。生生不息的能量，是創造萬物的源頭。`,
    `<span class="hex-highlight">坤 · The Receptive</span>地勢坤，君子以厚德載物。包容一切變數，方能承載無限可能。`,
    `<span class="hex-highlight">屯 · Beginnings</span>混沌之中，秩序正在萌芽。萬事開頭難，但生機就在其中。`,
    `<span class="hex-highlight">既濟 · Completion</span>黑白咬合，陰陽歸位。能量處於完美的平衡，但也需防微杜漸。`,
    `<span class="hex-highlight">未濟 · Before Completion</span>火水未濟。結束是另一種開始，不完美才是生生不息的動力。`,
    `<span class="hex-highlight">泰 · Peace</span>天地交而萬物通。當下的阻滯消散，溝通與流動將帶來轉機。`,
    `<span class="hex-highlight">復 · Return</span>雷在地中。寒冬已過，微弱的生機正在地底震動，靜候春雷。`,
    `<span class="hex-highlight">鼎 · The Cauldron</span>革故鼎新。舊的形態正在熔化，新的秩序即將鑄成，此乃煉化之象。`,

    // 视觉隐喻
    "在這一張巨大的灰色宣紙上，當下的困擾不過是一個噪點。",
    "每一顆游離的粒子，都是一次未被定義的呼吸。",
    "聚散終有時。此刻的紛亂，不過是下一場重組的前奏。",

    // 道家心法
    "知其白，守其黑，為天下式。",
    "萬物負陰而抱陽，沖氣以為和。",
    "致虛極，守靜篤。萬物並作，吾以觀復。",
    "上善若水。水善利萬物而不爭，處眾人之所惡，故幾於道。",

    // 療癒指引
    "流水不爭先，爭的是滔滔不絕。",
    "飄風不終朝，驟雨不終日。困境不會是永恆的狀態。",
    "亂麻亦是經緯。給時間一點時間，讓線條自己找到歸處。",
    "虛空並非一無所有，它包含了萬物生成的可能。"
];

let introContent = "想像焦慮是一滴墨入水，被巨大的空白稀釋、消解...";

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

// --- 闲置提示逻辑 ---
let lastInteractionTime = Date.now();
// let hasShownIdleHint = false; // 已废弃，改用时间间隔控制
let lastHintTime = 0; // 上次显示提示的时间
let forceHintNext = false; // 强制下一次显示提示（用于免责声明后）
let gestureHintElement = null; // 手势提示元素

// 随机播放控制
let recentIndices = []; // 最近播放过的索引
let showIntroNext = false; // 是否在下次正常播放时显示引导语

export function notifyInteraction() {
    lastInteractionTime = Date.now();
    // hasShownIdleHint = false; 

    // 立即隐藏手势提示
    if (!gestureHintElement) gestureHintElement = document.getElementById('gesture-hint');
    if (gestureHintElement) gestureHintElement.classList.remove('visible');
}

// 播放默认轮播
async function startDefaultCycle(getColor) {
    if (isAIResponseMode) return;

    // 初始化元素引用
    if (!gestureHintElement) gestureHintElement = document.getElementById('gesture-hint');

    // 0. 设置颜色
    if (getColor && textElement) {
        textElement.style.color = getColor();
    }

    // 1. 确定内容和字体
    let content = "";
    let stayTime = 6000; // 默认停留 6 秒
    let fadeOutWait = 1600; // 默认淡出后等待 1.6 秒
    let didShowHint = false; // 本次是否显示了提示

    const isMobile = window.innerWidth < 768;
    const config = isMobile ? TextConfig.mobile : TextConfig.desktop;

    // --- 闲置检测 ---
    const now = Date.now();
    const idleTime = now - lastInteractionTime;
    const isIdle = idleTime > 30000; // 30秒
    const timeSinceHint = now - lastHintTime;

    // 判定是否显示提示：
    // 1. 非免责声明模式
    // 2. 强制显示（刚播完免责声明） 或 （闲置已久 且 距离上次提示超过30秒）
    let shouldShowHint = !isDisclaimerMode && (forceHintNext || (isIdle && timeSinceHint > 60000));

    if (shouldShowHint) {
        content = "潛入虛空幻境，書寫心中所惑。";
        textElement.style.fontFamily = config.normal.fontFamily;
        textElement.style.fontSize = config.normal.fontSize;

        didShowHint = true;
        lastHintTime = now;
        forceHintNext = false; // 消耗掉强制标志

        // --- 增强：显示手势提示 ---
        stayTime = 10000; // 延长到 10 秒
        if (!gestureHintElement) gestureHintElement = document.getElementById('gesture-hint');
        if (gestureHintElement) gestureHintElement.classList.add('visible');

    } else {
        // --- 正常逻辑：确保手势提示关闭 ---
        if (gestureHintElement) gestureHintElement.classList.remove('visible');

        if (isDisclaimerMode) {
            // --- 免责声明模式 ---
            content = disclaimerContent[disclaimerIndex];
            textElement.style.fontFamily = config.disclaimer.fontFamily;
            textElement.style.fontSize = config.disclaimer.fontSize;
        } else {
            // --- 正常轮播模式 ---
            // 优先插播引导语
            if (showIntroNext) {
                content = introContent;
                textElement.style.fontFamily = config.normal.fontFamily;
                textElement.style.fontSize = config.normal.fontSize;
                showIntroNext = false; // 消耗掉引导语标志
            } else {
                content = defaultContent[defaultIndex];
                textElement.style.fontFamily = config.normal.fontFamily;
                textElement.style.fontSize = config.normal.fontSize;
            }
        }
    }

    textElement.innerHTML = content;

    // 2. 淡入
    textElement.classList.add('visible');

    // 3. 停留
    currentTimeout = setTimeout(() => {
        // 4. 淡出
        textElement.classList.remove('visible');
        // 也要淡出手势提示 (如果存在)
        if (gestureHintElement) gestureHintElement.classList.remove('visible');

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
                    forceHintNext = true; // 关键：免责声明结束后，立刻强制显示一次提示
                    // 重置随机逻辑状态
                    showIntroNext = true; // 必须紧接着显示引导语
                    recentIndices = [];
                }
            } else {
                // 如果刚刚显示的是闲置提示，就不增加 defaultIndex
                // 如果显示的是正常内容，则切换下一句
                if (!didShowHint) {
                    // 随机逻辑
                    // 随机选择，但也需避免重复最近的
                    let newIndex;
                    let attempts = 0;
                    do {
                        newIndex = Math.floor(Math.random() * defaultContent.length);
                        attempts++;
                    } while (
                        (recentIndices.includes(newIndex) || newIndex === defaultIndex) &&
                        attempts < 20 // 防止死循环
                    );
                    defaultIndex = newIndex;


                    // 记录最近播放的索引 (保留2个)
                    recentIndices.push(defaultIndex);
                    if (recentIndices.length > 2) recentIndices.shift();
                }
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

    // 0. 设置每一句的字体样式 (与正文一致)
    const isMobile = window.innerWidth < 768;
    const config = isMobile ? TextConfig.mobile : TextConfig.desktop;
    textElement.style.fontFamily = config.normal.fontFamily;
    textElement.style.fontSize = config.normal.fontSize;
    textElement.style.color = '#333';

    // 等待上一句淡出
    await new Promise(r => setTimeout(r, 1600));

    // 1. 第一句：感应天道
    textElement.innerHTML = "感應天道...";
    textElement.classList.add('visible');

    // 显示 3 秒
    await new Promise(r => setTimeout(r, 3000));
    textElement.classList.remove('visible');

    // 淡出等待 1.6 秒
    await new Promise(r => setTimeout(r, 1600));

    // 2. 第二句：推演天机
    textElement.innerHTML = "推演天機...";
    textElement.classList.add('visible');

    // 显示 3 秒
    await new Promise(r => setTimeout(r, 3000));
    textElement.classList.remove('visible');

    // 淡出等待 1.6 秒
    await new Promise(r => setTimeout(r, 1600));

    // 3. 加载动画结束，解锁
    isLoadingSequenceActive = false;

    // 此时如果缓冲队列里已经有 AI 返回的内容了，立即开始播放
    if (displayQueue.length > 0) {
        processDisplayQueue();
    }
}