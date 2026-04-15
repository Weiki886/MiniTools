const fileInput = document.getElementById('fileInput');
const canvas = document.getElementById('imageCanvas');
const ctx = canvas.getContext('2d');
const colorInfo = document.getElementById('colorInfo');
const colorPreview = document.getElementById('colorPreview');
const hexValue = document.getElementById('hexValue');
const rgbValue = document.getElementById('rgbValue');
const hslValue = document.getElementById('hslValue');
const coordinates = document.getElementById('coordinates');

fileInput.addEventListener('change', handleFileSelect);
canvas.addEventListener('click', getColorAtPosition);

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                // 增大图片显示区域的尺寸限制
                const maxWidth = 1000;
                const maxHeight = 800;
                let { width, height } = img;
                
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                
                if (height > maxHeight) {
                    width = (width * maxHeight) / height;
                    height = maxHeight;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                // 绘制图片
                ctx.drawImage(img, 0, 0, width, height);
                
                // 显示canvas和颜色信息面板
                canvas.classList.remove('hidden');
                colorInfo.classList.remove('hidden');
                
                // 重置颜色预览
                colorPreview.style.backgroundColor = '#f0f0f0';
                colorPreview.style.color = '#666';
                colorPreview.textContent = '点击图片获取颜色';
                hexValue.value = '';
                rgbValue.value = '';
                hslValue.value = '';
                coordinates.textContent = '坐标: (0, 0)';
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

function getColorAtPosition(event) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) * (canvas.width / rect.width));
    const y = Math.floor((event.clientY - rect.top) * (canvas.height / rect.height));
    
    // 获取像素数据
    const imageData = ctx.getImageData(x, y, 1, 1);
    const pixel = imageData.data;
    
    const r = pixel[0];
    const g = pixel[1];
    const b = pixel[2];
    const a = pixel[3];
    
    // 更新坐标显示
    coordinates.textContent = `坐标: (${x}, ${y})`;
    
    // 转换为不同格式
    const hex = rgbToHex(r, g, b);
    const rgb = `rgb(${r}, ${g}, ${b})`;
    const hsl = rgbToHsl(r, g, b);
    
    // 更新显示
    updateColorDisplay(hex, rgb, hsl, r, g, b);
}

function updateColorDisplay(hex, rgb, hsl, r, g, b) {
    // 更新颜色预览
    colorPreview.style.backgroundColor = hex;
    colorPreview.textContent = hex;
    
    // 根据颜色明度调整文字颜色
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    colorPreview.style.color = brightness > 128 ? '#000' : '#fff';
    
    // 更新颜色值
    hexValue.value = hex;
    rgbValue.value = rgb;
    hslValue.value = hsl;
}

function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
        h = s = 0; // 灰色
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    
    return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

function copyToClipboard(element) {
    element.select();
    element.setSelectionRange(0, 99999); // 兼容移动设备
    
    try {
        document.execCommand('copy');
        
        // 显示复制成功的反馈
        const originalBg = element.style.backgroundColor;
        element.style.backgroundColor = '#d4edda';
        element.style.borderColor = '#c3e6cb';
        
        setTimeout(() => {
            element.style.backgroundColor = originalBg;
            element.style.borderColor = '#e2e8f0';
        }, 1000);
        
        // 可选：显示提示消息
        showToast('颜色代码已复制到剪贴板！');
    } catch (err) {
        console.error('复制失败:', err);
        showToast('复制失败，请手动选择并复制');
    }
}

function showToast(message) {
    // 创建临时提示
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4a5568;
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        z-index: 1000;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease;
    `;
    
    // 添加动画样式
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
        style.remove();
    }, 3000);
}

// 支持拖拽上传
const container = document.querySelector('.main-content');

container.addEventListener('dragover', (e) => {
    e.preventDefault();
    container.style.backgroundColor = '#f7fafc';
});

container.addEventListener('dragleave', (e) => {
    e.preventDefault();
    container.style.backgroundColor = 'white';
});

container.addEventListener('drop', (e) => {
    e.preventDefault();
    container.style.backgroundColor = 'white';
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
        fileInput.files = files;
        handleFileSelect({ target: { files: files } });
    }
});