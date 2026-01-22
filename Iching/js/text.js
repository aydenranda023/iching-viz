export function initText() {
    const textContent = [
        "知其白，守其黑，为天下式。",
        "想象焦虑是一滴墨入水，被巨大的空白稀释、消解...",
        `<span class="hex-highlight">既济 · Completion</span>黑白咬合，阴阳归位。能量处于完美的平衡。`,
        "在这一张巨大的灰色宣纸上，当下的困扰不过是一个噪点。",
        `<span class="hex-highlight">屯 · Beginnings</span>混沌之中，秩序正在萌芽。`,
        "万物负阴而抱阳，冲气以为和。"
    ];

    let textIndex = 0;
    const textElement = document.getElementById('dynamic-text');

    // 初始显示
    textElement.innerHTML = textContent[0];

    // 定时轮播 (12秒周期)
    setInterval(() => {
        textIndex = (textIndex + 1) % textContent.length;
        // 这里只是更新内容，淡入淡出由 CSS animation 处理
        // 为了配合 CSS 动画的 fadeCycle，我们在 opacity 接近 0 时切换文字
        // 动画总长 12s, 0% 和 100% 是 opacity:0
        // 所以我们在周期开始时更新即可
        setTimeout(() => {
            textElement.innerHTML = textContent[textIndex];
        }, 1000); 
    }, 12000); 
}