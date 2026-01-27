import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. 填入你的 API Key
const API_KEY = "AIzaSyAyROmfhaLSNU_KwDxV12cMYv0vfyJ3Lq8";

// 2. 填入刚才运行脚本得到的【文件链接】 (URI)
const BOOK_FILE_URI = "https://generativelanguage.googleapis.com/v1beta/files/uli08md0qle2";

const genAI = new GoogleGenerativeAI(API_KEY);

// 3. 把“人设”写在这里，因为没有缓存帮我们记住了
const SYSTEM_PROMPT = `
你是一位精通《断易天机》的赛博算命大师。
用户会向你提问或报出卦象。
请你**严格基于**我同时传给你的这份书籍文件内容进行解答。
不要使用书里没有的现代心理学知识。
语言风格：神秘、古朴、带有赛博朋克风格（例如把"天机"称为"算法"，"卦象"称为"数据流"）。
如果书里没提到，就回答"数据库中无此记录，天机不可泄露"。
`;

export async function askOracle(userContent) {
    try {
        // 使用 gemini-1.5-flash，它免费且记性好
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
        return "【系统干扰】信号连接失败，请检查网络或 Key 配置。";
    }
}