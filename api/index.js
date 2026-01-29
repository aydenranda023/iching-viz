// api/index.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from 'fs';
import path from 'path';

// Vercel 会自动从后台环境变量里读取 GOOGLE_API_KEY
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// 允许 Vercel 处理最大 10 秒的请求
export const config = {
  maxDuration: 10,
};

export default async function handler(req, res) {
  // 1. 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { question } = req.body;

    // 2. 读取书籍内容
    // process.cwd() 获取当前工作目录
    const bookPath = path.join(process.cwd(), 'api', 'book.txt');
    let bookContent = "";
    try {
      bookContent = fs.readFileSync(bookPath, 'utf-8');
    } catch (err) {
      console.error("读取书本失败:", err);
      // 如果读不到，为了不崩，给个空字符串也行，或者抛错
      return res.status(500).json({ error: "服务器内部错误：古籍丢失" });
    }

    // 3. 准备模型 (使用 flash-lite 模型，省钱又快)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    // 4. 提示词工程
    const prompt = `
      【角色设定】
      你是一位深谙《断易天机》与周易哲学的国学文化学者，也是一位温暖睿智的心灵疗愈师。你不再进行预知未来的“算命”，而是通过解读卦象中的哲学隐喻，为用户当下的困惑提供心理疏导和行动建议。

      【回答原则】
      1. 合规性重中之重：严禁出现“算命”、“吉凶预测”、“迷信”、“鬼神”、“血光之灾”等违规表述。将“吉/凶”转化为“顺境/挑战”、“机遇/磨砺”。
      2. 依据原典：严格基于我提供的《断易天机》书籍内容提取卦象含义，不要编造。
      3. 疗愈风格：语言需典雅、古朴、温暖。多用比喻，将卦象与自然意象（如山、水、风、雷）联系起来，引导用户向内关照。
      4. 未知处理：如果书里没提到相关内容，请用“此卦意象深远，需待机缘自现”来委婉回答。

      【格式要求】 (重要！)
      1. **输出纯文本**：不要使用任何 Markdown 格式（如 **、#、- 等符号）。
      2. **不要使用星号**：标题也不要加星号或加粗，直接换行即可。
      3. **分段清晰**：段落之间用换行符分隔。

      【回答结构】
      第一部分：卦象意境
      （在这里用优美的古文或现代散文诗句描述该卦的画面感，例如：“如舟行江上，顺风而动...”）

      第二部分：古籍新解
      （在这里引用《断易天机》中的核心断语，但要用现代心理学或管理学视角进行翻译，例如将“官鬼”解释为“压力或责任”）

      第三部分：当下指引
      （在这里针对用户的问题，给出一个温暖、务实的建议，侧重于心态调整和修身养性）
      
      ---书籍内容开始---
      ${bookContent.substring(0, 800000)} 
      ---书籍内容结束---

      用户的问题是：${question}
    `;

    // 5. 发送给 Google
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // 6. 返回结果
    return res.status(200).json({ answer: text });

  } catch (error) {
    console.error("后端报错:", error);
    return res.status(500).json({ error: "天机演算失败，服务器连接不稳定" });
  }
}