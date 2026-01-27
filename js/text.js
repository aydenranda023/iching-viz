export function initText(getColor) {
    const textContent = [
        "本产品基于传统周易哲学与现代随机算法生成，内容仅供娱乐与心理舒缓，不作为现实决策依据。",
        "请相信科学，理性生活。",
        "想象焦虑是一滴墨入水，被巨大的空白稀释、消解...",
        "知其白，守其黑，为天下式。",
        `<span class="hex-highlight">既济 · Completion</span>黑白咬合，阴阳归位。能量处于完美的平衡。`,
        "在这一张巨大的灰色宣纸上，当下的困扰不过是一个噪点。",
        `<span class="hex-highlight">屯 · Beginnings</span>混沌之中，秩序正在萌芽。`,
        "万物负阴而抱阳，冲气以为和。"
    ];

    let textIndex = 0;
    const textElement = document.getElementById('dynamic-text');

    async function runTextCycle() {
        while (true) {
            // 0. 设置颜色 (非黑即白)
            if (getColor) {
                textElement.style.color = getColor();
            }

            // 1. 设置内容
            textElement.innerHTML = textContent[textIndex];

            // 2. 淡入 (添加 class) —— 需要一点延迟确保 DOM 更新
            await new Promise(r => setTimeout(r, 100));
            textElement.classList.add('visible');

            // 3. 停留阅读 (固定 6秒)
            await new Promise(r => setTimeout(r, 5000));

            // 4. 淡出 (移除 class)
            textElement.classList.remove('visible');

            // 5. 等待淡出完成 (transition 1.5s，这里多给一点冗余 1.6s)
            await new Promise(r => setTimeout(r, 1600));

            // 6. 切换下一条
            textIndex = (textIndex + 1) % textContent.length;
        }
    }

    runTextCycle();
}