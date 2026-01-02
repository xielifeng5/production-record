// 媒体处理类
class MediaHandler {
    constructor() {
        this.currentStream = null;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.currentCallback = null;
    }

    // 拍照
    async capturePhoto(callback) {
        try {
            // 使用文件选择器（兼容性更好）
            const input = document.getElementById('photoInput');
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
        try {
            if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
                // 停止录音
                this.mediaRecorder.stop();
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
                const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
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
            recordingIndicator.innerHTML = '🔴 录音中... <button onclick="mediaHandler.stopRecording()">停止</button>';
            recordingIndicator.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #dc3545; color: white; padding: 15px; border-radius: 8px; z-index: 1000;';
            document.body.appendChild(recordingIndicator);

        } catch (error) {
            console.error('录音失败:', error);
            alert('录音功能出错，请确保允许麦克风权限');
        }
    }

    // 停止录音
    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
            const indicator = document.getElementById('recordingIndicator');
            if (indicator) indicator.remove();
        }
    }

    // 录像
    async recordVideo(callback) {
        try {
            // 使用文件选择器（兼容性更好）
            const input = document.getElementById('videoInput');
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

