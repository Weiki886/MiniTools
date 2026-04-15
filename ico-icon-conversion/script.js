let selectedFile = null;
let icoBlob = null;

// 文件输入事件
document.getElementById('fileInput').addEventListener('change', function(e) {
    handleFile(e.target.files[0]);
});

// 拖拽功能
const uploadArea = document.querySelector('.upload-area');

uploadArea.addEventListener('dragover', function(e) {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', function(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', function(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

function handleFile(file) {
    if (!file) return;

    // 检查文件类型
    if (!file.type.startsWith('image/png')) {
        showError('请选择PNG格式的图片文件');
        return;
    }

    selectedFile = file;
    
    // 显示预览
    const reader = new FileReader();
    reader.onload = function(e) {
        const previewImage = document.getElementById('previewImage');
        previewImage.src = e.target.result;
        document.getElementById('previewArea').style.display = 'block';
        document.getElementById('convertBtn').disabled = false;
        hideMessages();
    };
    reader.readAsDataURL(file);
}

async function convertToIco() {
    if (!selectedFile) return;

    try {
        showProgress(0);
        const convertBtn = document.getElementById('convertBtn');
        convertBtn.disabled = true;
        convertBtn.textContent = '转换中...';

        // 获取选择的尺寸
        const selectedSizes = getSelectedSizes();
        if (selectedSizes.length === 0) {
            showError('请选择一个图标尺寸');
            convertBtn.disabled = false;
            convertBtn.textContent = '转换为ICO';
            return;
        }

        showProgress(20);

        // 创建图片对象
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        img.onload = async function() {
            try {
                showProgress(40);

                // 生成ICO文件
                const icoData = await generateICO(img, selectedSizes, ctx, canvas);
                
                showProgress(90);

                // 创建Blob
                icoBlob = new Blob([icoData], { type: 'image/x-icon' });
                
                showProgress(100);
                
                // 显示文件大小信息
                const fileSize = (icoBlob.size / 1024).toFixed(2);
                const selectedSize = getSelectedSizes()[0];
                showSuccess(`转换成功！ICO文件已生成 (${selectedSize}x${selectedSize}, ${fileSize}KB)`);
                
                // 显示下载按钮和结果信息
                document.getElementById('downloadBtn').style.display = 'inline-block';
                document.getElementById('downloadBtn').disabled = false;
                document.getElementById('resultArea').style.display = 'block';
                document.getElementById('resultText').textContent = `ICO文件已生成 (${selectedSize}x${selectedSize}, ${fileSize}KB)，点击下载按钮保存文件。`;

                convertBtn.textContent = '转换为ICO';
                convertBtn.disabled = false;

                setTimeout(() => {
                    document.getElementById('progressBar').style.display = 'none';
                }, 1000);

            } catch (error) {
                showError('转换失败: ' + error.message);
                convertBtn.disabled = false;
                convertBtn.textContent = '转换为ICO';
                document.getElementById('progressBar').style.display = 'none';
            }
        };

        img.onerror = function() {
            showError('图片加载失败');
            convertBtn.disabled = false;
            convertBtn.textContent = '转换为ICO';
            document.getElementById('progressBar').style.display = 'none';
        };

        img.src = URL.createObjectURL(selectedFile);

    } catch (error) {
        showError('转换失败: ' + error.message);
        document.getElementById('convertBtn').disabled = false;
        document.getElementById('convertBtn').textContent = '转换为ICO';
        document.getElementById('progressBar').style.display = 'none';
    }
}

function getSelectedSizes() {
    const selectedRadio = document.querySelector('input[name="iconSize"]:checked');
    if (selectedRadio) {
        return [parseInt(selectedRadio.value)];
    }
    return [];
}

async function generateICO(img, sizes, ctx, canvas) {
    const iconEntries = [];
    const imageData = [];

    for (let i = 0; i < sizes.length; i++) {
        const size = sizes[i];
        
        // 设置画布尺寸
        canvas.width = size;
        canvas.height = size;
        
        // 填充白色背景
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, size, size);
        
        // 绘制图片
        ctx.drawImage(img, 0, 0, size, size);
        
        // 根据尺寸选择最优格式
        let imageBytes;
        let bitCount;
        
        if (size <= 48) {
            // 小尺寸使用32位位图格式
            imageBytes = canvasTo32BitBMP(canvas, size);
            bitCount = 32;
        } else {
            // 大尺寸使用PNG格式
            const pngData = canvas.toDataURL('image/png');
            imageBytes = dataURLToUint8Array(pngData);
            bitCount = 32;
        }
        
        imageData.push(imageBytes);
        
        // 创建ICO目录条目
        iconEntries.push({
            width: size === 256 ? 0 : size,  // 256像素时写入0
            height: size === 256 ? 0 : size,
            colorCount: 0,
            reserved: 0,
            planes: 1,
            bitCount: bitCount,
            sizeInBytes: imageBytes.length,
            offset: 0  // 稍后计算
        });
    }

    // 计算偏移量
    let offset = 6 + (iconEntries.length * 16); // 文件头 + 目录条目
    for (let i = 0; i < iconEntries.length; i++) {
        iconEntries[i].offset = offset;
        offset += iconEntries[i].sizeInBytes;
    }

    // 构建ICO文件
    const totalSize = 6 + (iconEntries.length * 16) + imageData.reduce((sum, data) => sum + data.length, 0);
    const icoArray = new Uint8Array(totalSize);
    let pos = 0;

    // ICO文件头
    writeUint16LE(icoArray, pos, 0); pos += 2;      // 保留字段
    writeUint16LE(icoArray, pos, 1); pos += 2;      // 类型：ICO
    writeUint16LE(icoArray, pos, sizes.length); pos += 2; // 图标数量

    // 目录条目
    for (let i = 0; i < iconEntries.length; i++) {
        const entry = iconEntries[i];
        icoArray[pos++] = entry.width;
        icoArray[pos++] = entry.height;
        icoArray[pos++] = entry.colorCount;
        icoArray[pos++] = entry.reserved;
        writeUint16LE(icoArray, pos, entry.planes); pos += 2;
        writeUint16LE(icoArray, pos, entry.bitCount); pos += 2;
        writeUint32LE(icoArray, pos, entry.sizeInBytes); pos += 4;
        writeUint32LE(icoArray, pos, entry.offset); pos += 4;
    }

    // 图像数据
    for (let i = 0; i < imageData.length; i++) {
        icoArray.set(imageData[i], pos);
        pos += imageData[i].length;
    }

    return icoArray;
}

function canvasTo32BitBMP(canvas, size) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, size, size);
    const pixels = imageData.data;
    
    // 计算行字节数（必须是4的倍数）
    const rowBytes = size * 4;
    const paddedRowBytes = Math.ceil(rowBytes / 4) * 4;
    
    // BMP数据大小（包括AND掩码）
    const imageSize = paddedRowBytes * size * 2; // XOR + AND掩码
    const totalSize = 40 + imageSize; // BITMAPINFOHEADER + 图像数据
    
    const bmpData = new Uint8Array(totalSize);
    let pos = 0;
    
    // BITMAPINFOHEADER (40字节)
    writeUint32LE(bmpData, pos, 40); pos += 4;          // 头大小
    writeUint32LE(bmpData, pos, size); pos += 4;        // 宽度
    writeUint32LE(bmpData, pos, size * 2); pos += 4;    // 高度（XOR + AND）
    writeUint16LE(bmpData, pos, 1); pos += 2;           // 平面数
    writeUint16LE(bmpData, pos, 32); pos += 2;          // 位数
    writeUint32LE(bmpData, pos, 0); pos += 4;           // 压缩方式
    writeUint32LE(bmpData, pos, imageSize); pos += 4;   // 图像大小
    writeUint32LE(bmpData, pos, 0); pos += 4;           // X像素/米
    writeUint32LE(bmpData, pos, 0); pos += 4;           // Y像素/米
    writeUint32LE(bmpData, pos, 0); pos += 4;           // 使用的颜色数
    writeUint32LE(bmpData, pos, 0); pos += 4;           // 重要颜色数
    
    // XOR掩码（颜色数据，从下到上）
    for (let y = size - 1; y >= 0; y--) {
        for (let x = 0; x < size; x++) {
            const pixelIndex = (y * size + x) * 4;
            bmpData[pos++] = pixels[pixelIndex + 2]; // B
            bmpData[pos++] = pixels[pixelIndex + 1]; // G
            bmpData[pos++] = pixels[pixelIndex + 0]; // R
            bmpData[pos++] = pixels[pixelIndex + 3]; // A
        }
        // 填充行到4字节边界
        while (pos % 4 !== 0) {
            bmpData[pos++] = 0;
        }
    }
    
    // AND掩码（透明度掩码，从下到上）
    const andRowBytes = Math.ceil(size / 8);
    const andPaddedRowBytes = Math.ceil(andRowBytes / 4) * 4;
    
    for (let y = size - 1; y >= 0; y--) {
        for (let x = 0; x < size; x += 8) {
            let maskByte = 0;
            for (let bit = 0; bit < 8 && x + bit < size; bit++) {
                const pixelIndex = (y * size + x + bit) * 4;
                if (pixels[pixelIndex + 3] < 128) { // 透明像素
                    maskByte |= (1 << (7 - bit));
                }
            }
            bmpData[pos++] = maskByte;
        }
        // 填充行到4字节边界
        while ((pos - 40 - paddedRowBytes * size) % andPaddedRowBytes !== 0) {
            bmpData[pos++] = 0;
        }
    }
    
    return bmpData;
}

