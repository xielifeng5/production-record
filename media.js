// 媒体处理类
class MediaHandler {
    constructor() {
        this.currentStream = null;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.currentCallback = null;
    }

	// 拍照（使用文件选择器，兼容性更好）
	async capturePhoto(callback) {
	    try {
	        const input = document.getElementById('photoInput');
	        if (!input) {
	            alert('当前页面缺少拍照输入控件，请联系管理员检查 photoInput 元素。');
	            return;
	        }

	        // 确保属性正确，最大化调用移动端相机的概率
	        input.setAttribute('accept', 'image/*');
	        input.setAttribute('capture', 'environment');

	        input.onchange = async (e) => {
	            const file = e.target.files[0];
	            if (file) {
	                const reader = new FileReader();
	                reader.onload = (event) => {
	                    callback({
	                        type: 'photo',
	                        data: event.target.result,
	                        timestamp: new Date().getTime()
	                    });
	                };
	                reader.readAsDataURL(file);
	            }
	            input.value = ''; // 重置输入
	        };
	        input.click();
	    } catch (error) {
	        console.error('拍照失败:', error);
	        alert('拍照功能出错，请确保允许相机权限');
	    }
	}

	// 录音
	async recordAudio(callback) {
	    // 优先尝试使用 MediaRecorder（需浏览器支持），失败时自动降级为文件选择器方式
	    const canUseMediaRecorder = typeof navigator !== 'undefined'
	        && navigator.mediaDevices
	        && typeof MediaRecorder !== 'undefined';

	    if (!canUseMediaRecorder) {
	        // 在 iOS Safari / 非 HTTPS / 老旧浏览器场景下，直接使用文件选择器方案
	        this.recordAudioWithFileInput(callback);
	        return;
	    }

	    try {
	        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
	            // 已在录音中，则这次调用改为停止录音
	            this.stopRecording();
	            return;
	        }

	        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
	        this.mediaRecorder = new MediaRecorder(stream);
	        this.recordedChunks = [];

	        this.mediaRecorder.ondataavailable = (e) => {
	            if (e.data.size > 0) {
	                this.recordedChunks.push(e.data);
	            }
	        };

	        this.mediaRecorder.onstop = () => {
	            // 使用实际的 mimeType，避免 Safari 等浏览器因类型不匹配导致无法播放
	            const mimeType = (this.mediaRecorder && this.mediaRecorder.mimeType) || 'audio/webm';
	            const blob = new Blob(this.recordedChunks, { type: mimeType });
	            const reader = new FileReader();
	            reader.onload = (event) => {
	                callback({
	                    type: 'audio',
	                    data: event.target.result,
	                    timestamp: new Date().getTime()
	                });
	            };
	            reader.readAsDataURL(blob);

	            // 停止所有音频轨道
	            stream.getTracks().forEach(track => track.stop());
	        };

	        this.mediaRecorder.start();

	        // 显示录音中的提示
	        const recordingIndicator = document.createElement('div');
	        recordingIndicator.id = 'recordingIndicator';
	        recordingIndicator.innerHTML = '🔴 录音中... <button onclick="window.mediaHandler && window.mediaHandler.stopRecording()">停止</button>';
	        recordingIndicator.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #dc3545; color: white; padding: 15px; border-radius: 8px; z-index: 1000;';
	        document.body.appendChild(recordingIndicator);

	    } catch (error) {
	        console.error('录音失败，将切换为文件上传方式:', error);
	        this.recordAudioWithFileInput(callback);
	    }
	}

    // 使用隐藏的文件输入进行录音（适配 iOS / 不支持 MediaRecorder 的环境）
    recordAudioWithFileInput(callback) {
        try {
            const input = document.getElementById('audioInput');
            if (!input) {
                alert('当前页面缺少录音输入控件，请联系管理员检查 audioInput 元素。');
                return;
            }

	        // 确保属性正确
	        input.setAttribute('accept', 'audio/*');
	        input.setAttribute('capture', 'microphone');

            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        callback({
                            type: 'audio',
                            data: event.target.result,
                            timestamp: new Date().getTime()
                        });
                    };
                    reader.readAsDataURL(file);
                }
                // 重置输入，避免后续选择同一个文件时 onchange 不触发
                input.value = '';
            };

            input.click();
        } catch (error) {
            console.error('基于文件的录音方式失败:', error);
            alert('录音功能出错，请确认浏览器是否允许选择音频文件。');
        }
    }

    // 停止录音
    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
        }
        const indicator = document.getElementById('recordingIndicator');
        if (indicator) indicator.remove();
    }

	// 录像（同样使用文件选择器来提高兼容性）
	async recordVideo(callback) {
	    try {
	        const input = document.getElementById('videoInput');
	        if (!input) {
	            alert('当前页面缺少录像输入控件，请联系管理员检查 videoInput 元素。');
	            return;
	        }

	        // 确保属性正确
	        input.setAttribute('accept', 'video/*');
	        input.setAttribute('capture', 'environment');

	        input.onchange = async (e) => {
	            const file = e.target.files[0];
	            if (file) {
	                const reader = new FileReader();
	                reader.onload = (event) => {
	                    callback({
	                        type: 'video',
	                        data: event.target.result,
	                        timestamp: new Date().getTime()
	                    });
	                };
	                reader.readAsDataURL(file);
	            }
	            input.value = ''; // 重置输入
	        };
	        input.click();
	    } catch (error) {
	        console.error('录像失败:', error);
	        alert('录像功能出错，请确保允许相机权限');
	    }
	}

	// 创建媒体预览元素
	createMediaPreview(mediaData, containerId, onDelete) {
        const container = document.getElementById(containerId);
        if (!container) return null;

        const mediaItem = document.createElement('div');
        mediaItem.className = 'media-item';

        let mediaElement;
        if (mediaData.type === 'photo') {
            mediaElement = document.createElement('img');
            mediaElement.src = mediaData.data;
            mediaElement.alt = '照片';
        } else if (mediaData.type === 'audio') {
            mediaElement = document.createElement('audio');
            mediaElement.src = mediaData.data;
            mediaElement.controls = true;
        } else if (mediaData.type === 'video') {
            mediaElement = document.createElement('video');
            mediaElement.src = mediaData.data;
            mediaElement.controls = true;
            mediaElement.style.maxWidth = '300px';
        }

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.onclick = () => {
            mediaItem.remove();
            if (onDelete) onDelete();
        };

        mediaItem.appendChild(mediaElement);
        mediaItem.appendChild(deleteBtn);
        container.appendChild(mediaItem);

        return mediaData;
    }
}

// 创建全局媒体处理实例
const mediaHandler = new MediaHandler();

// 暴露到 window，确保内联 onclick="window.mediaHandler.xxx()" 可用
if (typeof window !== 'undefined') {
	window.mediaHandler = mediaHandler;
}
