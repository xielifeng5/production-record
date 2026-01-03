// 主应用类
class App {
    constructor() {
        this.pages = [];
        this.pageCount = 0;
	        this.currentTargetId = null;
	        this.currentRecordId = null; // 当前正在编辑的记录ID，null 表示新建

	        // Stack（项目）导航状态（第 1、2 层）
	        this.currentStackId = null;      // 当前所在项目的 ID，null 表示“未分组”
	        this.currentStackName = '未分组'; // 仅用于界面展示

	        // 多页编辑器导航状态
	        this.currentPageIndex = 0; // 当前显示的页面索引
    }

		    // 初始化应用
		    async init() {
		        try {
		            await db.init();
		            console.log('数据库初始化成功');
		
		            const stacksViewEl = document.getElementById('stacksView');
		
		            if (stacksViewEl) {
		                // 桌面版：有项目画廊，显示项目画廊（第 1 层）
		                this.showStacksView();
		            } else {
		                // 手机版：没有项目画廊，直接进入编辑器（新建一条空记录）
		                this.resetAllPages();
		            }
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

        // 跳转到新页面并更新指示器
        this.currentPageIndex = this.pages.length - 1;
        this.updatePageIndicators();
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
                <button class="yarn-btn yarn-btn-audio" onclick="app.recordYarnAudio('${pageId}', 'warp', ${index})">�</button>
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
                <button class="yarn-btn yarn-btn-audio" onclick="app.recordYarnAudio('${pageId}', 'weft', ${index})">�</button>
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
	
	            // 根据当前状态决定是新建记录还是更新记录
	            if (this.currentRecordId != null) {
	                // 更新现有记录
	                const existing = await db.getRecord(this.currentRecordId);
	                if (!existing) {
	                    alert('原记录不存在，无法更新，将另存为新记录。');
	                } else {
	                    existing.pages = allPagesData;
	                    // 更新修改时间和日期，便于排序和按日期筛选
	                    existing.timestamp = new Date().getTime();
	                    existing.date = new Date().toISOString().split('T')[0];
	                    await db.updateRecord(existing);
	
	                    alert(`✓ 记录已更新（共 ${this.pages.length} 页）！`);
	                    // 编辑模式下通常继续留在当前记录中，如需新建可手动点击重置
	                    return;
	                }
	            }
	
	            // 如果不是编辑模式，或原记录不存在，则保存为新记录
	            const record = {
	                pages: allPagesData,
	                // 将记录归属于当前项目（第 2 层），null 表示“未分组”
	                stackId: this.currentStackId != null ? this.currentStackId : null
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
	        this.currentRecordId = null;
	        document.getElementById('pagesContainer').innerHTML = '';
	        this.addPage(false);
	        this.updateEditorStatus();
	    }

	    // ========================
	    // Stack（项目）与列表视图
	    // ========================

	    // 显示 Stack 画廊（第 1 层）
	    async showStacksView() {
	        const pagesEl = document.getElementById('pagesContainer');
	        const bottomEl = document.querySelector('.bottom-actions');
	        const recordsListEl = document.getElementById('recordsList');
	        const stacksViewEl = document.getElementById('stacksView');

	        if (pagesEl) pagesEl.style.display = 'none';
	        if (bottomEl) bottomEl.style.display = 'none';
	        if (recordsListEl) recordsListEl.style.display = 'none';
	        if (stacksViewEl) stacksViewEl.style.display = 'block';

	        // 回到项目画廊时，清空当前项目选择
	        this.currentStackId = null;
	        this.currentStackName = '未分组';

	        const statusEl = document.getElementById('editorStatus');
	        if (statusEl) {
	            statusEl.textContent = '📚 当前：项目画廊';
	        }

	        await this.loadStacks();
	    }

	    // 加载所有项目及其下记录数量
	    async loadStacks() {
	        try {
	            const stacks = db.getAllStacks ? await db.getAllStacks() : [];
	            const records = await db.getAllRecords();
	            this.displayStacks(stacks, records);
	        } catch (error) {
	            console.error('加载项目失败:', error);
	        }
	    }

	    // 渲染 Stack 画廊
		    displayStacks(stacks, records) {
		        const container = document.getElementById('stacksContainer');
		        if (!container) return;

		        const recordsByStack = new Map();
		        const unstackedRecords = [];

		        (records || []).forEach(record => {
		            const sid = record.stackId != null ? record.stackId : null;
		            if (sid === null) {
		                unstackedRecords.push(record);
		            } else {
		                if (!recordsByStack.has(sid)) {
		                    recordsByStack.set(sid, []);
		                }
		                recordsByStack.get(sid).push(record);
		            }
		        });

		        // 未分组记录按时间倒序，便于展示缩略图
		        unstackedRecords.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

		        container.innerHTML = '';

		        // 已命名的项目（类似 Procreate 的“堆叠”卡片）
		        if (stacks && stacks.length > 0) {
		            const sortedStacks = [...stacks].sort((a, b) => {
		                const at = a.createdAt || 0;
		                const bt = b.createdAt || 0;
		                return bt - at;
		            });

		            sortedStacks.forEach(stack => {
		                const list = recordsByStack.get(stack.id) || [];
		                const count = list.length;
		                const latestTs = list.length > 0 ? Math.max(...list.map(r => r.timestamp || 0)) : 0;
		                const latestStr = latestTs ? new Date(latestTs).toLocaleString('zh-CN') : '';

		                // 取前 1~3 条记录的首张 EP 图片作为项目缩略图
		                const previewRecords = list.slice(0, 3);
		                const previewImgs = previewRecords
		                    .map(r => (r.pages && r.pages[0] && r.pages[0].epImage) ? r.pages[0].epImage : null)
		                    .filter(Boolean);

		                const thumbHtml = previewImgs.length > 0
		                    ? `<div class="stack-thumb">
		                            ${previewImgs.map((img, idx) => `
		                                <div class="stack-thumb-layer layer-${idx + 1}">
		                                    <img src="${img}" alt="项目缩略图">
		                                </div>
		                            `).join('')}
		                       </div>`
		                    : `<div class="stack-thumb stack-thumb-empty"></div>`;

		                container.innerHTML += `
		                    <div class="stack-card" data-stack-id="${stack.id}" onclick="app.openStack(${stack.id})">
		                        ${thumbHtml}
		                        <div class="stack-info">
		                            <div class="stack-name">${stack.name || '未命名项目'}</div>
		                            <div class="stack-meta">${count} 条记录${latestStr ? ' · ' + latestStr : ''}</div>
		                        </div>
		                    </div>
		                `;
		            });
		        }

		        // 未分组的单个记录，直接散落在画廊中，点击即进入编辑
		        if (unstackedRecords.length > 0) {
		            unstackedRecords.forEach(record => {
		                const date = record.timestamp ? new Date(record.timestamp).toLocaleString('zh-CN') : '';
		                const pageCount = record.pages ? record.pages.length : 0;
		                const title = record.name && record.name.trim() ? record.name : '未命名记录';
		                const thumb = record.pages && record.pages[0] && record.pages[0].epImage;

		                container.innerHTML += `
		                    <div class="record-card root-record-card" onclick="app.editRecord(${record.id})">
		                        <div class="record-thumb">
		                            ${thumb
		                                ? `<img src="${thumb}" alt="记录缩略图">`
		                                : '<div class="record-thumb-placeholder"></div>'}
		                        </div>
		                        <div class="record-meta">
		                            <div class="record-title">${title}</div>
		                            <div class="record-sub">${pageCount} 页${date ? ' · ' + date : ''}</div>
		                        </div>
		                    </div>
		                `;
		            });
		        }

		        if (!container.innerHTML) {
		            container.innerHTML = '<p class="empty-text">暂无记录，请点击右上角“＋”创建</p>';
		        }
		    }

	    // 打开指定项目（第 2 层：项目内记录列表）
	    async openStack(stackId) {
	        try {
	            this.currentStackId = stackId != null ? stackId : null;

	            if (this.currentStackId === null) {
	                this.currentStackName = '未分组';
	            } else if (db.getStack) {
	                const stack = await db.getStack(this.currentStackId);
	                this.currentStackName = stack && stack.name ? stack.name : '未命名项目';
	            } else {
	                this.currentStackName = '未命名项目';
	            }

	            const allRecords = await db.getAllRecords();
	            const records = allRecords.filter(r => {
	                const sid = r.stackId != null ? r.stackId : null;
	                return this.currentStackId === null ? sid === null : sid === this.currentStackId;
	            });

	            this.showStackRecords(records);
	        } catch (error) {
	            console.error('打开项目失败:', error);
	        }
	    }

		    // 渲染项目内记录列表（第 2 层）
		    showStackRecords(records) {
		        const stacksViewEl = document.getElementById('stacksView');
		        const recordsListEl = document.getElementById('recordsList');
		        const pagesEl = document.getElementById('pagesContainer');
		        const bottomEl = document.querySelector('.bottom-actions');

		        if (stacksViewEl) stacksViewEl.style.display = 'none';
		        if (pagesEl) pagesEl.style.display = 'none';
		        if (bottomEl) bottomEl.style.display = 'none';
		        if (recordsListEl) recordsListEl.style.display = 'block';

		        const headerTitleEl = document.getElementById('stackTitle')
		            || document.querySelector('#recordsList .records-header h2');
		        if (headerTitleEl) {
		            headerTitleEl.textContent = this.currentStackId === null
		                ? '未分组'
		                : (this.currentStackName || '未命名项目');
		        }

		        const statusEl = document.getElementById('editorStatus');
		        if (statusEl) {
		            if (this.currentStackId === null) {
		                statusEl.textContent = '📂 当前：未分组记录列表';
		            } else {
		                statusEl.textContent = `📂 当前项目：${this.currentStackName || '未命名项目'}`;
		            }
		        }

		        this.displayRecords(records || []);
		    }

	    // 新建项目
	    async createStack() {
	        const name = prompt('请输入新项目的名称：');
	        if (!name) return;

	        try {
	            const id = await db.saveStack({ name });
	            this.currentStackId = id;
	            this.currentStackName = name;
	            // 创建后直接进入该项目的记录列表（目前为空）
	            await this.openStack(id);
	        } catch (error) {
	            console.error('创建项目失败:', error);
	            alert('创建项目失败，请重试');
	        }
	    }

	    // 加载历史记录（兼容旧调用，基于当前项目过滤）
	    async loadRecords(stackId = this.currentStackId) {
	        try {
	            const all = await db.getAllRecords();
	            const targetId = stackId != null ? stackId : null;
	            const records = all.filter(r => {
	                const sid = r.stackId != null ? r.stackId : null;
	                return targetId === null ? sid === null : sid === targetId;
	            });
	            this.displayRecords(records);
	        } catch (error) {
	            console.error('加载记录失败:', error);
	        }
	    }

		    // 显示记录列表（第 2 层项目内画廊）
		    displayRecords(records) {
		        const container = document.getElementById('recordsContainer');
		        if (!container) return;

		        if (!records || records.length === 0) {
		            container.innerHTML = '<p class="records-empty">暂无记录</p>';
		            return;
		        }

		        // 按时间倒序排列，最近编辑的在前
		        records.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

		        container.innerHTML = records.map(record => {
		            const dateStr = record.timestamp
		                ? new Date(record.timestamp).toLocaleString('zh-CN')
		                : '';
		            const pageCount = record.pages ? record.pages.length : 0;
		            const title = record.name && record.name.trim()
		                ? record.name.trim()
		                : '未命名记录';
		            const thumb = record.pages && record.pages[0] && record.pages[0].epImage;

		            return `
		                <div class="record-card" data-record-id="${record.id}" onclick="app.editRecord(${record.id})">
		                    <div class="record-thumb">
		                        ${thumb
		                            ? `<img src="${thumb}" alt="记录缩略图">`
		                            : '<div class="record-thumb-placeholder"></div>'}
		                    </div>
		                    <div class="record-meta">
		                        <div class="record-title">${title}</div>
		                        <div class="record-sub">${pageCount} 页${dateStr ? ' · ' + dateStr : ''}</div>
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
	            const title = record.name && record.name.trim() ? record.name.trim() : '生产记录详情';
	
	            let stackLabel = '未分组';
	            if (record.stackId != null && db.getStack) {
	                try {
	                    const stack = await db.getStack(record.stackId);
	                    stackLabel = stack && stack.name ? stack.name : `项目 #${record.stackId}`;
	                } catch (e) {
	                    console.warn('获取项目信息失败', e);
	                    stackLabel = `项目 #${record.stackId}`;
	                }
	            } else if (record.stackId != null) {
	                stackLabel = `项目 #${record.stackId}`;
	            }

	            let html = `
	                <h2>📄 ${title}</h2>
	                <p style="color: #666; margin-bottom: 6px;">记录时间: ${date}</p>
	                <p style="color: #666; margin-bottom: 20px;">所在项目: ${stackLabel}</p>
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
	                <div style="margin-top: 30px; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
	                    <button class="btn btn-primary" onclick="app.editRecord(${record.id})">✏️ 编辑此记录</button>
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

	    // 在编辑器中打开指定记录（第 3 层：EP 多页编辑器）
	    async editRecord(id) {
	        try {
	            // 关闭详情弹窗（如果当前是从详情进入）
	            this.closeModal();

	            const record = await db.getRecord(id);
	            if (!record) {
	                alert('未找到该记录');
	                return;
	            }
		            
		            this.currentRecordId = id;

			            // 同步当前项目信息，便于从编辑器返回项目列表
			            this.currentStackId = record.stackId != null ? record.stackId : null;
			            if (this.currentStackId === null) {
			                this.currentStackName = '未分组';
			            } else if (db.getStack) {
			                try {
			                    const stack = await db.getStack(this.currentStackId);
			                    this.currentStackName = stack && stack.name ? stack.name : '未命名项目';
			                } catch (e) {
			                    console.warn('获取项目信息失败', e);
			                    this.currentStackName = '未命名项目';
			                }
			            } else {
			                this.currentStackName = '未命名项目';
			            }

	            // 清空当前编辑内容
	            this.pages = [];
	            this.pageCount = 0;
	            const container = document.getElementById('pagesContainer');
	            if (container) {
	                container.innerHTML = '';
	            }

	            if (record.pages && record.pages.length > 0) {
	                record.pages.forEach((savedPage) => {
	                    this.pageCount++;
	                    const pageId = `page-${this.pageCount}`;

	                    const pageData = {
	                        id: pageId,
	                        epImage: savedPage.epImage || null,
	                        warpYarns: savedPage.warpYarns || [],
	                        weftYarns: savedPage.weftYarns || [],
	                        actualDensity: savedPage.actualDensity || '',
	                        problems: savedPage.problems || [],
	                        products: savedPage.products || [],
	                        warpCount: savedPage.warpYarns ? savedPage.warpYarns.length : 0,
	                        weftCount: savedPage.weftYarns ? savedPage.weftYarns.length : 0
	                    };

	                    this.pages.push(pageData);
	                    this.renderPage(pageData);
	                });
	            } else {
	                // 如果旧记录中没有页数据，至少保留一页空白页
	                this.addPage(false);
	            }

	            // 切换视图：显示编辑器（第 3 层），隐藏历史列表
	            this.showRecordForm();
	            this.updateEditorStatus();
	        } catch (error) {
	            console.error('编辑记录失败:', error);
	            alert('加载记录失败，请重试');
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
	        const statusEl = document.getElementById('editorStatus');
	        if (statusEl) {
	            statusEl.textContent = '📋 当前：历史记录列表';
	        }
    }

    // 返回表单（显示编辑器 - 第 3 层）
    showRecordForm() {
	        // 如果当前没有任何页面（例如从首页首次进入），自动新建一条空记录
	        if (this.pages.length === 0) {
	            this.resetAllPages();
	        }

	        // 隐藏第 1 层和第 2 层
	        const stacksViewEl = document.getElementById('stacksView');
	        if (stacksViewEl) stacksViewEl.style.display = 'none';
	        document.getElementById('recordsList').style.display = 'none';

	        // 显示编辑器相关元素
	        const editorToolbar = document.getElementById('editorToolbar');
	        const pagesNavigation = document.getElementById('pagesNavigation');
	        if (editorToolbar) editorToolbar.style.display = 'flex';
	        if (pagesNavigation) pagesNavigation.style.display = 'flex';

        document.getElementById('pagesContainer').style.display = 'flex';
        document.querySelector('.bottom-actions').style.display = 'flex';

	        this.updateEditorStatus();
	        this.updatePageIndicators();
	        this.goToPage(this.currentPageIndex);
    }

	    // 更新编辑器状态显示（新建 / 编辑）
	    updateEditorStatus() {
	        const statusEl = document.getElementById('editorStatus');
	        if (!statusEl) return;

	        if (this.currentRecordId == null) {
	            statusEl.textContent = '🆕 当前：新建记录';
	        } else {
	            statusEl.textContent = `✏️ 当前：编辑记录（ID: ${this.currentRecordId}）`;
	        }

	        // 更新编辑器工具栏标题
	        const editorTitleEl = document.getElementById('editorTitle');
	        const editorSubtitleEl = document.getElementById('editorSubtitle');
	        if (editorTitleEl) {
	            editorTitleEl.textContent = this.currentRecordId == null ? '新建记录' : '编辑记录';
	        }
	        if (editorSubtitleEl) {
	            editorSubtitleEl.textContent = this.currentStackName || '未分组';
	        }
	    }

	    // ========================
	    // 多页编辑器导航
	    // ========================

	    // 更新页面指示器
	    updatePageIndicators() {
	        const indicatorsEl = document.getElementById('pageIndicators');
	        if (!indicatorsEl) return;

	        indicatorsEl.innerHTML = '';
	        this.pages.forEach((_page, index) => {
	            const dot = document.createElement('button');
	            dot.className = 'page-indicator-dot' + (index === this.currentPageIndex ? ' active' : '');
	            dot.type = 'button';
	            dot.onclick = () => this.goToPage(index);
	            indicatorsEl.appendChild(dot);
	        });

	        // 更新导航按钮状态
	        const prevBtn = document.querySelector('.page-nav-btn.prev');
	        const nextBtn = document.querySelector('.page-nav-btn.next');
	        if (prevBtn) prevBtn.disabled = this.currentPageIndex === 0;
	        if (nextBtn) nextBtn.disabled = this.currentPageIndex >= this.pages.length - 1;
	    }

	    // 跳转到指定页面
	    goToPage(index) {
	        if (index < 0 || index >= this.pages.length) return;

	        this.currentPageIndex = index;

	        // 滚动到对应页面
	        const container = document.getElementById('pagesContainer');
	        const pageEl = document.getElementById(this.pages[index].id);
	        if (container && pageEl) {
	            pageEl.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
	        }

	        this.updatePageIndicators();
	    }

	    // 上一页
	    goToPrevPage() {
	        if (this.currentPageIndex > 0) {
	            this.goToPage(this.currentPageIndex - 1);
	        }
	    }

	    // 下一页
	    goToNextPage() {
	        if (this.currentPageIndex < this.pages.length - 1) {
	            this.goToPage(this.currentPageIndex + 1);
	        }
	    }

	    // 从编辑器返回项目内记录列表（第 3 层 → 第 2 层）
	    async backToStackRecords() {
	        // 如果有未保存的更改，提示用户
	        if (this.pages.length > 0) {
	            const hasContent = this.pages.some(page => {
	                const data = this.getPageData(page.id);
	                return data && (data.epImage || data.warpYarns?.length > 0 || data.weftYarns?.length > 0);
	            });

	            if (hasContent && !confirm('返回列表将放弃当前未保存的更改，确定返回吗？')) {
	                return;
	            }
	        }

	        // 隐藏编辑器相关元素
	        const editorToolbar = document.getElementById('editorToolbar');
	        const pagesNavigation = document.getElementById('pagesNavigation');
	        if (editorToolbar) editorToolbar.style.display = 'none';
	        if (pagesNavigation) pagesNavigation.style.display = 'none';
	        document.getElementById('pagesContainer').style.display = 'none';
	        document.querySelector('.bottom-actions').style.display = 'none';

	        // 清空编辑器状态
	        this.pages = [];
	        this.pageCount = 0;
	        this.currentRecordId = null;
	        this.currentPageIndex = 0;
	        document.getElementById('pagesContainer').innerHTML = '';

	        // 返回第 2 层（项目内记录列表）
	        await this.openStack(this.currentStackId);
	    }

    // 关闭模态框
    closeModal() {
        document.getElementById('modal').style.display = 'none';
    }

	    // 从任何界面开始新建一条记录
	    startNewRecord() {
	        if (this.currentRecordId != null) {
	            const confirmMsg = '当前正在编辑一条已有记录，确定要放弃未保存的修改并新建一条新记录吗？';
	            if (!confirm(confirmMsg)) {
	                return;
	            }
	        }
	        this.resetAllPages();
	        this.showRecordForm();
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
    // 点击其他地方关闭上下文菜单
    const contextMenu = document.getElementById('contextMenu');
    if (contextMenu && !contextMenu.contains(event.target)) {
        contextMenu.style.display = 'none';
    }
};

// ========================
// 长按交互功能（iOS风格上下文菜单）
// ========================

// 剪贴板存储
let clipboard = { type: null, data: null };

// 创建上下文菜单元素
function createContextMenu() {
    let menu = document.getElementById('contextMenu');
    if (!menu) {
        menu = document.createElement('div');
        menu.id = 'contextMenu';
        menu.className = 'context-menu';
        menu.innerHTML = `
            <div class="context-menu-item" data-action="rename">✏️ 重命名</div>
            <div class="context-menu-item" data-action="copy">📋 复制</div>
            <div class="context-menu-item" data-action="paste">📥 粘贴</div>
            <div class="context-menu-divider"></div>
            <div class="context-menu-item danger" data-action="delete">🗑️ 删除</div>
        `;
        document.body.appendChild(menu);

        // 菜单项点击事件
        menu.addEventListener('click', (e) => {
            const item = e.target.closest('.context-menu-item');
            if (!item) return;
            const action = item.dataset.action;
            const targetType = menu.dataset.targetType;
            const targetId = menu.dataset.targetId;
            handleContextAction(action, targetType, parseInt(targetId));
            menu.style.display = 'none';
        });
    }
    return menu;
}

// 显示上下文菜单
function showContextMenu(x, y, type, id) {
    const menu = createContextMenu();
    menu.dataset.targetType = type;
    menu.dataset.targetId = id;

    // 更新粘贴按钮状态
    const pasteItem = menu.querySelector('[data-action="paste"]');
    if (clipboard.type === type && clipboard.data) {
        pasteItem.style.display = 'block';
    } else {
        pasteItem.style.display = 'none';
    }

    // 定位菜单
    menu.style.display = 'block';
    const menuRect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // 防止菜单超出屏幕
    if (x + menuRect.width > viewportWidth) {
        x = viewportWidth - menuRect.width - 10;
    }
    if (y + menuRect.height > viewportHeight) {
        y = viewportHeight - menuRect.height - 10;
    }

    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
}

// 处理上下文菜单操作
async function handleContextAction(action, type, id) {
    switch (action) {
        case 'rename':
            if (type === 'stack') {
                const stack = await db.getStack(id);
                const newName = prompt('请输入新的项目名称：', stack?.name || '');
                if (newName !== null && newName.trim()) {
                    await db.saveStack({ ...stack, id, name: newName.trim() });
                    app.loadStacks();
                }
            } else if (type === 'record') {
                const record = await db.getRecord(id);
                const newName = prompt('请输入新的记录名称：', record?.name || '');
                if (newName !== null && newName.trim()) {
                    record.name = newName.trim();
                    await db.saveRecord(record);
                    app.openStack(app.currentStackId);
                }
            }
            break;

        case 'copy':
            if (type === 'stack') {
                const stack = await db.getStack(id);
                clipboard = { type: 'stack', data: stack };
            } else if (type === 'record') {
                const record = await db.getRecord(id);
                clipboard = { type: 'record', data: record };
            }
            break;

        case 'paste':
            if (clipboard.type === 'stack' && clipboard.data) {
                const newStack = { ...clipboard.data };
                delete newStack.id;
                newStack.name = (newStack.name || '未命名项目') + ' 副本';
                newStack.createdAt = Date.now();
                await db.saveStack(newStack);
                app.loadStacks();
            } else if (clipboard.type === 'record' && clipboard.data) {
                const newRecord = JSON.parse(JSON.stringify(clipboard.data));
                delete newRecord.id;
                newRecord.name = (newRecord.name || '未命名记录') + ' 副本';
                newRecord.timestamp = Date.now();
                newRecord.stackId = app.currentStackId;
                await db.saveRecord(newRecord);
                app.openStack(app.currentStackId);
            }
            break;

        case 'delete':
            if (type === 'stack') {
                if (confirm('确定要删除这个项目吗？项目内的所有记录也会被删除。')) {
                    // 删除项目内所有记录
                    const allRecords = await db.getAllRecords();
                    const stackRecords = allRecords.filter(r => r.stackId === id);
                    for (const record of stackRecords) {
                        await db.deleteRecord(record.id);
                    }
                    await db.deleteStack(id);
                    app.loadStacks();
                }
            } else if (type === 'record') {
                if (confirm('确定要删除这条记录吗？')) {
                    await db.deleteRecord(id);
                    app.openStack(app.currentStackId);
                }
            }
            break;
    }
}

// 初始化长按事件
function initLongPressEvents() {
    let longPressTimer = null;
    let longPressTarget = null;
    let startX = 0;
    let startY = 0;

    document.addEventListener('touchstart', (e) => {
        const stackCard = e.target.closest('.stack-card');
        const recordCard = e.target.closest('.record-card');

        if (stackCard || recordCard) {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            longPressTarget = stackCard || recordCard;

            longPressTimer = setTimeout(() => {
                // 震动反馈（如果支持）
                if (navigator.vibrate) {
                    navigator.vibrate(50);
                }

                const rect = longPressTarget.getBoundingClientRect();
                const menuX = rect.left + rect.width / 2;
                const menuY = rect.top;

                if (stackCard) {
                    const stackId = stackCard.dataset.stackId;
                    if (stackId) {
                        showContextMenu(menuX, menuY, 'stack', stackId);
                    }
                } else if (recordCard) {
                    const recordId = recordCard.dataset.recordId;
                    if (recordId) {
                        showContextMenu(menuX, menuY, 'record', recordId);
                    }
                }

                // 阻止默认点击事件
                longPressTarget.dataset.longPressed = 'true';
            }, 500);
        }
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
        if (longPressTimer) {
            const moveX = Math.abs(e.touches[0].clientX - startX);
            const moveY = Math.abs(e.touches[0].clientY - startY);
            if (moveX > 10 || moveY > 10) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        }
    }, { passive: true });

    document.addEventListener('touchend', () => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    }, { passive: true });

    document.addEventListener('touchcancel', () => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    }, { passive: true });

    // 阻止长按后的点击事件
    document.addEventListener('click', (e) => {
        const card = e.target.closest('.stack-card, .record-card');
        if (card && card.dataset.longPressed === 'true') {
            e.stopPropagation();
            e.preventDefault();
            delete card.dataset.longPressed;
        }
    }, true);
}

// 页面加载后初始化长按事件
document.addEventListener('DOMContentLoaded', () => {
    initLongPressEvents();
});

