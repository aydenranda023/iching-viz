// --- 配置区域 ---
const MAX_DAILY_USAGE = 3; // 每天限制算命 3 次
const STORAGE_KEY_DATE = 'oracle_last_date';
const STORAGE_KEY_COUNT = 'oracle_usage_count';

/**
 * 检查是否还有剩余次数
 * @returns {boolean} true=可以算, false=次数用完
 */
function checkDailyLimit() {
    const today = new Date().toDateString(); // 获取今天的日期字符串 (e.g., "Tue Jan 27 2026")
    const lastDate = localStorage.getItem(STORAGE_KEY_DATE);

    // 如果日期变了，重置计数器
    if (lastDate !== today) {
        localStorage.setItem(STORAGE_KEY_DATE, today);
        localStorage.setItem(STORAGE_KEY_COUNT, '0');
        return true;
    }

    // 获取当前已用次数
    const currentCount = parseInt(localStorage.getItem(STORAGE_KEY_COUNT) || '0');
    return currentCount < MAX_DAILY_USAGE;
}

/**
 * 增加一次使用计数
 */
function incrementUsage() {
    const currentCount = parseInt(localStorage.getItem(STORAGE_KEY_COUNT) || '0');
    localStorage.setItem(STORAGE_KEY_COUNT, (currentCount + 1).toString());
}

/**
 * 核心请求函数
 */
export async function askOracle(userContent) {
    // 1. 【限制机制】先检查今日运势余额
    if (!checkDailyLimit()) {
        console.log("今日次數已用完");
        return "【卦限已盡】一日不過三，天機不可強求。\n請靜心修整，明日再來。";
    }

    try {
        console.log("正在連接後端 API...");

        // 2. 发送请求给 Vercel 后端
        const response = await fetch('/api/index', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ question: userContent }),
        });

        // 3. 【错误反馈】处理 HTTP 错误状态
        if (!response.ok) {
            // 尝试读取后端返回的错误详情
            let errorMsg = "連接異常";
            try {
                const errData = await response.json();
                errorMsg = errData.error || response.statusText;
            } catch (e) {
                errorMsg = `HTTP Error ${response.status}`;
            }

            // 抛出带有具体信息的错误
            throw new Error(errorMsg);
        }

        // 4. 解析成功结果
        const data = await response.json();

        // 5. 扣除次数（只有成功了才扣次数）
        incrementUsage();

        return data.answer;

    } catch (error) {
        console.error("AI 請求失敗詳情:", error);

        // 6. 【错误反馈】根据不同类型的错误返回不同的话术
        const eMsg = error.message || "";

        // 场景 A: Vercel 函数超时 (通常是 Vercel 的 10秒/60秒 限制)
        if (eMsg.includes("504") || eMsg.includes("Task timed out")) {
            return "【天機演算超時】問題過於深奧，伺服器算力過載。\n請嘗試簡化您的問題。";
        }

        // 场景 B: 后端明确返回了错误 (比如 API Key 挂了)
        if (eMsg.includes("API key") || eMsg.includes("403")) {
            return `【系統核心故障】密鑰驗證失敗。\n(調試信息: ${eMsg})`;
        }

        // 场景 C: 网络断了
        if (eMsg.includes("Failed to fetch") || eMsg.includes("Network")) {
            return "【信號阻斷】無法連接到賽博空間，請檢查您的網絡連接。";
        }

        // 场景 D: 其他未知错误
        return `【系統干擾】遭遇未知異常，演算中斷。\n錯誤代碼：${eMsg.substring(0, 30)}...`;
    }
}