// 获取DOM元素
const audioFileInput = document.getElementById('audioFile');
const volumeControl = document.getElementById('volumeControl');
const volumeValue = document.getElementById('volumeValue');
const audioPlayer = document.getElementById('audioPlayer');
const audioContainer = document.getElementById('audioContainer');
const processBtn = document.getElementById('processBtn');
const downloadBtn = document.getElementById('downloadBtn');
const statusDiv = document.getElementById('status');
const compressionType = document.getElementById('compressionType');
const useNoiseGate = document.getElementById('useNoiseGate');
const useSoftClipping = document.getElementById('useSoftClipping');

// 获取均衡器元素
const eqLow = document.getElementById('eqLow');
const eqMid = document.getElementById('eqMid');
const eqHigh = document.getElementById('eqHigh');
const eqLowValue = document.getElementById('eqLowValue');
const eqMidValue = document.getElementById('eqMidValue');
const eqHighValue = document.getElementById('eqHighValue');
const eqPresetButtons = {
    flat: document.getElementById('eqFlat'),
    bass: document.getElementById('eqBass'),
    vocal: document.getElementById('eqVocal'),
    bright: document.getElementById('eqBright')
};
const sampleRateOutput = document.getElementById('sampleRateOutput');

// 获取音效处理元素
const reverbType = document.getElementById('reverbType');
const reverbLevel = document.getElementById('reverbLevel');
const reverbLevelValue = document.getElementById('reverbLevelValue');
const reverbLevelContainer = document.getElementById('reverbLevelContainer');
const stereoWidth = document.getElementById('stereoWidth');
const stereoWidthValue = document.getElementById('stereoWidthValue');
const pitchShift = document.getElementById('pitchShift');
const pitchShiftValue = document.getElementById('pitchShiftValue');
const filterType = document.getElementById('filterType');
const filterFreq = document.getElementById('filterFreq');
const filterFreqValue = document.getElementById('filterFreqValue');
const filterFreqContainer = document.getElementById('filterFreqContainer');

// 初始化变量
let audioContext;
let audioBuffer;
let processedAudioBuffer;
let sourceNode;
let gainNode;
let originalAudioUrl;
let processedAudioUrl;
let analyserNode;

// 混响效果的冲击响应缓冲区
let reverbImpulseResponses = {};

// 压缩设置
const compressionSettings = {
    none: { threshold: 0, knee: 0, ratio: 1, attack: 0, release: 0 },
    light: { threshold: -24, knee: 30, ratio: 2, attack: 0.003, release: 0.25 },
    medium: { threshold: -24, knee: 30, ratio: 4, attack: 0.003, release: 0.25 },
    heavy: { threshold: -18, knee: 15, ratio: 8, attack: 0.002, release: 0.15 }
};

// 均衡器预设
const eqPresets = {
    flat: { low: 0, mid: 0, high: 0 },
    bass: { low: 8, mid: 0, high: -3 },
    vocal: { low: -3, mid: 6, high: 1 },
    bright: { low: -2, mid: 0, high: 8 }
};

// EQ 频率设置
const eqFrequencies = {
    low: 200,   // 低频截止频率
    mid: 2000,  // 中频中心频率
    high: 6000  // 高频起始频率
};

// 监听音频文件选择
audioFileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // 重置状态
    resetAudio();
    
    // 创建URL以供预览
    originalAudioUrl = URL.createObjectURL(file);
    audioPlayer.src = originalAudioUrl;
    audioContainer.classList.remove('hidden');
    
    // 文件类型检测 - 用于特殊处理MP3
    const isMP3 = file.type === 'audio/mp3' || file.name.toLowerCase().endsWith('.mp3');
    if (isMP3) {
        console.log('检测到MP3文件，将应用特殊处理');
    }
    
    // 读取音频文件
    const reader = new FileReader();
    reader.onload = function(e) {
        // 初始化音频上下文
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        // 解码音频数据
        const audioData = e.target.result;
        audioContext.decodeAudioData(audioData)
            .then(buffer => {
                audioBuffer = buffer;
                processBtn.disabled = false;
                showStatus('音频已加载，可以调整并处理', 'success');
                setupAudioNodes();
                
                // 记录真实的音频时长
                const actualDuration = buffer.duration;
                console.log(`音频解码完成，AudioBuffer持续时间: ${actualDuration}秒`);
                
                // 添加自定义属性以存储实际时长
                audioPlayer.dataset.actualDuration = actualDuration;
                
                // 为MP3文件添加特殊处理
                if (isMP3) {
                    fixMP3Duration(actualDuration);
                }
            })
            .catch(error => {
                showStatus('无法解码音频文件: ' + error.message, 'error');
            });
    };
    
    reader.onerror = function() {
        showStatus('读取文件时出错', 'error');
    };
    
    reader.readAsArrayBuffer(file);
});

