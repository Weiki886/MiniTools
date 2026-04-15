document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const uploadArea = document.getElementById('uploadArea');
    const imageInput = document.getElementById('imageInput');
    const mainContent = document.getElementById('mainContent');
    const originalPreview = document.getElementById('originalPreview');
    const enhancedPreview = document.getElementById('enhancedPreview');
    const fileNameInput = document.getElementById('fileName');
    const fileFormatSelect = document.getElementById('fileFormat');
    const downloadBtn = document.getElementById('downloadBtn');
    const applyEnhanceBtn = document.getElementById('applyEnhance');
    const resetEnhanceBtn = document.getElementById('resetEnhance');
    
    // Enhancement sliders and values
    const brightnessSlider = document.getElementById('brightness');
    const contrastSlider = document.getElementById('contrast');
    const sharpenSlider = document.getElementById('sharpen');
    const saturationSlider = document.getElementById('saturation');
    const colorTempSlider = document.getElementById('colorTemp');
    const exposureSlider = document.getElementById('exposure');
    const gammaSlider = document.getElementById('gamma');
    const noiseSlider = document.getElementById('noise');
    const hueSlider = document.getElementById('hue');
    
    const brightnessValue = document.getElementById('brightnessValue');
    const contrastValue = document.getElementById('contrastValue');
    const sharpenValue = document.getElementById('sharpenValue');
    const saturationValue = document.getElementById('saturationValue');
    const colorTempValue = document.getElementById('colorTempValue');
    const exposureValue = document.getElementById('exposureValue');
    const gammaValue = document.getElementById('gammaValue');
    const noiseValue = document.getElementById('noiseValue');
    const hueValue = document.getElementById('hueValue');
    
    // Variables to store original image data
    let originalImage = null;
    let originalFileName = '';
    let originalCanvas = document.createElement('canvas');
    let originalCtx = originalCanvas.getContext('2d');
    let enhancedCanvas = document.createElement('canvas');
    let enhancedCtx = enhancedCanvas.getContext('2d');
    
    // Event Listeners
    uploadArea.addEventListener('click', () => imageInput.click());
    imageInput.addEventListener('change', handleImageUpload);
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('active');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('active');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('active');
        
        if (e.dataTransfer.files.length) {
            imageInput.files = e.dataTransfer.files;
            handleImageUpload();
        }
    });
    
    // Enhancement slider event listeners
    brightnessSlider.addEventListener('input', updateSliderValue);
    contrastSlider.addEventListener('input', updateSliderValue);
    sharpenSlider.addEventListener('input', updateSliderValue);
    saturationSlider.addEventListener('input', updateSliderValue);
    colorTempSlider.addEventListener('input', updateSliderValue);
    exposureSlider.addEventListener('input', updateSliderValue);
    
    // Special handling for gamma slider to show decimal values
    gammaSlider.addEventListener('input', (e) => {
        const gammaValue = (parseInt(e.target.value) / 100).toFixed(2);
        document.getElementById('gammaValue').textContent = gammaValue;
    });
    
    noiseSlider.addEventListener('input', updateSliderValue);
    hueSlider.addEventListener('input', updateSliderValue);
    
    applyEnhanceBtn.addEventListener('click', applyEnhancement);
    resetEnhanceBtn.addEventListener('click', resetEnhancement);
    downloadBtn.addEventListener('click', downloadEnhancedImage);
    
    // Functions
    function handleImageUpload() {
        const file = imageInput.files[0];
        if (!file) return;
        
        originalFileName = file.name.split('.')[0]; // Get original filename without extension
        
        const reader = new FileReader();
        reader.onload = (e) => {
            originalImage = new Image();
            originalImage.onload = () => {
                // Display original image
                originalPreview.src = e.target.result;
                
                // Setup canvases
                originalCanvas.width = originalImage.width;
                originalCanvas.height = originalImage.height;
                enhancedCanvas.width = originalImage.width;
                enhancedCanvas.height = originalImage.height;
                
                // Draw original image on canvas
                originalCtx.drawImage(originalImage, 0, 0);
                
                // Initial enhancement (copy original)
                enhancedCtx.drawImage(originalImage, 0, 0);
                enhancedPreview.src = enhancedCanvas.toDataURL();
                
                // Show the main content area
                mainContent.style.display = 'flex';
                
                // Set default filename
                fileNameInput.placeholder = originalFileName;
            };
            originalImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    function updateSliderValue(e) {
        const slider = e.target;
        const valueElement = document.getElementById(`${slider.id}Value`);
        valueElement.textContent = slider.value;
    }
    
    function applyEnhancement() {
        if (!originalImage) return;
        
        // Get slider values
        const brightness = parseInt(brightnessSlider.value);
        const contrast = parseInt(contrastSlider.value);
        const sharpen = parseInt(sharpenSlider.value);
        const saturation = parseInt(saturationSlider.value);
        const colorTemp = parseInt(colorTempSlider.value);
        const exposure = parseInt(exposureSlider.value);
        const gamma = parseInt(gammaSlider.value) / 100;
        const noise = parseInt(noiseSlider.value);
        const hue = parseInt(hueSlider.value);
        
        // Reset canvas with original image
        enhancedCtx.drawImage(originalImage, 0, 0);
        
        // Apply filters in a meaningful order
        if (exposure !== 0) applyExposure(exposure);
        if (gamma !== 1) applyGamma(gamma);
        applyBrightnessContrast(brightness, contrast);
        if (colorTemp !== 0) applyColorTemperature(colorTemp);
        if (hue !== 0) applyHueShift(hue);
        if (saturation !== 0) applySaturation(saturation);
        if (noise > 0) applyNoiseReduction(noise);
        if (sharpen > 0) applySharpen(sharpen);
        
        // Update enhanced preview
        enhancedPreview.src = enhancedCanvas.toDataURL();
    }
    
    function resetEnhancement() {
        brightnessSlider.value = 0;
        contrastSlider.value = 0;
        sharpenSlider.value = 0;
        saturationSlider.value = 0;
        colorTempSlider.value = 0;
        exposureSlider.value = 0;
        gammaSlider.value = 100;
        noiseSlider.value = 0;
        hueSlider.value = 0;
        
        brightnessValue.textContent = '0';
        contrastValue.textContent = '0';
        sharpenValue.textContent = '0';
        saturationValue.textContent = '0';
        colorTempValue.textContent = '0';
        exposureValue.textContent = '0';
        gammaValue.textContent = '1.00';
        noiseValue.textContent = '0';
        hueValue.textContent = '0';
        
        if (originalImage) {
            enhancedCtx.drawImage(originalImage, 0, 0);
            enhancedPreview.src = enhancedCanvas.toDataURL();
        }
    }
    
    function downloadEnhancedImage() {
        if (!originalImage) return;
        
        const format = fileFormatSelect.value;
        let fileName = fileNameInput.value.trim();
        
        // Use original filename if custom name not provided
        if (!fileName) {
            fileName = originalFileName;
        }
        
        // Create download link
        const downloadLink = document.createElement('a');
        downloadLink.download = `${fileName}.${format}`;
        
        // Set proper MIME type based on format
        let mimeType = 'image/png';
        if (format === 'jpeg') mimeType = 'image/jpeg';
        if (format === 'webp') mimeType = 'image/webp';
        
        downloadLink.href = enhancedCanvas.toDataURL(mimeType, 0.9);
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    }
    
    // Image enhancement functions
    function applyBrightnessContrast(brightness, contrast) {
        const imageData = enhancedCtx.getImageData(0, 0, enhancedCanvas.width, enhancedCanvas.height);
        const data = imageData.data;
        
        // Normalize contrast to 0-2 range
        const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        
        for (let i = 0; i < data.length; i += 4) {
            // Apply brightness
            data[i] += brightness;     // R
            data[i + 1] += brightness; // G
            data[i + 2] += brightness; // B
            
            // Apply contrast
            data[i] = clamp(contrastFactor * (data[i] - 128) + 128);
            data[i + 1] = clamp(contrastFactor * (data[i + 1] - 128) + 128);
            data[i + 2] = clamp(contrastFactor * (data[i + 2] - 128) + 128);
        }
        
        enhancedCtx.putImageData(imageData, 0, 0);
    }
    
    function applySharpen(amount) {
        // 增强锐化算法，使用更高质量的卷积核
        const strength = amount / 100 * 1.5;  // 加大锐化范围
        
        // Get image data
        const imageData = enhancedCtx.getImageData(0, 0, enhancedCanvas.width, enhancedCanvas.height);
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        // Create a temporary copy of the image data
        const tempData = new Uint8ClampedArray(data);
        
        // 使用更复杂的锐化卷积核（拉普拉斯算子）
        const kernel = [
            0, -1, 0,
            -1, 5, -1,
            0, -1, 0
        ];
        
        // 应用卷积
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const centerIdx = (y * width + x) * 4;
                
                for (let c = 0; c < 3; c++) {  // 对RGB通道操作
                    let sum = 0;
                    
                    // 应用3x3卷积核
                    for (let ky = -1; ky <= 1; ky++) {
                        for (let kx = -1; kx <= 1; kx++) {
                            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
                            // 获取卷积核权重
                            const weight = kernel[(ky + 1) * 3 + (kx + 1)];
                            sum += tempData[idx] * weight;
                        }
                    }
                    
                    // 应用锐化强度
                    const original = tempData[centerIdx + c];
                    const sharpened = clamp(sum);
                    data[centerIdx + c] = clamp(original * (1 - strength) + sharpened * strength);
                }
            }
        }
        
        enhancedCtx.putImageData(imageData, 0, 0);
    }
    
    function applySaturation(saturation) {
        const imageData = enhancedCtx.getImageData(0, 0, enhancedCanvas.width, enhancedCanvas.height);
        const data = imageData.data;
        
        // Normalize saturation to range useful for calculation
        const saturationFactor = 1 + (saturation / 100);
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Calculate luminance (grayscale)
            const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
            
            // Adjust saturation by mixing grayscale and color values
            data[i] = clamp(gray + (r - gray) * saturationFactor);
            data[i + 1] = clamp(gray + (g - gray) * saturationFactor);
            data[i + 2] = clamp(gray + (b - gray) * saturationFactor);
        }
        
        enhancedCtx.putImageData(imageData, 0, 0);
    }
    
    function applyColorTemperature(temperature) {
        const imageData = enhancedCtx.getImageData(0, 0, enhancedCanvas.width, enhancedCanvas.height);
        const data = imageData.data;
        
        // 正值增加暖色调（增加红色和黄色），负值增加冷色调（增加蓝色）
        const warmth = temperature / 100;
        
        for (let i = 0; i < data.length; i += 4) {
            if (warmth > 0) {
                // 增加暖色调
                data[i] = clamp(data[i] + warmth * 30);  // 增加红色
                data[i + 1] = clamp(data[i + 1] + warmth * 15);  // 稍微增加绿色（黄色 = 红 + 绿）
                data[i + 2] = clamp(data[i + 2] - warmth * 20);  // 减少蓝色
            } else {
                // 增加冷色调
                data[i] = clamp(data[i] + warmth * 20);  // 减少红色
                data[i + 1] = clamp(data[i + 1] + warmth * 10);  // 稍微减少绿色
                data[i + 2] = clamp(data[i + 2] - warmth * 30);  // 增加蓝色
            }
        }
        
        enhancedCtx.putImageData(imageData, 0, 0);
    }
    
    function applyExposure(exposure) {
        const imageData = enhancedCtx.getImageData(0, 0, enhancedCanvas.width, enhancedCanvas.height);
        const data = imageData.data;
        
        // 将曝光值映射到合理范围内的因子
        const factor = Math.pow(2, exposure / 50);  // 使用对数尺度模拟相机曝光
        
        for (let i = 0; i < data.length; i += 4) {
            // 对RGB三个通道应用曝光调整
            data[i] = clamp(data[i] * factor);
            data[i + 1] = clamp(data[i + 1] * factor);
            data[i + 2] = clamp(data[i + 2] * factor);
        }
        
        enhancedCtx.putImageData(imageData, 0, 0);
    }
    
    function applyGamma(gamma) {
        const imageData = enhancedCtx.getImageData(0, 0, enhancedCanvas.width, enhancedCanvas.height);
        const data = imageData.data;
        
        // 创建伽马校正查找表来提高效率
        const gammaLUT = new Uint8Array(256);
        for (let i = 0; i < 256; i++) {
            gammaLUT[i] = clamp(Math.pow(i / 255, 1 / gamma) * 255);
        }
        
        for (let i = 0; i < data.length; i += 4) {
            // 应用伽马校正
            data[i] = gammaLUT[data[i]];         // R
            data[i + 1] = gammaLUT[data[i + 1]]; // G
            data[i + 2] = gammaLUT[data[i + 2]]; // B
        }
        
        enhancedCtx.putImageData(imageData, 0, 0);
    }
    
    function applyNoiseReduction(amount) {
        // 使用中值滤波来减少噪点
        if (amount <= 0) return;
        
        const strength = amount / 100;
        const imageData = enhancedCtx.getImageData(0, 0, enhancedCanvas.width, enhancedCanvas.height);
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        // 创建临时数组
        const tempData = new Uint8ClampedArray(data);
        
        // 计算窗口大小 (在强度较大时使用3x3窗口)
        const useMedianFilter = strength > 0.5;
        
        if (useMedianFilter) {
            // 应用中值滤波
            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    const centerIdx = (y * width + x) * 4;
                    
                    for (let c = 0; c < 3; c++) {
                        // 获取3x3窗口内的所有值
                        const values = [];
                        for (let dy = -1; dy <= 1; dy++) {
                            for (let dx = -1; dx <= 1; dx++) {
                                const idx = ((y + dy) * width + (x + dx)) * 4 + c;
                                values.push(tempData[idx]);
                            }
                        }
                        
                        // 求中值
                        values.sort((a, b) => a - b);
                        const medianValue = values[4]; // 中间值
                        
                        // 混合原图和中值滤波结果
                        const mixtureAmount = strength * 0.8; // 控制混合的程度
                        data[centerIdx + c] = clamp(
                            tempData[centerIdx + c] * (1 - mixtureAmount) + 
                            medianValue * mixtureAmount
                        );
                    }
                }
            }
        } else {
            // 低强度时使用加权平均滤波（保留更多细节）
            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    const centerIdx = (y * width + x) * 4;
                    
                    for (let c = 0; c < 3; c++) {
                        let sum = 0;
                        let weightSum = 0;
                        
                        // 加权平均
                        for (let dy = -1; dy <= 1; dy++) {
                            for (let dx = -1; dx <= 1; dx++) {
                                const idx = ((y + dy) * width + (x + dx)) * 4 + c;
                                // 中心像素权重更高
                                const weight = (dx === 0 && dy === 0) ? 4 : 1;
                                sum += tempData[idx] * weight;
                                weightSum += weight;
                            }
                        }
                        
                        const avgValue = sum / weightSum;
                        // 混合原图和平滑结果
                        data[centerIdx + c] = clamp(
                            tempData[centerIdx + c] * (1 - strength * 0.5) + 
                            avgValue * (strength * 0.5)
                        );
                    }
                }
            }
        }
        
        enhancedCtx.putImageData(imageData, 0, 0);
    }
    
    function applyHueShift(hueShift) {
        const imageData = enhancedCtx.getImageData(0, 0, enhancedCanvas.width, enhancedCanvas.height);
        const data = imageData.data;
        
        // 色调偏移（使用HSL色彩空间）
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i] / 255;
            const g = data[i + 1] / 255;
            const b = data[i + 2] / 255;
            
            // 转换RGB到HSL
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            let h, s, l = (max + min) / 2;
            
            if (max === min) {
                h = s = 0; // 无彩色
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
            
            // 调整色调
            h = (h + hueShift / 360) % 1;
            if (h < 0) h += 1;
            
            // 转换回RGB
            let r1, g1, b1;
            
            if (s === 0) {
                r1 = g1 = b1 = l;
            } else {
                const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                const p = 2 * l - q;
                
                r1 = hueToRgb(p, q, h + 1/3);
                g1 = hueToRgb(p, q, h);
                b1 = hueToRgb(p, q, h - 1/3);
            }
            
            data[i] = clamp(r1 * 255);
            data[i + 1] = clamp(g1 * 255);
            data[i + 2] = clamp(b1 * 255);
        }
        
        enhancedCtx.putImageData(imageData, 0, 0);
    }
    
    // HSL转RGB的辅助函数
    function hueToRgb(p, q, t) {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
    }
    
    // Utility function to clamp values between 0-255
    function clamp(value) {
        return Math.max(0, Math.min(255, value));
    }
}); 