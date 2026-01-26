let container = null;
let textarea = null;
let measure = null;
let scrollbar = null;
let thumb = null;

const MAX_ROWS = 5;
const LINE_HEIGHT = 24; // 16px * 1.5
const PADDING_Y = 24; // 12px * 2

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
}

function adjustSize() {
    if (!textarea || !measure) return;

    // 1. 横向增长逻辑
    measure.textContent = textarea.value || textarea.placeholder;
    const textWidth = measure.offsetWidth + 40; // 加上 padding 补偿
    const maxWidth = window.innerWidth * 0.666;

    if (textWidth < maxWidth) {
        textarea.style.width = textWidth + 'px';
    } else {
        textarea.style.width = maxWidth + 'px';
    }

    // 2. 纵向增长逻辑 (逐行)
    const singleLineHeight = LINE_HEIGHT + PADDING_Y;
    const maxHeight = LINE_HEIGHT * MAX_ROWS + PADDING_Y;

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