// 修复MP3持续时间问题
function fixMP3Duration(actualDuration) {
    // 监听metadata加载事件
    const metadataListener = function() {
        const reportedDuration = audioPlayer.duration;
        console.log(`MP3元数据加载完成，HTML5播放器持续时间: ${reportedDuration}秒`);
        
        // 检查时长差异是否显著
        if (Math.abs(reportedDuration - actualDuration) > 0.5) {
            console.warn(`检测到持续时间不匹配! 播放器: ${reportedDuration}秒, 实际: ${actualDuration}秒`);
            
            // 修正预览行为 - 应用真实时长
            audioPlayer.addEventListener('timeupdate', syncTimeWithActualDuration);
        } else {
            console.log('MP3持续时间正常，无需修正');
        }
        
        // 只需要执行一次
        audioPlayer.removeEventListener('loadedmetadata', metadataListener);
    };
    
    // 如果元数据已加载，直接执行；否则添加事件监听器
    if (audioPlayer.readyState >= 1) {
        metadataListener();
    } else {
        audioPlayer.addEventListener('loadedmetadata', metadataListener);
    }
}

// 同步播放时间与实际时长
function syncTimeWithActualDuration(e) {
    const player = e.target;
    const reportedDuration = player.duration;
    const actualDuration = parseFloat(player.dataset.actualDuration);
    
    if (!actualDuration || isNaN(actualDuration)) return;
    
    // 计算校正后的当前时间
    const reportedCurrentTime = player.currentTime;
    const currentTimeRatio = reportedCurrentTime / reportedDuration;
    const correctedCurrentTime = currentTimeRatio * actualDuration;
    
    // 更新进度条或时间显示
    // 注意：这里不直接修改player.currentTime以避免循环更新
    
    // 检查是否接近结束
    if (reportedCurrentTime >= reportedDuration - 0.1) {
        console.log('播放接近结束，确保正常完成');
        // 实际结束事件可能不会触发，手动处理
        if (correctedCurrentTime < actualDuration - 0.5) {
            console.log('预防MP3提前结束');
            // 这里可以添加特殊处理，比如重新定位到正确位置
        }
    }
}

// 设置音频节点 - 简化版本，不再需要实时预览节点
function setupAudioNodes() {
    // 只创建分析器节点（可用于可视化）
    if (!audioContext) return;
    
    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 2048;
}

// 确保AudioContext激活
function ensureAudioContextRunning() {
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
            console.log('AudioContext已激活');
        });
    }
}

// 监听播放器播放事件 - 简化
audioPlayer.addEventListener('play', function() {
    // 确保AudioContext已激活
    ensureAudioContextRunning();
});

// 监听播放器暂停事件 - 简化
audioPlayer.addEventListener('pause', function() {
    // 不再需要停止实时预览源
});

// 监听播放器结束事件 - 简化
audioPlayer.addEventListener('ended', function() {
    // 不再需要停止实时预览源
});

// 监听音量滑块变化 - 简化
volumeControl.addEventListener('input', function() {
    volumeValue.textContent = parseFloat(this.value).toFixed(1);
});

// 均衡器滑块值更新 - 简化，不再应用实时效果
eqLow.addEventListener('input', function() {
    const value = parseInt(this.value);
    eqLowValue.textContent = value + ' dB';
});

eqMid.addEventListener('input', function() {
    const value = parseInt(this.value);
    eqMidValue.textContent = value + ' dB';
});

eqHigh.addEventListener('input', function() {
    const value = parseInt(this.value);
    eqHighValue.textContent = value + ' dB';
});

