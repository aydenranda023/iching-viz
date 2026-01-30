let container = null;
let textarea = null;
let measure = null;
let scrollbar = null;
let thumb = null;

const MAX_ROWS = 5;

const InputConfig = {
    desktop: {
        fontSize: '16px',
        lineHeight: 24, // 16px * 1.5
        paddingY: 24    // 12px * 2
    },
    mobile: {
        fontSize: '16px',
        lineHeight: 24,
        paddingY: 24
    }
};

export function initInputUI() {
    container = document.getElementById('input-ui-container');
    textarea = container.querySelector('.input-box');
    measure = document.getElementById('input-measure');
    scrollbar = document.getElementById('custom-scrollbar');
    thumb = document.getElementById('custom-scrollbar-thumb');

    textarea.addEventListener('input', () => {
        adjustSize();
        updateScrollbar();
    });

    textarea.addEventListener('scroll', updateScrollbar);

    // 初始化大小
    adjustSize();

    // 阻止事件冒泡，防止点击输入框触发 3D 场景交互
    const stopProp = (e) => e.stopPropagation();
    textarea.addEventListener('mousedown', stopProp);
    textarea.addEventListener('touchstart', stopProp);
    textarea.addEventListener('click', stopProp);

    // 应用初始样式
    applyStyles();
}

function applyStyles() {
    if (!textarea) return;
    const isMobile = window.innerWidth < 768;
    const config = isMobile ? InputConfig.mobile : InputConfig.desktop;

    textarea.style.fontSize = config.fontSize;
    textarea.style.lineHeight = config.lineHeight + 'px';
    textarea.style.paddingTop = (config.paddingY / 2) + 'px';
    textarea.style.paddingBottom = (config.paddingY / 2) + 'px';
}

function adjustSize() {
    if (!textarea || !measure) return;

    // 1. 横向增长逻辑
    // 先计算 Placeholder 的宽度作为最小宽度
    measure.textContent = textarea.placeholder;
    const minWidth = measure.offsetWidth + 40; // padding 补偿

    // 再计算当前内容的宽度
    measure.textContent = textarea.value;
    const currentTextWidth = measure.offsetWidth + 40;

    // 最终宽度取二者最大值，但不能超过最大限制
    const finalWidth = Math.max(minWidth, currentTextWidth);
    const maxWidth = window.innerWidth * 0.666;

    if (finalWidth < maxWidth) {
        textarea.style.width = finalWidth + 'px';
    } else {
        textarea.style.width = maxWidth + 'px';
    }

    // 2. 纵向增长逻辑 (逐行)
    const isMobile = window.innerWidth < 768;
    const config = isMobile ? InputConfig.mobile : InputConfig.desktop;

    // 确保样式同步（以防窗口大小改变）
    applyStyles();

    const singleLineHeight = config.lineHeight + config.paddingY;
    const maxHeight = config.lineHeight * MAX_ROWS + config.paddingY;

    // 获取真实的内容高度
    textarea.style.height = 'auto';
    let scrollHeight = textarea.scrollHeight;

    // 针对空内容的特殊对齐逻辑
    if (!textarea.value) {
        textarea.style.height = singleLineHeight + 'px';
        textarea.style.overflowY = 'hidden';
        if (scrollbar) scrollbar.style.opacity = '0';
        return;
    }

    if (scrollHeight <= maxHeight + 2) { // 给予一点余量
        // 内容高度小于最大高度时，设为内容高度（如果是空则为单行高）
        const targetH = Math.max(singleLineHeight, scrollHeight);
        textarea.style.height = targetH + 'px';
        textarea.style.overflowY = 'hidden';
        if (scrollbar) scrollbar.style.opacity = '0';
    } else {
        // 超过最大高度，固定高度并开启滚动
        textarea.style.height = maxHeight + 'px';
        textarea.style.overflowY = 'scroll';
        if (scrollbar) scrollbar.style.opacity = '1';
    }
}

function updateScrollbar() {
    if (!textarea || !scrollbar || !thumb) return;

    const visibleHeight = textarea.clientHeight;
    const contentHeight = textarea.scrollHeight;
    const scrollTop = textarea.scrollTop;

    if (contentHeight <= visibleHeight + 2) { // 2px 冗余
        scrollbar.style.opacity = '0';
        return;
    }

    scrollbar.style.opacity = '1';

    // 计算滑块高度比例
    const trackHeight = scrollbar.clientHeight;
    const thumbHeight = Math.max(20, trackHeight * (visibleHeight / contentHeight));
    thumb.style.height = thumbHeight + 'px';

    // 计算滑块位置
    const scrollRatio = scrollTop / (contentHeight - visibleHeight);
    const thumbTop = scrollRatio * (trackHeight - thumbHeight);
    thumb.style.top = thumbTop + 'px';
}

/**
 * 每一帧调用
 * @param {number} cameraDist 当前相机到目标点的距离
 */
export function updateInputUI(cameraDist) {
    if (!container) return;

    // 处理淡入淡出逻辑
    if (cameraDist < 0.9) {
        if (!container.classList.contains('visible')) {
            container.classList.add('visible');
        }
    } else {
        if (container.classList.contains('visible')) {
            container.classList.remove('visible');
        }
    }
}

// --- 新增：供 main.js 调用的接口 ---

export function getInputContent() {
    if (!textarea) return "";
    return textarea.value.trim();
}

export function resetInputUI() {
    if (!textarea) return;
    textarea.value = '';
    textarea.blur(); // 收起键盘
    adjustSize();    // 重置大小
    // 如果需要，可以在这里隐藏输入框
    // if (container) container.classList.remove('visible');
}