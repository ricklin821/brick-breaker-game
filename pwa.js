// PWA功能相關的JavaScript

let deferredPrompt; // 用於存儲安裝提示事件
const installButton = document.createElement('button');
installButton.className = 'install-button';
installButton.textContent = '📱 安裝遊戲到手機';
installButton.style.display = 'none';

// 初始化PWA功能
function initPWA() {
    // 註冊Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./service-worker.js')
                .then((registration) => {
                    console.log('Service Worker 註冊成功:', registration.scope);
                    // 檢查是否有更新
                    registration.onupdatefound = () => {
                        const installingWorker = registration.installing;
                        installingWorker.onstatechange = () => {
                            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                showNotification('遊戲已更新到最新版本！刷新頁面即可使用。', 'success');
                            }
                        };
                    };
                })
                .catch((error) => {
                    console.error('Service Worker 註冊失敗:', error);
                });
        });
    }

    // 添加安裝按鈕到控制容器
    const controlsContainer = document.querySelector('.controls-container');
    if (controlsContainer) {
        controlsContainer.appendChild(installButton);
    }
    
    // 獲取安裝提示元素
    const pwaInstallHint = document.getElementById('pwaInstallHint');
    // 檢查是否已安裝為PWA
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
        // 已安裝為PWA，隱藏提示
        if (pwaInstallHint) pwaInstallHint.style.display = 'none';
    }

    // 監聽beforeinstallprompt事件，顯示安裝按鈕
    window.addEventListener('beforeinstallprompt', (e) => {
        // 阻止Chrome 67及更早版本自動顯示安裝提示
        e.preventDefault();
        // 保存事件，以便稍後觸發
        deferredPrompt = e;
        // 顯示安裝按鈕
        installButton.style.display = 'inline-block';
        // 顯示安裝提示
        const pwaInstallHint = document.getElementById('pwaInstallHint');
        if (pwaInstallHint) pwaInstallHint.style.display = 'block';

        // 添加按鈕點擊事件
        installButton.addEventListener('click', () => {
            // 顯示安裝提示
            deferredPrompt.prompt();
            // 等待用戶回應提示
            deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('用戶接受安裝');
                    // 隱藏按鈕和提示
                    installButton.style.display = 'none';
                    if (pwaInstallHint) pwaInstallHint.style.display = 'none';
                    showNotification('遊戲已成功安裝到您的設備！', 'success');
                } else {
                    console.log('用戶拒絕安裝');
                    showNotification('您可以隨時點擊「安裝遊戲到手機」按鈕進行安裝', 'info');
                }
                // 清除保存的提示，因為它只能使用一次
                deferredPrompt = null;
            });
        });
    });

    // 監聽appinstalled事件
    window.addEventListener('appinstalled', (e) => {
        console.log('應用已安裝');
        // 隱藏安裝按鈕和提示
        installButton.style.display = 'none';
        const pwaInstallHint = document.getElementById('pwaInstallHint');
        if (pwaInstallHint) pwaInstallHint.style.display = 'none';
        showNotification('遊戲已成功安裝到您的設備！', 'success');
    });

    // 監聽在線/離線狀態變化
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    // 初始檢查在線狀態
    updateOnlineStatus();
}

// 更新在線/離線狀態
function updateOnlineStatus() {
    const isOnline = navigator.onLine;
    let offlineMessage = document.querySelector('.offline-message');
    
    // 如果離線消息元素不存在，創建一個
    if (!offlineMessage) {
        offlineMessage = document.createElement('div');
        offlineMessage.className = 'offline-message';
        document.body.appendChild(offlineMessage);
    }
    
    if (!isOnline) {
        offlineMessage.textContent = '您目前處於離線狀態，但遊戲仍可正常運行';
        offlineMessage.classList.add('show');
        
        // 5秒後隱藏消息
        setTimeout(() => {
            offlineMessage.classList.remove('show');
        }, 5000);
    } else {
        offlineMessage.classList.remove('show');
    }
}

// 顯示通知消息
function showNotification(message, type = 'info') {
    let notification = document.querySelector('.notification');
    
    // 如果通知元素不存在，創建一個
    if (!notification) {
        notification = document.createElement('div');
        notification.className = 'notification';
        document.body.appendChild(notification);
    }
    
    // 設置消息和類型
    notification.textContent = message;
    notification.className = 'notification';
    notification.classList.add(type);
    notification.classList.add('show');
    
    // 5秒後隱藏通知
    setTimeout(() => {
        notification.classList.remove('show');
    }, 5000);
}

// 在頁面加載完成後初始化PWA功能
document.addEventListener('DOMContentLoaded', initPWA);