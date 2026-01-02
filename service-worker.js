// Service Worker - 提花织物生产记录系统
const CACHE_NAME = 'production-record-v1';
const urlsToCache = [
    './',
    './index-mobile.html',
    './styles-mobile.css',
    './styles-ipad.css',
    './app.js',
    './database.js',
    './media.js',
    './icon-192.png',
    './icon-512.png'
];

// 安装事件 - 缓存资源
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('缓存已打开');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                // 跳过等待，立即激活
                return self.skipWaiting();
            })
    );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('删除旧缓存:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // 立即控制所有页面
            return self.clients.claim();
        })
    );
});

// 获取事件 - 网络优先，失败则使用缓存
self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // 如果请求成功，克隆响应并缓存
                if (response && response.status === 200) {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                }
                return response;
            })
            .catch(() => {
                // 网络失败，尝试从缓存获取
                return caches.match(event.request);
            })
    );
});

// 监听消息 - 支持手动更新
self.addEventListener('message', event => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
});

