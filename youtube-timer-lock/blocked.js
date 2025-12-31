// blocked.js
// ブロック画面の制御

// ユーモアのあるメッセージ候補
const messages = [
    '集中力、発揮中！💪',
    'YouTubeは逃げないから大丈夫👍',
    '今は作業タイム、後でゆっくり見よう📚',
    'あなたの未来の自分が感謝してるよ✨',
    '誘惑に負けない、強い心💎',
    'ここまで来たんだから、もう少し頑張ろう🚀',
    'YouTube見るより、今やってることの方が大事かも🤔',
    '集中モード継続中…🎯'
];

// ランダムメッセージを表示
function displayRandomMessage() {
    const randomIndex = Math.floor(Math.random() * messages.length);
    document.getElementById('random-message').textContent = messages[randomIndex];
}

// 残り時間を更新
async function updateRemainingTime() {
    try {
        const { lockEndTime } = await chrome.storage.local.get('lockEndTime');

        if (!lockEndTime) {
            // ロックが解除されている場合
            document.getElementById('remaining-time').textContent = '解除済み';
            return;
        }

        const now = Date.now();
        const remaining = Math.max(0, lockEndTime - now);

        if (remaining === 0) {
            document.getElementById('remaining-time').textContent = '解除済み';
            return;
        }

        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);

        document.getElementById('remaining-time').textContent =
            `${minutes}:${seconds.toString().padStart(2, '0')}`;
    } catch (error) {
        console.error('Error updating remaining time:', error);
    }
}

// 「作業に戻る」ボタンの処理
document.getElementById('back-to-work-btn').addEventListener('click', async () => {
    try {
        // 現在のタブを取得して閉じる
        const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (currentTab) {
            chrome.tabs.remove(currentTab.id);
        }
    } catch (error) {
        console.error('Error closing tab:', error);
        // エラーの場合は前のページに戻る
        window.history.back();
    }
});

// 初期化
displayRandomMessage();
updateRemainingTime();

// 1秒ごとに残り時間を更新
setInterval(updateRemainingTime, 1000);