// 确保均衡器滑块初始值显示正确
document.addEventListener('DOMContentLoaded', function() {
    eqLowValue.textContent = eqLow.value + ' dB';
    eqMidValue.textContent = eqMid.value + ' dB';
    eqHighValue.textContent = eqHigh.value + ' dB';
});

// 立体声宽度滑块更新
stereoWidth.addEventListener('input', function() {
    stereoWidthValue.textContent = parseFloat(this.value).toFixed(2);
});

// 音调调整滑块更新
pitchShift.addEventListener('input', function() {
    pitchShiftValue.textContent = this.value;
});

// 混响级别滑块更新
reverbLevel.addEventListener('input', function() {
    reverbLevelValue.textContent = parseFloat(this.value).toFixed(2);
});

// 滤波器频率滑块更新
filterFreq.addEventListener('input', function() {
    filterFreqValue.textContent = this.value + ' Hz';
});

// 混响类型变化监听
reverbType.addEventListener('change', function() {
    if (this.value === 'none') {
        reverbLevelContainer.style.display = 'none';
    } else {
        reverbLevelContainer.style.display = 'flex';
    }
});

// 滤波器类型变化监听
filterType.addEventListener('change', function() {
    if (this.value === 'none') {
        filterFreqContainer.style.display = 'none';
    } else {
        filterFreqContainer.style.display = 'flex';
    }
});

// 均衡器预设按钮
eqPresetButtons.flat.addEventListener('click', function() {
    applyEQPreset('flat');
});

eqPresetButtons.bass.addEventListener('click', function() {
    applyEQPreset('bass');
});

eqPresetButtons.vocal.addEventListener('click', function() {
    applyEQPreset('vocal');
});

eqPresetButtons.bright.addEventListener('click', function() {
    applyEQPreset('bright');
});

// 应用均衡器预设 - 简化，不再应用实时效果
function applyEQPreset(presetName) {
    const preset = eqPresets[presetName];
    eqLow.value = preset.low;
    eqMid.value = preset.mid;
    eqHigh.value = preset.high;
    
    eqLowValue.textContent = preset.low + ' dB';
    eqMidValue.textContent = preset.mid + ' dB';
    eqHighValue.textContent = preset.high + ' dB';
}

// 处理音频按钮点击事件
processBtn.addEventListener('click', async function() {
    if (!audioBuffer) return;
    
    showStatus('正在处理音频...', 'processing');
    
    // 释放之前的处理结果
    if (processedAudioUrl) {
        URL.revokeObjectURL(processedAudioUrl);
    }
    
    try {
        const volume = parseFloat(volumeControl.value);
        const compression = compressionSettings[compressionType.value];
        const noiseGate = useNoiseGate.checked;
        const softClipping = useSoftClipping.checked;
        const eq = {
            low: parseInt(eqLow.value),
            mid: parseInt(eqMid.value),
            high: parseInt(eqHigh.value)
        };
        const targetSampleRate = sampleRateOutput.value === 'original' 
            ? audioBuffer.sampleRate 
            : parseInt(sampleRateOutput.value);
        
        processedAudioBuffer = await processAudio(
            audioBuffer, 
            volume, 
            compression, 
            noiseGate, 
            softClipping, 
            eq,
            targetSampleRate
        );
        
        // 将处理后的AudioBuffer转换为Blob
        const blob = await audioBufferToBlob(processedAudioBuffer);
        processedAudioUrl = URL.createObjectURL(blob);
        
        // 更新播放器源
        audioPlayer.src = processedAudioUrl;
        
        // 显示下载选项
        document.getElementById('downloadOptions').classList.remove('hidden');
        downloadBtn.disabled = false;
        showStatus('音频处理完成，可以预览或下载', 'success');
        
        // 当处理后的音频加载完成时，也同步时长
        if (processedAudioUrl) {
            audioPlayer.addEventListener('loadedmetadata', function syncProcessedDuration() {
                if (processedAudioBuffer) {
                    // 应用相同的时长修复逻辑
                    audioPlayer.dataset.actualDuration = processedAudioBuffer.duration;
                    
                    // 如果是MP3，也应用预览条修复
                    const fileName = audioFileInput.files[0].name.toLowerCase();
                    if (fileName.endsWith('.mp3')) {
                        audioPlayer.addEventListener('timeupdate', syncTimeWithActualDuration);
                    }
                }
                // 只执行一次
                audioPlayer.removeEventListener('loadedmetadata', syncProcessedDuration);
            });
        }
    } catch (error) {
        showStatus('处理音频时出错: ' + error.message, 'error');
    }
});

