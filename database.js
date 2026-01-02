// IndexedDB 数据库管理
class Database {
    constructor() {
        this.dbName = 'JacquardProductionDB';
        this.version = 1;
        this.db = null;
    }

    // 初始化数据库
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // 创建生产记录表
                if (!db.objectStoreNames.contains('records')) {
                    const recordStore = db.createObjectStore('records', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    recordStore.createIndex('epFileName', 'epFileName', { unique: false });
                    recordStore.createIndex('timestamp', 'timestamp', { unique: false });
                    recordStore.createIndex('date', 'date', { unique: false });
                }

                // 创建媒体文件表
                if (!db.objectStoreNames.contains('media')) {
                    const mediaStore = db.createObjectStore('media', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    mediaStore.createIndex('recordId', 'recordId', { unique: false });
                    mediaStore.createIndex('type', 'type', { unique: false });
                }
            };
        });
    }

    // 保存记录
    async saveRecord(record) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['records'], 'readwrite');
            const store = transaction.objectStore('records');
            
            // 添加时间戳
            record.timestamp = new Date().getTime();
            record.date = new Date().toISOString().split('T')[0];
            
            const request = store.add(record);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // 获取所有记录
    async getAllRecords() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['records'], 'readonly');
            const store = transaction.objectStore('records');
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // 根据ID获取记录
    async getRecord(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['records'], 'readonly');
            const store = transaction.objectStore('records');
            const request = store.get(id);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // 更新记录
    async updateRecord(record) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['records'], 'readwrite');
            const store = transaction.objectStore('records');
            const request = store.put(record);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // 删除记录
    async deleteRecord(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['records'], 'readwrite');
            const store = transaction.objectStore('records');
            const request = store.delete(id);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // 搜索记录
    async searchRecords(searchTerm) {
        const allRecords = await this.getAllRecords();
        return allRecords.filter(record => 
            record.epFileName.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }

    // 按日期筛选
    async filterByDate(date) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['records'], 'readonly');
            const store = transaction.objectStore('records');
            const index = store.index('date');
            const request = index.getAll(date);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // 保存媒体文件
    async saveMedia(mediaData) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['media'], 'readwrite');
            const store = transaction.objectStore('media');
            const request = store.add(mediaData);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // 获取记录的媒体文件
    async getMediaByRecordId(recordId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['media'], 'readonly');
            const store = transaction.objectStore('media');
            const index = store.index('recordId');
            const request = index.getAll(recordId);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}

// 创建全局数据库实例
const db = new Database();

