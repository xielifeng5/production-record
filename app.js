// 主应用类
class App {
    constructor() {
        this.pages = [];
        this.pageCount = 0;
        this.currentTargetId = null;
    }

    // 初始化应用
    async init() {
        try {
            await db.init();
            console.log('数据库初始化成功');

            // 添加第一页
            this.addPage();

            // 加载历史记录
            await this.loadRecords();
        } catch (error) {
            console.error('初始化失败:', error);
            alert('应用初始化失败，请刷新页面重试');
        }
    }

    // 添加新页面
    addPage(copyFromPrevious = true) {
        this.pageCount++;
        const pageId = `page-${this.pageCount}`;

        // 获取上一页的数据（如果需要复制）
        let previousData = null;
        if (copyFromPrevious && this.pages.length > 0) {
            const lastPage = this.pages[this.pages.length - 1];
            previousData = this.getPageData(lastPage.id);
        }

        const pageData = {
            id: pageId,
            epImage: previousData?.epImage || null,
            warpYarns: previousData?.warpYarns || [],
            weftYarns: previousData?.weftYarns || [],
            actualDensity: previousData?.actualDensity || '',
            problems: [],
            products: [],
            warpCount: previousData?.warpYarns?.length || 0,
            weftCount: previousData?.weftYarns?.length || 0
        };

        this.pages.push(pageData);
        this.renderPage(pageData);
    }

    // 渲染页面
    renderPage(pageData) {
        const container = document.getElementById('pagesContainer');
        const pageDiv = document.createElement('div');
        pageDiv.className = 'page-wrapper';
        pageDiv.id = pageData.id;

        pageDiv.innerHTML = `
            <div class="page-header">
                <div class="page-title">第 ${this.pageCount} 页</div>
                ${this.pages.length > 1 ? `<button class="page-delete" onclick="app.deletePage('${pageData.id}')">×</button>` : ''}
            </div>

            <!-- EP文件名图片 -->
            <div class="form-row">
                <div class="row-label">📄 EP文件名图片</div>
                <div class="inline-controls">
                    <button class="btn btn-primary" onclick="app.uploadEPImage('${pageData.id}')">📷 上传图片</button>
                    <div id="${pageData.id}-ep-preview" class="ep-image-preview"></div>
                </div>
            </div>

            <!-- 经纱模型 -->
            <div class="form-row">
                <div class="row-label">
                    🧵 经纱模型
                    <button class="yarn-btn yarn-btn-add" onclick="app.addWarpYarn('${pageData.id}')" title="添加经纱">+</button>
                </div>
                <div id="${pageData.id}-warp-items" class="yarn-items"></div>
            </div>

            <!-- 纬纱模型 -->
            <div class="form-row">
                <div class="row-label">
                    🧶 纬纱模型
                    <button class="yarn-btn yarn-btn-add" onclick="app.addWeftYarn('${pageData.id}')" title="添加纬纱">+</button>
                </div>
                <div id="${pageData.id}-weft-items" class="yarn-items"></div>
            </div>

            <!-- 实际纬密值 -->
            <div class="form-row">
                <div class="row-label">📊 实际纬密值</div>
                <div class="inline-controls">
                    <div class="input-with-clear">
                        <input type="number" id="${pageData.id}-density" class="form-control" placeholder="根/10cm" step="0.1" value="${pageData.actualDensity}">
                        <button class="clear-btn" onclick="app.clearInput('${pageData.id}-density')">×</button>
                    </div>
                </div>
            </div>

            <!-- 生产问题记录 -->
            <div class="form-row">
                <div class="row-label">⚠️ 生产问题记录</div>
                <div class="inline-controls">
                    <button class="btn btn-warning" onclick="app.captureProblemPhoto('${pageData.id}')">📷 上传图片</button>
                    <button class="btn btn-warning" onclick="app.recordProblemVideo('${pageData.id}')">🎥 录像</button>
                </div>
                <div id="${pageData.id}-problem-media" class="media-preview"></div>
            </div>

            <!-- 成品记录 -->
            <div class="form-row">
                <div class="row-label">✅ 成品记录</div>
                <div class="inline-controls">
                    <button class="btn btn-info" onclick="app.captureProductPhoto('${pageData.id}')">📷 拍照</button>
                    <button class="btn btn-info" onclick="app.recordProductVideo('${pageData.id}')">🎥 录像</button>
                </div>
                <div id="${pageData.id}-product-media" class="media-preview"></div>
            </div>
        `;

        container.appendChild(pageDiv);

        // 新增页后自动滚动到该页，配合横向滑动更方便
        try {
            pageDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
        } catch (e) {
            // 部分旧浏览器不支持 scrollIntoView 选项，忽略错误
            pageDiv.scrollIntoView();
        }

        // 渲染EP图片（如果有）
        if (pageData.epImage) {
            this.renderEPImage(pageData.id, pageData.epImage);
        }

        // 渲染经纱（如果有）
        if (pageData.warpYarns && pageData.warpYarns.length > 0) {
            pageData.warpYarns.forEach((warp, index) => {
                this.renderWarpYarn(pageData.id, index, warp);
            });
        } else {
            // 默认添加一个经纱
            this.addWarpYarn(pageData.id);
        }

        // 渲染纬纱（如果有）
        if (pageData.weftYarns && pageData.weftYarns.length > 0) {
            pageData.weftYarns.forEach((weft, index) => {
                this.renderWeftYarn(pageData.id, index, weft);
            });
        } else {
            // 默认添加一个纬纱
            this.addWeftYarn(pageData.id);
        }
    }

