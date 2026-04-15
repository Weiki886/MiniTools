// 获取DOM元素
const fileInput = document.getElementById('fileInput');
const pdfName = document.getElementById('pdfName');
const convertBtn = document.getElementById('convertBtn');
const imagesPreview = document.getElementById('imagesPreview');
const spinner = document.getElementById('spinner');
const highQualityCheckbox = document.getElementById('highQuality');

// 存储选择的图片
let selectedImages = [];

// 监听文件选择
fileInput.addEventListener('change', function(e) {
    selectedImages = [];
    imagesPreview.innerHTML = '';
    
    if (fileInput.files.length > 0) {
        convertBtn.disabled = false;
        
        // 显示图片预览
        Array.from(fileInput.files).forEach((file, index) => {
            const reader = new FileReader();
            
            reader.onload = function(event) {
                const img = new Image();
                img.src = event.target.result;
                
                img.onload = function() {
                    selectedImages.push({
                        element: img,
                        src: event.target.result
                    });
                    
                    // 创建预览
                    const previewDiv = document.createElement('div');
                    previewDiv.style.display = 'inline-block';
                    previewDiv.style.margin = '10px';
                    
                    const previewImg = document.createElement('img');
                    previewImg.src = event.target.result;
                    previewImg.style.maxWidth = '150px';
                    previewImg.style.maxHeight = '150px';
                    previewImg.style.border = '1px solid #ddd';
                    previewImg.style.borderRadius = '4px';
                    
                    const previewText = document.createElement('p');
                    previewText.textContent = file.name;
                    previewText.style.margin = '5px 0';
                    previewText.style.fontSize = '12px';
                    previewText.style.wordBreak = 'break-all';
                    
                    previewDiv.appendChild(previewImg);
                    previewDiv.appendChild(previewText);
                    imagesPreview.appendChild(previewDiv);
                };
            };
            
            reader.readAsDataURL(file);
        });
    } else {
        convertBtn.disabled = true;
    }
});

// 转换按钮点击事件
convertBtn.addEventListener('click', async function() {
    if (selectedImages.length === 0) {
        alert('请选择至少一张图片');
        return;
    }

    // 显示加载动画
    spinner.style.display = 'inline-block';
    convertBtn.disabled = true;

    // 获取用户输入的文件名
    let filename = pdfName.value.trim() || 'converted_document';
    if (!filename.toLowerCase().endsWith('.pdf')) {
        filename += '.pdf';
    }

    try {
        // 初始化jsPDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // 检查是否启用高质量模式
        const useHighQuality = highQualityCheckbox && highQualityCheckbox.checked;
        
        // 设置图像质量（仅在高质量模式下改变）
        const imageQuality = useHighQuality ? 1.0 : 0.8; // 1.0为最高质量，0为最低
        const imageFormat = useHighQuality ? 'PNG' : 'JPEG';
        
        // 逐个处理图片
        for (let i = 0; i < selectedImages.length; i++) {
            const img = selectedImages[i].element;
            
            // 如果不是第一张图片，添加新页
            if (i > 0) {
                doc.addPage();
            }
            
            // 计算图片在PDF中的尺寸，保持纵横比
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            
            let imgWidth = img.width;
            let imgHeight = img.height;
            
            // 计算适合页面的尺寸
            const ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
            imgWidth = imgWidth * ratio;
            imgHeight = imgHeight * ratio;
            
            // 计算居中位置
            const x = (pageWidth - imgWidth) / 2;
            const y = (pageHeight - imgHeight) / 2;
            
            // 优化图像 - 如果选择了高质量
            if (useHighQuality) {
                // 使用高质量设置
                doc.addImage(img, imageFormat, x, y, imgWidth, imgHeight, undefined, 'FAST', 0);
            } else {
                // 使用默认设置
                doc.addImage(img, imageFormat, x, y, imgWidth, imgHeight, undefined, 'MEDIUM', 0);
            }
        }
        
        // 下载PDF
        doc.save(filename);
        
    } catch (error) {
        console.error('PDF生成出错:', error);
        alert('生成PDF时出错，请重试');
    } finally {
        // 隐藏加载动画
        spinner.style.display = 'none';
        convertBtn.disabled = false;
    }
}); 