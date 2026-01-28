// api/index.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

// Vercel 会自动从后台环境变量里读取 GOOGLE_API_KEY
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// 允许 Vercel 处理最大 10 秒的请求 (Serverless Function 限制)
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
    // 在 Vercel 环境中，process.cwd() 是项目根目录
    const bookPath = path.join(process.cwd(), 'api', 'book.txt'); 
    let bookContent = "";
    try {
        bookContent = fs.readFileSync(bookPath, 'utf-8');
    } catch (err) {
        console.error("读取书本失败:", err);
        return res.status(500).json({ error: "服务器内部错误：古籍丢失" });
    }

    // 3. 准备模型 (使用 flash 模型，速度快)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    // 4. 提示词工程
    const prompt = `
      你是一位精通《断易天机》的赛博算命大师。
      请严格基于以下书籍内容回答用户问题。
      如果书里没说，就说"天机不可泄露"。
      语言风格：神秘、赛博朋克。
      
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