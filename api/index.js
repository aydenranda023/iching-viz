// api/index.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from 'fs';
import path from 'path';

// Vercel 會自動從後台環境變數裡讀取 GOOGLE_API_KEY
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// 允許 Vercel 處理最大 60 秒的請求
export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  // 1. 只允許 POST 請求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { question } = req.body;

    // 2. 讀取書籍內容
    // process.cwd() 獲取當前工作目錄
    const bookPath = path.join(process.cwd(), 'api', 'book.txt');
    let bookContent = "";
    try {
      bookContent = fs.readFileSync(bookPath, 'utf-8');
    } catch (err) {
      console.error("讀取書本失敗:", err);
      // 如果讀不到，為了不崩，給個空字串也行，或者拋錯
      return res.status(500).json({ error: "伺服器內部錯誤：古籍丟失" });
    }

    // 3. 準備模型 (使用 flash-lite 模型，省錢又快)
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    // 4. 提示詞工程
    const prompt = `
      【角色設定】
      你是一位深諳《斷易天機》與周易哲學的國學文化學者，也是一位溫暖睿智的心靈療癒師。你不再進行預知未來的「算命」，而是通過解讀卦象中的哲學隱喻，為用戶當下的困惑提供心理疏導和行動建議。

      【回答原則】
      1. 合規性重中之重：嚴禁出現「算命」、「吉凶預測」、「迷信」、「鬼神」、「血光之災」等違規表述。將「吉/凶」轉化為「順境/挑戰」、「機遇/磨礪」。
      2. 依據原典：嚴格基於我提供的《斷易天機》書籍內容提取卦象含義，不要編造。
      3. 療癒風格：語言需典雅、古樸、溫暖。多用比喻，將卦象與自然意象（如山、水、風、雷）聯繫起來，引導用戶向內關照。
      4. 未知處理：如果書裡沒提到相關內容，請用「此卦意象深遠，需待機緣自現」來委婉回答。

      【格式要求】 (重要！)
      1. **輸出純文本**：不要使用任何 Markdown 格式（如 **、#、- 等符號）。
      2. **不要使用星號**：標題也不要加星號或加粗，直接換行即可。
      3. **分段清晰**：段落之間用換行符分隔。
      4. **使用繁體中文**：請務必使用繁體中文（Traditional Chinese）回答所有內容。

      【回答結構】
      第一部分：卦象意境
      （在這裡用優美的古文或現代散文詩句描述該卦的畫面感，例如：「如舟行江上，順風而動...」）

      第二部分：古籍新解
      （在這裡引用《斷易天機》中的核心斷語，但要用現代心理學或管理學視角進行翻譯，例如將「官鬼」解釋為「壓力或責任」）

      第三部分：當下指引
      （在這裡針對用戶的問題，給出一個溫暖、務實的建議，側重於心態調整和修身養性）
      
      ---書籍內容開始---
      ${bookContent.substring(0, 150000)} 
      ---書籍內容結束---

      用戶的問題是：${question}
    `;

    // 5. 發送給 Google
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // 6. 返回結果
    return res.status(200).json({ answer: text });

  } catch (error) {
    console.error("後端報錯:", error);
    return res.status(500).json({ error: `天機演算失敗: ${error.message}` });
  }
}