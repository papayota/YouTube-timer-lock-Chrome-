// popup.js
// ポップアップの UI 制御

let selectedDuration = null;
let updateInterval = null;

// DOM 要素
const unlockedView = document.getElementById('unlocked-view');
const lockedView = document.getElementById('locked-view');
const confirmView = document.getElementById('confirm-view');
const startLockBtn = document.getElementById('start-lock-btn');
const unlockRequestBtn = document.getElementById('unlock-request-btn');
const confirmUnlockBtn = document.getElementById('confirm-unlock-btn');
const cancelUnlockBtn = document.getElementById('cancel-unlock-btn');
const remainingTimeEl = document.getElementById('remaining-time');
const confirmRemainingTimeEl = document.getElementById('confirm-remaining-time');
const messageEl = document.getElementById('message');

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    checkLockStatus();
    setupEventListeners();
});

// ロック状態をチェック
async function checkLockStatus() {
    const response = await chrome.runtime.sendMessage({ action: 'getStatus' });

    if (response.isLocked) {
        showLockedView(response.lockEndTime);
    } else {
        showUnlockedView();
    }
}

// 未ロック画面を表示
function showUnlockedView() {
    unlockedView.classList.remove('hidden');
    lockedView.classList.add('hidden');
    confirmView.classList.add('hidden');

    if (updateInterval) {
        clearInterval(updateInterval);
        updateInterval = null;
    }
}

// ロック中画面を表示
function showLockedView(lockEndTime) {
    unlockedView.classList.add('hidden');
    lockedView.classList.remove('hidden');
    confirmView.classList.add('hidden');

    // 残り時間を更新
    updateRemainingTime(lockEndTime, remainingTimeEl);

    // 1秒ごとに更新
    if (updateInterval) clearInterval(updateInterval);
    updateInterval = setInterval(() => {
        updateRemainingTime(lockEndTime, remainingTimeEl);
    }, 1000);
}

// 確認画面を表示
function showConfirmView(lockEndTime) {
    unlockedView.classList.add('hidden');
    lockedView.classList.add('hidden');
    confirmView.classList.remove('hidden');

    // 残り時間を更新
    updateRemainingTime(lockEndTime, confirmRemainingTimeEl);

    // 1秒ごとに更新
    if (updateInterval) clearInterval(updateInterval);
    updateInterval = setInterval(() => {
        updateRemainingTime(lockEndTime, confirmRemainingTimeEl);
    }, 1000);
}

// 残り時間を更新
function updateRemainingTime(lockEndTime, element) {
    const now = Date.now();
    const remaining = Math.max(0, lockEndTime - now);

    if (remaining === 0) {
        // 時間切れ → 状態を再チェック
        checkLockStatus();
        return;
    }

    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);

    element.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// イベントリスナーの設定
function setupEventListeners() {
    // タイマー選択ボタン
    document.querySelectorAll('.timer-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // 選択状態を更新
            document.querySelectorAll('.timer-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');

            selectedDuration = parseInt(btn.dataset.duration);
            startLockBtn.disabled = false;
        });
    });

    // ロック開始ボタン
    startLockBtn.addEventListener('click', async () => {
        if (!selectedDuration) return;

        const response = await chrome.runtime.sendMessage({
            action: 'startLock',
            duration: selectedDuration
        });

        if (response.success) {
            showMessage('ロックを開始しました', 'success');
            setTimeout(() => checkLockStatus(), 500);
        } else {
            showMessage('エラーが発生しました', 'error');
        }
    });

    // 解除リクエストボタン（確認画面へ）
    unlockRequestBtn.addEventListener('click', async () => {
        const response = await chrome.runtime.sendMessage({ action: 'getStatus' });
        if (response.isLocked) {
            showConfirmView(response.lockEndTime);
        }
    });

    // キャンセルボタン（ロック中画面に戻る）
    cancelUnlockBtn.addEventListener('click', async () => {
        const response = await chrome.runtime.sendMessage({ action: 'getStatus' });
        if (response.isLocked) {
            showLockedView(response.lockEndTime);
        }
    });

    // 解除実行ボタン
    confirmUnlockBtn.addEventListener('click', async () => {
        const response = await chrome.runtime.sendMessage({ action: 'unlock' });

        if (response.success) {
            showMessage('ロックを解除しました', 'success');
            setTimeout(() => checkLockStatus(), 500);
        } else {
            showMessage('エラーが発生しました', 'error');
        }
    });
}

// メッセージ表示
function showMessage(text, type = 'info') {
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    messageEl.classList.remove('hidden');

    setTimeout(() => {
        messageEl.classList.add('hidden');
    }, 3000);
}
