// api/index.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

// 从环境变量获取 Key (稍后在 Vercel 后台填)
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

export default async function handler(req, res) {
  // 1. 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { question } = req.body;

    // 2. 读取书籍内容 (一次性读取，因为 Flash 模型记性大，直接塞文本最稳定)
    // Vercel 环境中，文件路径需要用 path.join
    const bookPath = path.join(process.cwd(), 'api', 'book.txt'); 
    const bookContent = fs.readFileSync(bookPath, 'utf-8');

    // 3. 准备模型
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    // 4. 核心 Prompt
    const prompt = `
      你是一位精通《断易天机》的赛博算命大师。
      请严格基于以下书籍内容回答用户问题。
      如果书里没说，就说"天机不可泄露"。
      语言风格：神秘、赛博朋克。
      
      ---书籍内容开始---
      ${bookContent.substring(0, 800000)} // 限制长度防止超标，但Flash通常能吃下整本书
      ---书籍内容结束---

      用户的问题是：${question}
    `;

    // 5. 发送给 Google
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // 6. 把结果返回给前端
    return res.status(200).json({ answer: text });

  } catch (error) {
    console.error("后端报错:", error);
    return res.status(500).json({ error: "天机演算失败，请稍后再试。" });
  }
}