function dataURLToUint8Array(dataURL) {
    const base64 = dataURL.split(',')[1];
    const binary = atob(base64);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        array[i] = binary.charCodeAt(i);
    }
    return array;
}

function writeUint16LE(array, offset, value) {
    array[offset] = value & 0xFF;
    array[offset + 1] = (value >> 8) & 0xFF;
}

function writeUint32LE(array, offset, value) {
    array[offset] = value & 0xFF;
    array[offset + 1] = (value >> 8) & 0xFF;
    array[offset + 2] = (value >> 16) & 0xFF;
    array[offset + 3] = (value >> 24) & 0xFF;
}

function downloadIco() {
    if (!icoBlob) return;

    const url = URL.createObjectURL(icoBlob);
    const a = document.createElement('a');
    a.href = url;
    
    // 根据选择的尺寸生成文件名
    const selectedSize = getSelectedSizes()[0];
    a.download = `icon_${selectedSize}x${selectedSize}.ico`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function showProgress(percent) {
    const progressBar = document.getElementById('progressBar');
    const progressFill = document.getElementById('progressFill');
    progressBar.style.display = 'block';
    progressFill.style.width = percent + '%';
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    document.getElementById('successMessage').style.display = 'none';
}

function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    document.getElementById('errorMessage').style.display = 'none';
}

function hideMessages() {
    document.getElementById('errorMessage').style.display = 'none';
    document.getElementById('successMessage').style.display = 'none';
}