// 将AudioBuffer转换为Blob
async function audioBufferToBlob(buffer) {
    // 获取选择的格式
    const formatSelect = document.getElementById('audioFormatSelect');
    const selectedFormat = formatSelect ? formatSelect.value : 'wav';
    
    // 显示处理进度提示
    showStatus('正在编码为' + selectedFormat.toUpperCase() + '格式...', 'processing');
    
    let blob;
    
    switch (selectedFormat) {
        case 'mp3':
            blob = await encodeMP3(buffer);
            break;
        case 'ogg':
            blob = await encodeOGG(buffer);
            break;
        case 'wav':
        default:
            blob = encodeWAV(buffer);
            break;
    }
    
    return blob;
}

// 编码为MP3格式
async function encodeMP3(buffer) {
    // 使用MediaRecorder API和音频元素来编码MP3
    return new Promise((resolve, reject) => {
        try {
            const start = performance.now();
            
            // 创建一个临时的音频上下文 - 使用较低采样率可以加快编码速度
            const targetSampleRate = Math.min(buffer.sampleRate, 44100); // 限制最高采样率
            
            // 如果需要降采样
            let processedBuffer = buffer;
            if (buffer.sampleRate > targetSampleRate) {
                processedBuffer = downsampleBuffer(buffer, targetSampleRate);
            }
            
            const offlineCtx = new OfflineAudioContext(
                processedBuffer.numberOfChannels,
                processedBuffer.length,
                processedBuffer.sampleRate
            );
            
            // 创建源节点
            const source = offlineCtx.createBufferSource();
            source.buffer = processedBuffer;
            source.connect(offlineCtx.destination);
            
            // 渲染
            source.start(0);
            offlineCtx.startRendering().then(renderedBuffer => {
                // 创建Media Stream
                const dest = audioContext.createMediaStreamDestination();
                const sourceNode = audioContext.createBufferSource();
                sourceNode.buffer = renderedBuffer;
                sourceNode.connect(dest);
                
                // 优化MP3编码参数 - 更低的比特率可加快编码速度，但会降低质量
                const bitRate = 192000; // 192kbps - 平衡速度和质量
                
                // 使用MediaRecorder录制为MP3
                const recorder = new MediaRecorder(dest.stream, { 
                    mimeType: 'audio/mpeg', 
                    audioBitsPerSecond: bitRate 
                });
                
                const chunks = [];
                recorder.ondataavailable = e => chunks.push(e.data);
                recorder.onstop = () => {
                    const blob = new Blob(chunks, { type: 'audio/mpeg' });
                    const end = performance.now();
                    console.log(`MP3编码完成，耗时: ${(end-start).toFixed(2)}ms`);
                    resolve(blob);
                };
                
                // 开始录制 - 每秒收集一次数据可以减少内存使用
                recorder.start(1000);
                sourceNode.start(0);
                
                // 录制完成后停止 - 添加固定延迟而不是基于持续时间的延迟
                const duration = renderedBuffer.duration * 1000;
                setTimeout(() => {
                    recorder.stop();
                    sourceNode.stop();
                }, duration + 500);
            });
        } catch (err) {
            console.error('MP3编码失败，回退到WAV', err);
            resolve(encodeWAV(buffer));
        }
    });
}

