// service_worker.js
// YouTube Timer Lock のバックグラウンド処理

const LOCK_ALARM_NAME = 'youtube-lock-end';
const DNR_RULE_ID = 1;

// 拡張機能インストール時・起動時の処理
chrome.runtime.onInstalled.addListener(() => {
  console.log('YouTube Timer Lock installed');
  restoreLockState();
});

chrome.runtime.onStartup.addListener(() => {
  console.log('YouTube Timer Lock startup');
  restoreLockState();
});

// ロック状態の復元（ブラウザ起動時など）
async function restoreLockState() {
  const { lockEndTime } = await chrome.storage.local.get('lockEndTime');
  
  if (lockEndTime) {
    const now = Date.now();
    
    if (now < lockEndTime) {
      // まだロック中 → DNR ルールを有効化
      await enableBlockingRule();
      
      // アラームを再設定
      const remainingMs = lockEndTime - now;
      chrome.alarms.create(LOCK_ALARM_NAME, { when: lockEndTime });
      
      console.log(`Lock restored. Remaining: ${Math.floor(remainingMs / 1000)}s`);
    } else {
      // 期限切れ → 自動解除
      await unlockYouTube();
    }
  }
}

// ロック開始
async function lockYouTube(durationMinutes) {
  const lockEndTime = Date.now() + (durationMinutes * 60 * 1000);
  
  // 終了時刻を保存
  await chrome.storage.local.set({ lockEndTime });
  
  // DNR ルールを有効化
  await enableBlockingRule();
  
  // アラームを設定
  chrome.alarms.create(LOCK_ALARM_NAME, { when: lockEndTime });
  
  console.log(`YouTube locked for ${durationMinutes} minutes until ${new Date(lockEndTime)}`);
}

// ロック解除
async function unlockYouTube() {
  // 状態をクリア
  await chrome.storage.local.remove('lockEndTime');
  
  // DNR ルールを無効化
  await disableBlockingRule();
  
  // アラームをクリア
  chrome.alarms.clear(LOCK_ALARM_NAME);
  
  console.log('YouTube unlocked');
}

// DNR ルールを有効化（YouTube → blocked.html にリダイレクト）
async function enableBlockingRule() {
  const blockedUrl = chrome.runtime.getURL('blocked.html');
  
  const rules = [{
    id: DNR_RULE_ID,
    priority: 1,
    action: {
      type: 'redirect',
      redirect: { url: blockedUrl }
    },
    condition: {
      urlFilter: '*youtube.com/*',
      resourceTypes: ['main_frame']
    }
  }, {
    id: DNR_RULE_ID + 1,
    priority: 1,
    action: {
      type: 'redirect',
      redirect: { url: blockedUrl }
    },
    condition: {
      urlFilter: '*youtu.be/*',
      resourceTypes: ['main_frame']
    }
  }];
  
  // 既存ルールを削除してから追加
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const existingIds = existingRules.map(rule => rule.id);
  
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existingIds,
    addRules: rules
  });
  
  console.log('Blocking rules enabled');
}

// DNR ルールを無効化
async function disableBlockingRule() {
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const existingIds = existingRules.map(rule => rule.id);
  
  if (existingIds.length > 0) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existingIds
    });
  }
  
  console.log('Blocking rules disabled');
}

// アラーム発火時（ロック終了時刻に到達）
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === LOCK_ALARM_NAME) {
    console.log('Lock timer expired, unlocking YouTube');
    unlockYouTube();
  }
});

// ポップアップからのメッセージ処理
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startLock') {
    lockYouTube(message.duration)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // 非同期レスポンス
  }
  
  if (message.action === 'unlock') {
    unlockYouTube()
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
  
  if (message.action === 'getStatus') {
    chrome.storage.local.get('lockEndTime')
      .then(({ lockEndTime }) => {
        const isLocked = lockEndTime && Date.now() < lockEndTime;
        sendResponse({ 
          isLocked, 
          lockEndTime: lockEndTime || null 
        });
      });
    return true;
  }
});
