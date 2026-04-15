class ExcelToCSVConverter {
    constructor() {
        this.files = [];
        this.convertedFiles = [];
        this.isProcessing = false;
        
        this.initEventListeners();
    }

    initEventListeners() {
        // 文件输入
        const fileInput = document.getElementById('fileInput');
        const dropZone = document.getElementById('dropZone');
        
        // 按钮事件
        const convertBtn = document.getElementById('convertBtn');
        const clearBtn = document.getElementById('clearBtn');
        const downloadAllBtn = document.getElementById('downloadAllBtn');
        const retryBtn = document.getElementById('retryBtn');
        const confirmConvertBtn = document.getElementById('confirmConvertBtn');
        const cancelPreviewBtn = document.getElementById('cancelPreviewBtn');

        // 文件选择事件
        fileInput.addEventListener('change', (e) => {
            this.handleFiles(Array.from(e.target.files));
        });

        // 拖拽事件
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            const files = Array.from(e.dataTransfer.files).filter(file => 
                file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
            );
            this.handleFiles(files);
        });

        // 点击上传区域触发文件选择（但排除按钮区域）
        dropZone.addEventListener('click', (e) => {
            // 如果点击的是文件按钮或其子元素，不处理
            if (e.target.closest('.file-button')) {
                return;
            }
            fileInput.click();
        });

        // 按钮事件
        convertBtn.addEventListener('click', () => {
            this.previewFiles();
        });

        confirmConvertBtn.addEventListener('click', () => {
            this.convertFiles();
        });

        cancelPreviewBtn.addEventListener('click', () => {
            this.hideSection('previewSection');
        });

        clearBtn.addEventListener('click', () => {
            this.clearFiles();
        });

        downloadAllBtn.addEventListener('click', () => {
            this.downloadAllFiles();
        });

        retryBtn.addEventListener('click', () => {
            this.hideError();
        });
    }

    handleFiles(newFiles) {
        // 过滤重复文件
        const existingNames = this.files.map(f => f.name);
        const filteredFiles = newFiles.filter(file => !existingNames.includes(file.name));
        
        if (filteredFiles.length === 0) {
            this.showError('所选文件已存在或无有效的Excel文件');
            return;
        }

        this.files.push(...filteredFiles);
        this.displayFiles();
        this.showSection('filesSection');
    }

    displayFiles() {
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '';

        this.files.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <div class="file-info-left">
                    <div class="file-details">
                        <h4>${file.name}</h4>
                        <p>${this.formatFileSize(file.size)}</p>
                    </div>
                </div>
                <div class="file-status status-ready">准备转换</div>
            `;
            fileList.appendChild(fileItem);
        });
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async previewFiles() {
        if (this.files.length === 0) {
            this.showError('请先选择文件');
            return;
        }

        try {
            const previewContent = document.getElementById('previewContent');
            previewContent.innerHTML = ''; // 清空之前的预览内容
            
            // 预览所有文件
            for (let i = 0; i < this.files.length; i++) {
                const file = this.files[i];
                console.log('预览文件:', file.name);
                
                await this.previewSingleFile(file, i);
            }
            
            this.showSection('previewSection');
            
        } catch (error) {
            console.error('预览过程中出现错误:', error);
            this.showError('预览过程中出现错误: ' + error.message);
        }
    }

    async previewSingleFile(file, index) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { 
                        type: 'array',
                        cellFormula: true,   // 读取公式以便后续处理
                        cellHTML: false,
                        cellNF: true,        // 读取数字格式以获取显示值
                        cellStyles: false,
                        cellText: true,      // 读取格式化文本
                        cellDates: false,
                        sheetStubs: true,
                        defval: "",
                        raw: false,          // 使用格式化值
                        dateNF: 'yyyy-mm-dd'
                    });
                    
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    
                    this.displayPreview(worksheet, file.name, index);
                    resolve();
                    
                } catch (error) {
                    console.error('预览文件失败:', error);
                    this.showError('预览文件失败: ' + error.message);
                    reject(error);
                }
            };
            
            reader.onerror = () => {
                reject(new Error('读取文件失败'));
            };
            
            reader.readAsArrayBuffer(file);
        });
    }

    displayPreview(worksheet, fileName, index) {
        const previewContent = document.getElementById('previewContent');
        
        // 智能修复工作表
        this.smartFixWorksheet(worksheet);
        
        // 获取工作表范围
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        const maxRows = Math.min(6, range.e.r + 1); // 只显示前6行
        const maxCols = Math.min(22, range.e.c + 1); // 显示所有列
        
        // 创建文件预览容器
        const filePreviewDiv = document.createElement('div');
        filePreviewDiv.className = 'file-preview-item';
        filePreviewDiv.style.marginBottom = '25px';
        
        // 创建文件标题
        let headerHTML = `<h4 style="color: #2d3748; margin-bottom: 12px; padding: 10px; background: #f7fafc; border-radius: 6px; border-left: 4px solid #333333;">
            文件 ${index + 1}: ${fileName}
        </h4>`;
        
        // 创建表格
        let tableHTML = '<table class="preview-table">';
        
        for (let row = 0; row < maxRows; row++) {
            tableHTML += '<tr>';
            for (let col = 0; col < maxCols; col++) {
                const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
                const cell = worksheet[cellAddress];
                
                let cellValue = '';
                if (cell) {
                    // 使用修复后的值
                    cellValue = cell.v || '';
                    
                    // 处理仍然存在的错误值
                    if (typeof cellValue === 'string' && cellValue.includes('#')) {
                        cellValue = '<span style="color: #e53e3e;">' + cellValue + '</span>';
                    }
                }
                
                const tag = row === 0 ? 'th' : 'td';
                tableHTML += `<${tag}>${cellValue}</${tag}>`;
            }
            tableHTML += '</tr>';
        }
        
        tableHTML += '</table>';
        
        if (range.e.r > 5) {
            tableHTML += `<p style="margin-top: 10px; color: #718096; font-size: 0.9rem;">
                还有 ${range.e.r - 5} 行数据未显示...
            </p>`;
        }
        
        filePreviewDiv.innerHTML = headerHTML + tableHTML;
        previewContent.appendChild(filePreviewDiv);
    }

    // 智能修复工作表数据
    smartFixWorksheet(worksheet) {
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        
        // 分析表头，找到年龄段和价格区间列
        let ageRangeCol = -1;
        let priceRangeCol = -1;
        let ageCol = -1;
        let priceCol = -1;
        
        // 检查第一行（表头）
        for (let col = 0; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
            const cell = worksheet[cellAddress];
            if (cell && cell.v) {
                const headerValue = cell.v.toString();
                if (headerValue.includes('年龄段')) {
                    ageRangeCol = col;
                } else if (headerValue.includes('价格区间')) {
                    priceRangeCol = col;
                } else if (headerValue.includes('年龄') && !headerValue.includes('段')) {
                    ageCol = col;
                } else if (headerValue.includes('价格') && !headerValue.includes('区间')) {
                    priceCol = col;
                }
            }
        }
        
        console.log('列位置:', { ageCol, ageRangeCol, priceCol, priceRangeCol });
        
        // 修复每一行的数据
        for (let row = 1; row <= range.e.r; row++) {
            // 修复年龄段
            if (ageRangeCol >= 0 && ageCol >= 0) {
                const ageRangeCell = worksheet[XLSX.utils.encode_cell({ r: row, c: ageRangeCol })];
                const ageCell = worksheet[XLSX.utils.encode_cell({ r: row, c: ageCol })];
                
                if (ageRangeCell && ageCell && (ageRangeCell.t === 'e' || (ageRangeCell.v && ageRangeCell.v.toString().includes('#')))) {
                    const age = parseInt(ageCell.v);
                    if (!isNaN(age)) {
                        const ageRange = this.calculateAgeRange(age);
                        ageRangeCell.v = ageRange;
                        ageRangeCell.t = 's';
                        delete ageRangeCell.f;
                        delete ageRangeCell.w;
                    }
                }
            }
            
            // 修复价格区间
            if (priceRangeCol >= 0 && priceCol >= 0) {
                const priceRangeCell = worksheet[XLSX.utils.encode_cell({ r: row, c: priceRangeCol })];
                const priceCell = worksheet[XLSX.utils.encode_cell({ r: row, c: priceCol })];
                
                if (priceRangeCell && priceCell && (priceRangeCell.t === 'e' || (priceRangeCell.v && priceRangeCell.v.toString().includes('#')))) {
                    const price = parseFloat(priceCell.v);
                    if (!isNaN(price)) {
                        const priceRange = this.calculatePriceRange(price);
                        priceRangeCell.v = priceRange;
                        priceRangeCell.t = 's';
                        delete priceRangeCell.f;
                        delete priceRangeCell.w;
                    }
                }
            }
        }
    }
    
    // 根据年龄计算年龄段
    calculateAgeRange(age) {
        if (age < 18) return '0-18';
        else if (age < 25) return '18-24';
        else if (age < 31) return '25-30';
        else if (age < 41) return '31-40';
        else if (age < 51) return '41-50';
        else return '50+';
    }
    
    // 根据价格计算价格区间
    calculatePriceRange(price) {
        if (price < 60) return '0-59';
        else if (price < 100) return '59-99';
        else if (price < 200) return '99-199';
        else if (price < 300) return '199-299';
        else return '299+';
    }

    async convertFiles() {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        this.convertedFiles = [];
        this.showSection('progressSection');
        
        const convertBtn = document.getElementById('convertBtn');
        convertBtn.disabled = true;
        convertBtn.textContent = '转换中...';

        try {
            for (let i = 0; i < this.files.length; i++) {
                const file = this.files[i];
                
                // 更新进度
                const progress = ((i) / this.files.length) * 100;
                this.updateProgress(progress, `正在转换: ${file.name}`);
                
                // 更新文件状态
                this.updateFileStatus(i, 'processing', '转换中...');

                try {
                    const csvData = await this.convertFileToCSV(file);
                    this.convertedFiles.push({
                        originalName: file.name,
                        csvName: file.name.replace(/\.(xlsx|xls)$/i, '.csv'),
                        csvData: csvData,
                        size: new Blob([csvData]).size
                    });
                    
                    this.updateFileStatus(i, 'completed', '转换成功');
                } catch (error) {
                    console.error(`转换文件 ${file.name} 时出错:`, error);
                    this.updateFileStatus(i, 'error', '转换失败');
                }
            }

            // 完成转换
            this.updateProgress(100, '转换完成！');
            setTimeout(() => {
                this.showResults();
            }, 500);

        } catch (error) {
            console.error('转换过程中出现错误:', error);
            this.showError('转换过程中出现错误: ' + error.message);
        } finally {
            this.isProcessing = false;
            convertBtn.disabled = false;
            convertBtn.textContent = '预览数据';
        }
    }

    async convertFileToCSV(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { 
                        type: 'array',
                        cellFormula: true,   // 读取公式以便后续处理
                        cellHTML: false,     // 不读取HTML
                        cellNF: true,        // 读取数字格式以获取显示值
                        cellStyles: false,   // 不读取样式
                        cellText: true,      // 读取格式化文本（显示值）
                        cellDates: false,    // 不自动转换日期
                        sheetStubs: true,    // 读取空单元格以保持结构
                        defval: "",          // 错误值的默认值
                        raw: false,          // 不使用原始值，使用格式化后的值
                        dateNF: 'yyyy-mm-dd' // 日期格式
                    });
                    
                    // 获取第一个工作表
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    
                    // 智能修复工作表数据
                    this.smartFixWorksheet(worksheet);
                    
                    // 转换为CSV
                    const csvData = XLSX.utils.sheet_to_csv(worksheet, {
                        FS: ',',        // 字段分隔符
                        RS: '\n',       // 行分隔符
                        forceQuotes: false,  // 不强制加引号
                        skipHidden: true,    // 跳过隐藏行列
                        strip: false         // 不去除空白
                    });
                    
                    resolve(csvData);
                } catch (error) {
                    reject(new Error(`解析Excel文件失败: ${error.message}`));
                }
            };
            
            reader.onerror = () => {
                reject(new Error('读取文件失败'));
            };
            
            reader.readAsArrayBuffer(file);
        });
    }

    // 清理工作表中的错误值和公式错误
    cleanWorksheet(worksheet) {
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        
        for (let row = range.s.r; row <= range.e.r; row++) {
            for (let col = range.s.c; col <= range.e.c; col++) {
                const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
                const cell = worksheet[cellAddress];
                
                if (cell) {
                    // 优先使用显示值 (w) 而不是计算值 (v)
                    let displayValue = cell.w || cell.v;
                    
                    // 处理错误值
                    if (cell.t === 'e' || (displayValue && typeof displayValue === 'string' && displayValue.includes('#'))) {
                        // 如果是错误值，尝试恢复为空或寻找备用值
                        if (cell.f) {
                            // 如果有公式，尝试简单计算
                            try {
                                // 对于简单的引用公式，尝试获取引用的值
                                cell.v = '';
                                cell.t = 's';
                            } catch (e) {
                                cell.v = '';
                                cell.t = 's';
                            }
                        } else {
                            cell.v = '';
                            cell.t = 's';
                        }
                        delete cell.w;
                    } else {
                        // 使用显示值作为最终值
                        if (displayValue !== undefined && displayValue !== null) {
                            // 尝试解析为数字
                            if (typeof displayValue === 'string' && !isNaN(displayValue) && displayValue.trim() !== '') {
                                cell.v = parseFloat(displayValue);
                                cell.t = 'n';
                            } else if (typeof displayValue === 'number') {
                                cell.v = displayValue;
                                cell.t = 'n';
                            } else {
                                cell.v = displayValue.toString();
                                cell.t = 's';
                            }
                        }
                    }
                }
            }
        }
    }

    updateProgress(percent, text) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        progressFill.style.width = percent + '%';
        progressText.textContent = text;
    }

    updateFileStatus(index, status, text) {
        const fileItems = document.querySelectorAll('.file-item');
        if (fileItems[index]) {
            const statusElement = fileItems[index].querySelector('.file-status');
            statusElement.className = `file-status status-${status}`;
            statusElement.textContent = text;
            
            if (status === 'processing') {
                fileItems[index].classList.add('processing');
            } else {
                fileItems[index].classList.remove('processing');
            }
        }
    }

    showResults() {
        this.hideSection('progressSection');
        this.showSection('resultsSection');
        this.displayResults();
    }

    displayResults() {
        const downloadList = document.getElementById('downloadList');
        downloadList.innerHTML = '';

        this.convertedFiles.forEach((file, index) => {
            const downloadItem = document.createElement('div');
            downloadItem.className = 'download-item';
            downloadItem.innerHTML = `
                <div class="file-info-left">
                    <div class="file-details">
                        <h4>${file.csvName}</h4>
                        <p>${this.formatFileSize(file.size)}</p>
                    </div>
                </div>
                <button class="download-btn" onclick="converter.downloadFile(${index})">
                    下载
                </button>
            `;
            downloadList.appendChild(downloadItem);
        });
    }

    downloadFile(index) {
        if (index < 0 || index >= this.convertedFiles.length) return;
        
        const file = this.convertedFiles[index];
        const blob = new Blob([file.csvData], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = file.csvName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    }

    downloadAllFiles() {
        if (this.convertedFiles.length === 0) return;
        
        if (this.convertedFiles.length === 1) {
            this.downloadFile(0);
            return;
        }

        // 创建ZIP文件（使用简单的方法，逐个下载）
        this.convertedFiles.forEach((_, index) => {
            setTimeout(() => {
                this.downloadFile(index);
            }, index * 500); // 延迟下载避免浏览器阻止
        });
    }

    clearFiles() {
        this.files = [];
        this.convertedFiles = [];
        this.hideSection('filesSection');
        this.hideSection('previewSection');
        this.hideSection('progressSection');
        this.hideSection('resultsSection');
        this.hideError();
        
        // 重置文件输入
        document.getElementById('fileInput').value = '';
    }

    showSection(sectionId) {
        document.getElementById(sectionId).style.display = 'block';
    }

    hideSection(sectionId) {
        document.getElementById(sectionId).style.display = 'none';
    }

    showError(message) {
        const errorSection = document.getElementById('errorSection');
        const errorMessage = document.getElementById('errorMessage');
        
        errorMessage.textContent = message;
        errorSection.style.display = 'block';
        
        // 滚动到错误消息
        errorSection.scrollIntoView({ behavior: 'smooth' });
    }

    hideError() {
        this.hideSection('errorSection');
    }
}

// 初始化应用
let converter;

document.addEventListener('DOMContentLoaded', () => {
    converter = new ExcelToCSVConverter();
    
    // 添加一些用户提示
    console.log('Excel转CSV工具已就绪！');
    console.log('支持的文件格式: .xlsx, .xls');
    console.log('完全在浏览器中运行，文件不会上传到服务器');
});