// 编码为OGG格式
async function encodeOGG(buffer) {
    // 使用MediaRecorder API和音频元素来编码OGG
    return new Promise((resolve, reject) => {
        try {
            const start = performance.now();
            
            // 检查浏览器是否支持OGG录制
            if (!MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
                throw new Error('浏览器不支持OGG格式录制');
            }
            
            // 创建一个临时的音频上下文 - 使用较低采样率可以加快编码速度
            const targetSampleRate = Math.min(buffer.sampleRate, 48000); // Opus编码器适合48kHz
            
            // 如果需要降采样
            let processedBuffer = buffer;
            if (buffer.sampleRate > targetSampleRate) {
                processedBuffer = downsampleBuffer(buffer, targetSampleRate);
            }
            
            const offlineCtx = new OfflineAudioContext(
                processedBuffer.numberOfChannels,
                processedBuffer.length,
                processedBuffer.sampleRate
            );
            
            // 创建源节点
            const source = offlineCtx.createBufferSource();
            source.buffer = processedBuffer;
            source.connect(offlineCtx.destination);
            
            // 渲染
            source.start(0);
            offlineCtx.startRendering().then(renderedBuffer => {
                // 创建Media Stream
                const dest = audioContext.createMediaStreamDestination();
                const sourceNode = audioContext.createBufferSource();
                sourceNode.buffer = renderedBuffer;
                sourceNode.connect(dest);
                
                // 使用MediaRecorder录制为OGG
                const recorder = new MediaRecorder(dest.stream, { 
                    mimeType: 'audio/ogg;codecs=opus',
                    audioBitsPerSecond: 128000 // 128kbps - 平衡速度和质量
                });
                
                const chunks = [];
                recorder.ondataavailable = e => chunks.push(e.data);
                recorder.onstop = () => {
                    const blob = new Blob(chunks, { type: 'audio/ogg' });
                    const end = performance.now();
                    console.log(`OGG编码完成，耗时: ${(end-start).toFixed(2)}ms`);
                    resolve(blob);
                };
                
                // 开始录制 - 每秒收集一次数据可以减少内存使用
                recorder.start(1000);
                sourceNode.start(0);
                
                // 录制完成后停止 - 添加固定延迟而不是基于持续时间的延迟
                const duration = renderedBuffer.duration * 1000;
                setTimeout(() => {
                    recorder.stop();
                    sourceNode.stop();
                }, duration + 500);
            });
        } catch (err) {
            console.error('OGG编码失败，回退到WAV', err);
            resolve(encodeWAV(buffer));
        }
    });
}

// 降采样函数 - 用于减少处理数据量
function downsampleBuffer(buffer, targetSampleRate) {
    if (buffer.sampleRate === targetSampleRate) {
        return buffer;
    }
    
    const sampleRateRatio = buffer.sampleRate / targetSampleRate;
    const newLength = Math.round(buffer.length / sampleRateRatio);
    
    const offlineCtx = new OfflineAudioContext(
        buffer.numberOfChannels,
        newLength,
        targetSampleRate
    );
    
    const source = offlineCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(offlineCtx.destination);
    source.start();
    
    // 同步处理降采样，避免使用额外的Promise
    const renderedBuffer = offlineCtx.startRendering();
    
    // 注意：这是同步渲染，可能稍微阻塞主线程，但在编码之前处理是值得的
    return renderedBuffer;
}

// 优化的WAV编码 - 对于大型文件可以分块处理
function encodeWAV(buffer) {
    const start = performance.now();
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    
    const dataLength = buffer.length * blockAlign;
    const bufferLength = 44 + dataLength;
    
    // 使用ArrayBuffer而不是直接使用Float32Array可以减少内存复制
    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);
    
    // RIFF identifier
    writeString(view, 0, 'RIFF');
    // RIFF chunk length
    view.setUint32(4, 36 + dataLength, true);
    // RIFF type
    writeString(view, 8, 'WAVE');
    // format chunk identifier
    writeString(view, 12, 'fmt ');
    // format chunk length
    view.setUint32(16, 16, true);
    // sample format (raw)
    view.setUint16(20, format, true);
    // channel count
    view.setUint16(22, numChannels, true);
    // sample rate
    view.setUint32(24, sampleRate, true);
    // byte rate (sample rate * block align)
    view.setUint32(28, sampleRate * blockAlign, true);
    // block align (channel count * bytes per sample)
    view.setUint16(32, blockAlign, true);
    // bits per sample
    view.setUint16(34, bitDepth, true);
    // data chunk identifier
    writeString(view, 36, 'data');
    // data chunk length
    view.setUint32(40, dataLength, true);
    
    // 写入音频样本数据 - 使用分块处理减少单次循环的内存压力
    const dataOffset = 44;
    let offset = dataOffset;
    
    // 分块大小，每块处理约1MB数据
    const CHUNK_SIZE = 262144; // 每个通道约1MB的浮点数据
    
    for (let chunkStart = 0; chunkStart < buffer.length; chunkStart += CHUNK_SIZE) {
        const chunkEnd = Math.min(chunkStart + CHUNK_SIZE, buffer.length);
        
        for (let i = chunkStart; i < chunkEnd; i++) {
            for (let channel = 0; channel < numChannels; channel++) {
                // 获取样本
                const sample = buffer.getChannelData(channel)[i];
                
                // 将浮点样本[-1,1]转换为16位整数[-32768,32767] - 使用更高效的限制方法
                const int16Sample = (sample < -1 ? -1 : (sample > 1 ? 1 : sample)) * 32767;
                
                // 写入16位PCM样本
                view.setInt16(offset, int16Sample, true);
                offset += bytesPerSample;
            }
        }
    }
    
    const end = performance.now();
    console.log(`WAV编码完成，耗时: ${(end-start).toFixed(2)}ms`);
    return new Blob([view], { type: 'audio/wav' });
}