    // 通用图片选择（与EP文件上传相同的相机/相册调用方式）
    pickImage(callback) {
        const input = document.getElementById('epImageInput');
        if (!input) {
            alert('当前页面缺少图片输入控件，请联系管理员检查 epImageInput 元素。');
            return;
        }

        // 仅接收图片，让浏览器提供“拍照 / 相册 / 文件”等入口
        input.setAttribute('accept', 'image/*');

        input.onchange = (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) {
                input.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                if (typeof callback === 'function') {
                    callback(event.target.result);
                }
            };
            reader.readAsDataURL(file);

            // 重置输入，避免后续选择同一图片时 onchange 不触发
            input.value = '';
        };

        input.click();
    }

    // 上传EP图片（基于统一的图片选择逻辑）
    uploadEPImage(pageId) {
        this.pickImage((imageData) => {
            const page = this.pages.find(p => p.id === pageId);
            if (page) {
                page.epImage = imageData;
                this.renderEPImage(pageId, imageData);
            }
        });
    }

    // 渲染EP图片
    renderEPImage(pageId, imageData) {
        const container = document.getElementById(`${pageId}-ep-preview`);
        container.innerHTML = `
            <img src="${imageData}" alt="EP文件名">
            <button class="ep-image-delete" onclick="app.deleteEPImage('${pageId}')">×</button>
        `;
    }

    // 删除EP图片
    deleteEPImage(pageId) {
        const page = this.pages.find(p => p.id === pageId);
        if (page) {
            page.epImage = null;
            document.getElementById(`${pageId}-ep-preview`).innerHTML = '';
        }
    }

    // 添加经纱
    addWarpYarn(pageId) {
        const page = this.pages.find(p => p.id === pageId);
        if (!page) return;

        if (!page.warpYarns) page.warpYarns = [];

        const warpData = { text: '', media: [] };
        page.warpYarns.push(warpData);
        page.warpCount = page.warpYarns.length;

        this.renderWarpYarn(pageId, page.warpYarns.length - 1, warpData);
    }

    // 渲染经纱
    renderWarpYarn(pageId, index, warpData) {
        const container = document.getElementById(`${pageId}-warp-items`);
        const warpDiv = document.createElement('div');
        warpDiv.className = 'yarn-item';
        warpDiv.id = `${pageId}-warp-${index}`;

        warpDiv.innerHTML = `
            <div class="yarn-row">
                <span class="yarn-label">经${index + 1}</span>
                <input type="text" id="${pageId}-warp-${index}-text" class="yarn-input" placeholder="输入型号..." value="${warpData.text || ''}">
                <button class="yarn-btn yarn-btn-camera" onclick="app.captureYarnPhoto('${pageId}', 'warp', ${index})">📷</button>
                <button class="yarn-btn yarn-btn-audio" onclick="app.recordYarnAudio('${pageId}', 'warp', ${index})">🎤</button>
                <button class="yarn-btn yarn-btn-clear" onclick="app.clearInput('${pageId}-warp-${index}-text')">✕</button>
                <button class="yarn-btn yarn-btn-delete" onclick="app.deleteWarpYarn('${pageId}', ${index})">🗑</button>
            </div>
            <div id="${pageId}-warp-${index}-media" class="media-preview"></div>
        `;

        container.appendChild(warpDiv);

        // 渲染已有媒体
        if (warpData.media && warpData.media.length > 0) {
            warpData.media.forEach((media, mediaIndex) => {
                this.renderYarnMedia(pageId, 'warp', index, mediaIndex, media);
            });
        }
    }

    // 删除经纱
    deleteWarpYarn(pageId, index) {
        const page = this.pages.find(p => p.id === pageId);
        if (!page || !page.warpYarns) return;

        page.warpYarns.splice(index, 1);

        // 重新渲染所有经纱
        const container = document.getElementById(`${pageId}-warp-items`);
        container.innerHTML = '';
        page.warpYarns.forEach((warp, i) => {
            this.renderWarpYarn(pageId, i, warp);
        });
    }

    // 添加纬纱
    addWeftYarn(pageId) {
        const page = this.pages.find(p => p.id === pageId);
        if (!page) return;

        if (!page.weftYarns) page.weftYarns = [];

        const weftData = { text: '', media: [] };
        page.weftYarns.push(weftData);
        page.weftCount = page.weftYarns.length;

        this.renderWeftYarn(pageId, page.weftYarns.length - 1, weftData);
    }

    // 渲染纬纱
    renderWeftYarn(pageId, index, weftData) {
        const container = document.getElementById(`${pageId}-weft-items`);
        const weftDiv = document.createElement('div');
        weftDiv.className = 'yarn-item';
        weftDiv.id = `${pageId}-weft-${index}`;

        weftDiv.innerHTML = `
            <div class="yarn-row">
                <span class="yarn-label">纬${index + 1}</span>
                <input type="text" id="${pageId}-weft-${index}-text" class="yarn-input" placeholder="输入型号..." value="${weftData.text || ''}">
                <button class="yarn-btn yarn-btn-camera" onclick="app.captureYarnPhoto('${pageId}', 'weft', ${index})">📷</button>
                <button class="yarn-btn yarn-btn-audio" onclick="app.recordYarnAudio('${pageId}', 'weft', ${index})">🎤</button>
                <button class="yarn-btn yarn-btn-clear" onclick="app.clearInput('${pageId}-weft-${index}-text')">✕</button>
                <button class="yarn-btn yarn-btn-delete" onclick="app.deleteWeftYarn('${pageId}', ${index})">🗑</button>
            </div>
            <div id="${pageId}-weft-${index}-media" class="media-preview"></div>
        `;

        container.appendChild(weftDiv);

        // 渲染已有媒体
        if (weftData.media && weftData.media.length > 0) {
            weftData.media.forEach((media, mediaIndex) => {
                this.renderYarnMedia(pageId, 'weft', index, mediaIndex, media);
            });
        }
    }

    // 删除纬纱
    deleteWeftYarn(pageId, index) {
        const page = this.pages.find(p => p.id === pageId);
        if (!page || !page.weftYarns) return;

        page.weftYarns.splice(index, 1);

        // 重新渲染所有纬纱
        const container = document.getElementById(`${pageId}-weft-items`);
        container.innerHTML = '';
        page.weftYarns.forEach((weft, i) => {
            this.renderWeftYarn(pageId, i, weft);
        });
    }

    // 拍摄纱线照片（统一使用EP同款图片选择方式）
    captureYarnPhoto(pageId, type, index) {
        this.pickImage((imageData) => {
            const page = this.pages.find(p => p.id === pageId);
            if (!page) return;

            const yarns = type === 'warp' ? page.warpYarns : page.weftYarns;
            if (!yarns || !yarns[index]) return;

            if (!yarns[index].media) yarns[index].media = [];
            const mediaData = {
                type: 'photo',
                data: imageData,
                timestamp: new Date().getTime()
            };
            yarns[index].media.push(mediaData);

            const mediaIndex = yarns[index].media.length - 1;
            this.renderYarnMedia(pageId, type, index, mediaIndex, mediaData);
        });
    }

    // 录制纱线视频（原录音功能升级为录像）
    recordYarnAudio(pageId, type, index) {
        mediaHandler.recordVideo((mediaData) => {
            const page = this.pages.find(p => p.id === pageId);
            if (!page) return;

            const yarns = type === 'warp' ? page.warpYarns : page.weftYarns;
            if (!yarns || !yarns[index]) return;

            if (!yarns[index].media) yarns[index].media = [];
            yarns[index].media.push(mediaData);

            const mediaIndex = yarns[index].media.length - 1;
            this.renderYarnMedia(pageId, type, index, mediaIndex, mediaData);
        });
    }

    // 渲染纱线媒体
    renderYarnMedia(pageId, type, yarnIndex, mediaIndex, mediaData) {
        const container = document.getElementById(`${pageId}-${type}-${yarnIndex}-media`);
        const mediaDiv = document.createElement('div');
        mediaDiv.className = 'media-item';
        mediaDiv.id = `${pageId}-${type}-${yarnIndex}-media-${mediaIndex}`;

        let mediaElement;
        if (mediaData.type === 'photo') {
            mediaElement = document.createElement('img');
            mediaElement.src = mediaData.data;
        } else if (mediaData.type === 'audio') {
            // 兼容旧数据中的音频记录
            mediaElement = document.createElement('audio');
            mediaElement.src = mediaData.data;
            mediaElement.controls = true;
        } else if (mediaData.type === 'video') {
            mediaElement = document.createElement('video');
            mediaElement.src = mediaData.data;
            mediaElement.controls = true;
        }

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.onclick = () => this.deleteYarnMedia(pageId, type, yarnIndex, mediaIndex);

        mediaDiv.appendChild(mediaElement);
        mediaDiv.appendChild(deleteBtn);
        container.appendChild(mediaDiv);
    }

    // 删除纱线媒体
    deleteYarnMedia(pageId, type, yarnIndex, mediaIndex) {
        const page = this.pages.find(p => p.id === pageId);
        if (!page) return;

        const yarns = type === 'warp' ? page.warpYarns : page.weftYarns;
        if (!yarns || !yarns[yarnIndex]) return;

        yarns[yarnIndex].media.splice(mediaIndex, 1);

        // 重新渲染媒体
        const container = document.getElementById(`${pageId}-${type}-${yarnIndex}-media`);
        container.innerHTML = '';
        yarns[yarnIndex].media.forEach((media, i) => {
            this.renderYarnMedia(pageId, type, yarnIndex, i, media);
        });
    }

    // 上传问题图片（原录音按钮改为图片上传）
    captureProblemPhoto(pageId) {
        this.pickImage((imageData) => {
            const page = this.pages.find(p => p.id === pageId);
            if (!page) return;

            if (!page.problems) page.problems = [];
            const mediaData = {
                type: 'photo',
                data: imageData,
                timestamp: new Date().getTime()
            };
            page.problems.push(mediaData);

            this.renderProblemMedia(pageId, page.problems.length - 1, mediaData);
        });
    }

    // 录制问题视频
    recordProblemVideo(pageId) {
        mediaHandler.recordVideo((mediaData) => {
            const page = this.pages.find(p => p.id === pageId);
            if (!page) return;

            if (!page.problems) page.problems = [];
            page.problems.push(mediaData);

            this.renderProblemMedia(pageId, page.problems.length - 1, mediaData);
        });
    }

    // 渲染问题媒体
    renderProblemMedia(pageId, mediaIndex, mediaData) {
        const container = document.getElementById(`${pageId}-problem-media`);
        const mediaDiv = document.createElement('div');
        mediaDiv.className = 'media-item';

        let mediaElement;
        if (mediaData.type === 'photo') {
            mediaElement = document.createElement('img');
            mediaElement.src = mediaData.data;
        } else if (mediaData.type === 'audio') {
            // 兼容旧的音频问题记录
            mediaElement = document.createElement('audio');
            mediaElement.src = mediaData.data;
            mediaElement.controls = true;
        } else if (mediaData.type === 'video') {
            mediaElement = document.createElement('video');
            mediaElement.src = mediaData.data;
            mediaElement.controls = true;
        }

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.onclick = () => this.deleteProblemMedia(pageId, mediaIndex);

        mediaDiv.appendChild(mediaElement);
        mediaDiv.appendChild(deleteBtn);
        container.appendChild(mediaDiv);
    }

    // 删除问题媒体
    deleteProblemMedia(pageId, mediaIndex) {
        const page = this.pages.find(p => p.id === pageId);
        if (!page || !page.problems) return;

        page.problems.splice(mediaIndex, 1);

        const container = document.getElementById(`${pageId}-problem-media`);
        container.innerHTML = '';
        page.problems.forEach((media, i) => {
            this.renderProblemMedia(pageId, i, media);
        });
    }

    // 拍摄成品照片（统一使用EP同款图片选择方式）
    captureProductPhoto(pageId) {
        this.pickImage((imageData) => {
            const page = this.pages.find(p => p.id === pageId);
            if (!page) return;

            if (!page.products) page.products = [];
            const mediaData = {
                type: 'photo',
                data: imageData,
                timestamp: new Date().getTime()
            };
            page.products.push(mediaData);

            this.renderProductMedia(pageId, page.products.length - 1, mediaData);
        });
    }

    // 录制成品视频
    recordProductVideo(pageId) {
        mediaHandler.recordVideo((mediaData) => {
            const page = this.pages.find(p => p.id === pageId);
            if (!page) return;

            if (!page.products) page.products = [];
            page.products.push(mediaData);

            this.renderProductMedia(pageId, page.products.length - 1, mediaData);
        });
    }

    // 渲染成品媒体
    renderProductMedia(pageId, mediaIndex, mediaData) {
        const container = document.getElementById(`${pageId}-product-media`);
        const mediaDiv = document.createElement('div');
        mediaDiv.className = 'media-item';

        let mediaElement;
        if (mediaData.type === 'photo') {
            mediaElement = document.createElement('img');
            mediaElement.src = mediaData.data;
        } else if (mediaData.type === 'video') {
            mediaElement = document.createElement('video');
            mediaElement.src = mediaData.data;
            mediaElement.controls = true;
        }

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.onclick = () => this.deleteProductMedia(pageId, mediaIndex);

        mediaDiv.appendChild(mediaElement);
        mediaDiv.appendChild(deleteBtn);
        container.appendChild(mediaDiv);
    }

    // 删除成品媒体
    deleteProductMedia(pageId, mediaIndex) {
        const page = this.pages.find(p => p.id === pageId);
        if (!page || !page.products) return;

        page.products.splice(mediaIndex, 1);

        const container = document.getElementById(`${pageId}-product-media`);
        container.innerHTML = '';
        page.products.forEach((media, i) => {
            this.renderProductMedia(pageId, i, media);
        });
    }

    // 清空输入框
    clearInput(inputId) {
        const input = document.getElementById(inputId);
        if (input) {
            input.value = '';
            input.focus();
        }
    }

    // 删除页面
    deletePage(pageId) {
        if (this.pages.length <= 1) {
            alert('至少需要保留一页');
            return;
        }

        if (!confirm('确定要删除这一页吗？')) return;

        this.pages = this.pages.filter(p => p.id !== pageId);
        document.getElementById(pageId).remove();
    }

    // 获取页面数据
    getPageData(pageId) {
        const page = this.pages.find(p => p.id === pageId);
        if (!page) return null;

        // 收集文本输入
        if (page.warpYarns) {
            page.warpYarns.forEach((warp, index) => {
                const input = document.getElementById(`${pageId}-warp-${index}-text`);
                if (input) warp.text = input.value;
            });
        }

        if (page.weftYarns) {
            page.weftYarns.forEach((weft, index) => {
                const input = document.getElementById(`${pageId}-weft-${index}-text`);
                if (input) weft.text = input.value;
            });
        }

        const densityInput = document.getElementById(`${pageId}-density`);
        if (densityInput) page.actualDensity = densityInput.value;

        return page;
    }

    // 保存所有页面
    async saveAllPages() {
        try {
            if (this.pages.length === 0) {
                alert('没有可保存的页面');
                return;
            }

            // 收集所有页面数据
            const allPagesData = this.pages.map(page => this.getPageData(page.id));

            // 验证
            let hasError = false;
            allPagesData.forEach((page, index) => {
                if (!page.epImage) {
                    alert(`第 ${index + 1} 页缺少EP文件名图片`);
                    hasError = true;
                }
            });

            if (hasError) return;

            // 保存到数据库
            const record = {
                timestamp: new Date().getTime(),
                pages: allPagesData
            };

            await db.saveRecord(record);

            alert(`✓ 成功保存 ${this.pages.length} 页记录！`);

            // 询问是否重置
            if (confirm('是否清空当前页面，开始新的记录？')) {
                this.resetAllPages();
            }

        } catch (error) {
            console.error('保存失败:', error);
            alert('保存失败，请重试');
        }
    }

    // 重置所有页面
    resetAllPages() {
        this.pages = [];
        this.pageCount = 0;
        document.getElementById('pagesContainer').innerHTML = '';
        this.addPage(false);
    }

    // 加载历史记录
    async loadRecords() {
        try {
            const records = await db.getAllRecords();
            this.displayRecords(records);
        } catch (error) {
            console.error('加载记录失败:', error);
        }
    }

    // 显示记录列表
    displayRecords(records) {
        const container = document.getElementById('recordsContainer');

        if (records.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">暂无记录</p>';
            return;
        }

        // 按时间倒序排列
        records.sort((a, b) => b.timestamp - a.timestamp);

        container.innerHTML = records.map(record => {
            const date = new Date(record.timestamp);
            const dateStr = date.toLocaleString('zh-CN');

            const pageCount = record.pages ? record.pages.length : 0;

            return `
                <div class="record-card" onclick="app.viewRecord(${record.id})">
                    <div class="record-header">
                        <div class="record-title">📄 生产记录</div>
                        <div class="record-date">${dateStr}</div>
                    </div>
                    <div class="record-info">
                        <div class="info-item">📄 页数: ${pageCount}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // 查看记录详情
    async viewRecord(id) {
        try {
            const record = await db.getRecord(id);
            if (!record) return;

            const date = new Date(record.timestamp).toLocaleString('zh-CN');

            let html = `
                <h2>📄 生产记录详情</h2>
                <p style="color: #666; margin-bottom: 20px;">记录时间: ${date}</p>
            `;

            if (record.pages && record.pages.length > 0) {
                record.pages.forEach((page, pageIndex) => {
                    html += `
                        <div style="margin-bottom: 30px; padding: 20px; background: #f8f9fa; border-radius: 10px;">
                            <h3 style="color: #667eea; margin-bottom: 15px;">第 ${pageIndex + 1} 页</h3>

                            ${page.epImage ? `
                                <div style="margin-bottom: 15px;">
                                    <h4>📄 EP文件名图片</h4>
                                    <img src="${page.epImage}" style="width: 33.33vw; max-width: 100%; height: auto; max-height: 300px; border-radius: 8px;">
                                </div>
                            ` : ''}

                            ${page.warpYarns && page.warpYarns.length > 0 ? `
                                <div style="margin-bottom: 15px;">
                                    <h4>🧵 经纱模型</h4>
                                    ${page.warpYarns.map((warp, index) => `
                                        <div style="margin: 10px 0; padding: 10px; background: white; border-radius: 5px;">
                                            <strong>经纱 ${index + 1}:</strong> ${warp.text || '无文本'}
                                            ${this.renderMediaList(warp.media)}
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}

                            ${page.weftYarns && page.weftYarns.length > 0 ? `
                                <div style="margin-bottom: 15px;">
                                    <h4>🧶 纬纱模型</h4>
                                    ${page.weftYarns.map((weft, index) => `
                                        <div style="margin: 10px 0; padding: 10px; background: white; border-radius: 5px;">
                                            <strong>纬纱 ${index + 1}:</strong> ${weft.text || '无文本'}
                                            ${this.renderMediaList(weft.media)}
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}

                            ${page.actualDensity ? `
                                <div style="margin-bottom: 15px;">
                                    <h4>📊 实际纬密值</h4>
                                    <p>${page.actualDensity} 根/10cm</p>
                                </div>
                            ` : ''}

                            ${page.problems && page.problems.length > 0 ? `
                                <div style="margin-bottom: 15px;">
                                    <h4>⚠️ 生产问题记录</h4>
                                    ${this.renderMediaList(page.problems)}
                                </div>
                            ` : ''}

                            ${page.products && page.products.length > 0 ? `
                                <div style="margin-bottom: 15px;">
                                    <h4>✅ 成品记录</h4>
                                    ${this.renderMediaList(page.products)}
                                </div>
                            ` : ''}
                        </div>
                    `;
                });
            }

            html += `
                <div style="margin-top: 30px; display: flex; gap: 10px; justify-content: center;">
                    <button class="btn btn-danger" onclick="app.deleteRecord(${record.id})">删除记录</button>
                    <button class="btn btn-secondary" onclick="app.closeModal()">关闭</button>
                </div>
            `;

            document.getElementById('modalBody').innerHTML = html;
            document.getElementById('modal').style.display = 'block';

        } catch (error) {
            console.error('查看记录失败:', error);
        }
    }


    // 渲染媒体列表
    renderMediaList(mediaList) {
        if (!mediaList || mediaList.length === 0) return '';

        return `<div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px;">
            ${mediaList.map(media => {
                if (media.type === 'photo') {
                    return `<img src="${media.data}" style="max-width: 200px; max-height: 200px; border-radius: 5px;">`;
                } else if (media.type === 'audio') {
                    return `<audio src="${media.data}" controls style="width: 300px;"></audio>`;
                } else if (media.type === 'video') {
                    return `<video src="${media.data}" controls style="max-width: 300px; max-height: 300px; border-radius: 5px;"></video>`;
                }
                return '';
            }).join('')}
        </div>`;
    }

    // 删除记录
    async deleteRecord(id) {
        if (!confirm('确定要删除这条记录吗？')) return;

        try {
            await db.deleteRecord(id);
            alert('✓ 记录已删除');
            this.closeModal();
            await this.loadRecords();
        } catch (error) {
            console.error('删除失败:', error);
            alert('删除失败，请重试');
        }
    }

    // 搜索记录
    async searchRecords() {
        const searchTerm = document.getElementById('searchInput').value;
        if (!searchTerm) {
            await this.loadRecords();
            return;
        }

        try {
            const allRecords = await db.getAllRecords();
            const filtered = allRecords.filter(record => {
                const dateStr = new Date(record.timestamp).toLocaleString('zh-CN');
                return dateStr.includes(searchTerm);
            });
            this.displayRecords(filtered);
        } catch (error) {
            console.error('搜索失败:', error);
        }
    }

    // 按日期筛选
    async filterByDate() {
        const date = document.getElementById('dateFilter').value;
        if (!date) {
            await this.loadRecords();
            return;
        }

        try {
            const records = await db.filterByDate(date);
            this.displayRecords(records);
        } catch (error) {
            console.error('筛选失败:', error);
        }
    }

    // 显示记录列表
    showRecordsList() {
        document.getElementById('pagesContainer').style.display = 'none';
        document.querySelector('.bottom-actions').style.display = 'none';
        document.getElementById('recordsList').style.display = 'block';
        this.loadRecords();
    }

    // 返回表单
    showRecordForm() {
        document.getElementById('pagesContainer').style.display = 'block';
        document.querySelector('.bottom-actions').style.display = 'flex';
        document.getElementById('recordsList').style.display = 'none';
    }

    // 关闭模态框
    closeModal() {
        document.getElementById('modal').style.display = 'none';
    }

    // 导出数据
    async exportData() {
        try {
            const records = await db.getAllRecords();

            if (records.length === 0) {
                alert('暂无数据可导出');
                return;
            }

            // 准备导出数据
            const exportData = records.map(record => ({
                记录时间: new Date(record.timestamp).toLocaleString('zh-CN'),
                页数: record.pages ? record.pages.length : 0,
                详细信息: record.pages ? record.pages.map((page, index) => ({
                    页码: index + 1,
                    经纱数量: page.warpYarns ? page.warpYarns.length : 0,
                    纬纱数量: page.weftYarns ? page.weftYarns.length : 0,
                    实际纬密: page.actualDensity || '未填写',
                    问题记录数: page.problems ? page.problems.length : 0,
                    成品记录数: page.products ? page.products.length : 0
                })) : []
            }));

            // 转换为JSON
            const jsonStr = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            // 下载文件
            const a = document.createElement('a');
            a.href = url;
            a.download = `生产记录_${new Date().toISOString().split('T')[0]}.json`;
            a.click();

            URL.revokeObjectURL(url);
            alert('✓ 数据导出成功！');

        } catch (error) {
            console.error('导出失败:', error);
            alert('导出失败，请重试');
        }
    }
}

// 创建全局应用实例
const app = new App();

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', () => {
    app.init();
});

// 点击模态框外部关闭
window.onclick = (event) => {
    const modal = document.getElementById('modal');
    if (event.target === modal) {
        app.closeModal();
    }
};

