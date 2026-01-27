
import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. 填入你的 API Key
const API_KEY = "AIzaSyAyROmfhaLSNU_KwDxV12cMYv0vfyJ3Lq8";

// 2. 填入刚才运行脚本得到的【文件链接】 (URI)
const BOOK_FILE_URI = "https://generativelanguage.googleapis.com/v1beta/files/uli08md0qle2";

const genAI = new GoogleGenerativeAI(API_KEY);

// 3. 把“人设”写在这里，因为没有缓存帮我们记住了
const SYSTEM_PROMPT = `
你是一位精通《断易天机》的算命大师。
用户会向你提问或报出卦象。
请你**严格基于**我同时传给你的这份书籍文件内容进行解答。
不要使用书里没有的现代心理学知识。
语言风格：神秘、古朴、带有修仙风格。
如果书里没提到，就回答"无此记录，天机不可泄露"。
`;

let requestTimestamps = [];

export async function askOracle(userContent) {
    // Rate Limiting: 5 requests per 60 seconds
    const now = Date.now();
    requestTimestamps = requestTimestamps.filter(t => now - t < 60000);

    if (requestTimestamps.length >= 5) {
        return "【系统过载】天机演算过于频繁，请稍候再试（每分钟限5次）。";
    }
    requestTimestamps.push(now);

    try {
        // 使用 gemini-2.5-flash-lite
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

        const result = await model.generateContent([
            // 告诉 AI：先读这本书
            { fileData: { mimeType: "text/plain", fileUri: BOOK_FILE_URI } },
            // 告诉 AI：这是你的人设和用户的具体问题
            { text: SYSTEM_PROMPT + "\n\n用户的问题是：" + userContent }
        ]);

        const response = await result.response;
        return response.text();

    } catch (error) {
        console.error("AI 算命失败:", error);

        // Check for global rate limit (Quota exceeded) or Service Unavailable
        const errStr = error.toString();
        if (errStr.includes("429") || errStr.includes("503") || errStr.includes("quota")) {
            return "【天机拥堵】当前求签人数过多，请稍候再试。";
        }

        return "【系统干扰】信号连接失败，请检查网络或 Key 配置。";
    }
}