// 写入字符串到DataView
function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

// 显示状态信息
function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.classList.remove('hidden');
}

// 重置音频状态
function resetAudio() {
    if (processedAudioUrl) {
        URL.revokeObjectURL(processedAudioUrl);
        processedAudioUrl = null;
    }
    
    if (originalAudioUrl) {
        URL.revokeObjectURL(originalAudioUrl);
        originalAudioUrl = null;
    }
    
    processedAudioBuffer = null;
    downloadBtn.disabled = true;
    document.getElementById('downloadOptions').classList.add('hidden');
    document.getElementById('customFileName').value = '';
}

// 下载按钮点击事件
downloadBtn.addEventListener('click', function() {
    if (!processedAudioUrl) return;
    
    const a = document.createElement('a');
    a.href = processedAudioUrl;
    
    // 获取自定义文件名
    const customFileName = document.getElementById('customFileName').value.trim();
    
    // 获取选择的格式
    const formatSelect = document.getElementById('audioFormatSelect');
    const selectedFormat = formatSelect ? formatSelect.value : 'wav';
    
    if (customFileName) {
        // 使用自定义文件名，确保添加正确的扩展名
        if (customFileName.endsWith(`.${selectedFormat}`)) {
            a.download = customFileName;
        } else {
            a.download = `${customFileName}.${selectedFormat}`;
        }
    } else {
        // 使用默认生成的文件名
        const originalFileName = audioFileInput.files[0].name;
        const baseName = originalFileName.substring(0, originalFileName.lastIndexOf('.'));
        a.download = `${baseName}_processed.${selectedFormat}`;
    }
    
    // 触发下载
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
});

// 处理音频（主函数）- 优化版本
async function processAudio(buffer, volume, compression, useNoiseGate, useSoftClipping, eq, targetSampleRate) {
    showStatus('正在处理音频...', 'processing');
    const startTime = performance.now();
    
    // 创建离线音频上下文
    const offlineContext = new OfflineAudioContext(
        buffer.numberOfChannels,
        targetSampleRate === buffer.sampleRate ? buffer.length : Math.floor(buffer.length * targetSampleRate / buffer.sampleRate),
        targetSampleRate
    );
    
    // 创建源节点
    const source = offlineContext.createBufferSource();
    source.buffer = buffer;
    
    // 创建节点链的起点
    let lastNode = source;
    
    // 创建均衡器节点 - 只创建必要的节点
    const activeEQ = {
        low: eq.low !== 0,
        mid: eq.mid !== 0,
        high: eq.high !== 0
    };
    
    if (activeEQ.low || activeEQ.mid || activeEQ.high) {
        // 低频均衡器
        if (activeEQ.low) {
            const lowEQ = offlineContext.createBiquadFilter();
            lowEQ.type = 'lowshelf';
            lowEQ.frequency.value = eqFrequencies.low;
            lowEQ.gain.value = eq.low;
            lastNode.connect(lowEQ);
            lastNode = lowEQ;
        }
        
        // 中频均衡器
        if (activeEQ.mid) {
            const midEQ = offlineContext.createBiquadFilter();
            midEQ.type = 'peaking';
            midEQ.frequency.value = eqFrequencies.mid;
            midEQ.Q.value = 0.8;
            midEQ.gain.value = eq.mid;
            lastNode.connect(midEQ);
            lastNode = midEQ;
        }
        
        // 高频均衡器
        if (activeEQ.high) {
            const highEQ = offlineContext.createBiquadFilter();
            highEQ.type = 'highshelf';
            highEQ.frequency.value = eqFrequencies.high;
            highEQ.gain.value = eq.high;
            lastNode.connect(highEQ);
            lastNode = highEQ;
        }
    }
    
    // 压缩器仅在需要时创建
    if (compression.ratio > 1) {
        const compressor = offlineContext.createDynamicsCompressor();
        compressor.threshold.value = compression.threshold;
        compressor.knee.value = compression.knee;
        compressor.ratio.value = compression.ratio;
        compressor.attack.value = compression.attack;
        compressor.release.value = compression.release;
        
        lastNode.connect(compressor);
        lastNode = compressor;
    }
    
    // 创建增益节点 - 只有当音量不是1.0时才修改
    if (volume !== 1.0) {
    const gainNode = offlineContext.createGain();
    gainNode.gain.value = volume;
    lastNode.connect(gainNode);
        lastNode = gainNode;
    }
    
    // 连接到目标
    lastNode.connect(offlineContext.destination);
    
    // 开始渲染
    source.start(0);
    
    try {
    const renderedBuffer = await offlineContext.startRendering();
    
        // 只有在需要应用后处理效果时才进行处理
        const needsPostProcessing = useNoiseGate || useSoftClipping;
        const finalBuffer = needsPostProcessing ? 
            postProcessBuffer(renderedBuffer, useNoiseGate, useSoftClipping) : 
            renderedBuffer;
            
        const endTime = performance.now();
        console.log(`音频处理完成，耗时: ${(endTime-startTime).toFixed(2)}ms`);
        
        return finalBuffer;
    } catch (error) {
        console.error('处理音频时出错:', error);
        throw error;
    }
}

// 后处理 AudioBuffer 以应用噪声门限和软截断
function postProcessBuffer(buffer, useNoiseGate, useSoftClipping) {
    // 创建与源相同参数的新 buffer
    const newBuffer = audioContext.createBuffer(
        buffer.numberOfChannels,
        buffer.length, 
        buffer.sampleRate
    );
    
    // 应用噪声门限所需的参数
    const noiseGateThreshold = 0.01; // 噪声门限阈值
    const releaseTime = 0.05; // 释放时间（秒）
    const releaseSamples = Math.floor(releaseTime * buffer.sampleRate);
    
    // 软截断函数
    function softClip(sample) {
        // 使用 tanh 函数实现软截断，保留更多动态范围
        return Math.tanh(sample);
    }
    
    // 对每个通道处理样本
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        const newChannelData = newBuffer.getChannelData(channel);
        
        // 找到信号的 RMS 值以确定噪声的基线水平
        let sumOfSquares = 0;
        for (let i = 0; i < channelData.length; i++) {
            sumOfSquares += channelData[i] * channelData[i];
        }
        const rms = Math.sqrt(sumOfSquares / channelData.length);
        
        // 动态调整噪声门限阈值（基于信号的 RMS 值）
        const dynamicThreshold = Math.min(noiseGateThreshold, rms * 0.5);
        
        // 用于噪声门限的状态变量
        let gateOpen = false;
        let releaseCounter = 0;
        let gateGain = 0;
        
        // 处理每个样本
        for (let i = 0; i < channelData.length; i++) {
            let sample = channelData[i];
            
            // 1. 应用噪声门限
            if (useNoiseGate) {
                // 检测当前样本是否超过阈值
                if (Math.abs(sample) > dynamicThreshold) {
                    gateOpen = true;
                    releaseCounter = releaseSamples;
                    gateGain = 1.0;
                } else if (releaseCounter > 0) {
                    // 在释放阶段
                    releaseCounter--;
                    gateGain = releaseCounter / releaseSamples;
                } else {
                    gateOpen = false;
                    gateGain = 0;
                }
                
                // 应用门限增益
                sample *= gateGain;
            }
            
            // 2. 应用软截断/硬截断
            if (useSoftClipping) {
                // 软截断
                sample = softClip(sample);
            } else {
                // 硬截断
                sample = Math.max(-1, Math.min(1, sample));
            }
            
            // 保存处理后的样本
            newChannelData[i] = sample;
        }
    }
    
    return newBuffer;
}