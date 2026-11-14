# 小黑貓 LINE@ 自動回覆：設定教學

值班時，小黑貓會自動回覆 LINE 官方帳號的訊息；看不懂的、客戶要找真人的、截圖，都會立刻傳到你的 Telegram。

- **非值班時間**：小黑貓完全不動作，照舊由人工回覆。
- **值班中**：
  - 有把握的問題（錯誤代碼、常見狀況、手冊）：自動回覆步驟、圖卡和手冊連結，並通知你一份紀錄。
  - 看不懂的問題：回客戶「已收到，客服會盡快回覆」（30 分鐘內只回一次），並通知你。
  - 客戶說「真人／客服」，或提到調閱、權限、同意書、報價、合約等：回「已通知客服」，並通知你。
  - 截圖：回「已收到截圖」，並把截圖轉到你的 Telegram。

整個設定大約 30 分鐘。**金鑰都由你自己填，不要貼在對話或 GitHub 上。**
建議先用一個「測試用」LINE 官方帳號跑一週，沒問題再接正式帳號。

---

## 一、建立 Telegram 通知機器人（5 分鐘）

> 請**新建一個 bot**，不要用 FlowCare 那個：一個 bot 只能接一個伺服器，共用會讓 FlowCare 收不到訊息。

1. 在 Telegram 搜尋 **@BotFather** → 傳 `/newbot` → 名稱輸入「樂衍小黑貓」，帳號輸入例如 `leyan_cat_bot`
2. BotFather 會給你一串 **token**（像 `123456:ABC-...`），先記在安全的地方
3. 搜尋你剛建立的 bot，按「開始」，隨便傳一句話給它
4. 搜尋 **@userinfobot** → 按「開始」，它會回你的 **Id**（一串數字），這就是 `TELEGRAM_CHAT_ID`

## 二、建立 Cloudflare Worker（10 分鐘）

1. 到 https://dash.cloudflare.com 註冊並登入（免費方案即可）
2. 左側 **Workers 和 Pages** → **建立** → **建立 Worker** → 名稱輸入 `leyan-cat` → **部署**
3. 按 **編輯程式碼**，把 `dist/worker.js` 的內容**全部**貼上（取代原本的內容）→ **部署**
4. 左側 **儲存體和資料庫 → KV** → **建立命名空間**，名稱 `leyan-cat`
5. 回到 `leyan-cat` Worker → **設定 → 繫結** → 新增 **KV 命名空間**：變數名稱填 `CAT_KV`，選剛剛的 `leyan-cat`
6. **設定 → 變數和祕密** → 新增以下項目（類型選「祕密」）：

   | 名稱 | 內容 |
   |---|---|
   | `TELEGRAM_BOT_TOKEN` | 第一步拿到的 token |
   | `TELEGRAM_CHAT_ID` | 第一步拿到的 Id（數字） |
   | `TELEGRAM_WEBHOOK_SECRET` | 自己打一串英數亂碼，例如 `cat2026xyzQ8` |
   | `LINE_CHANNEL_SECRET` | 第三步拿到 |
   | `LINE_CHANNEL_ACCESS_TOKEN` | 第三步拿到 |

   選填（類型「純文字」）：`DEFAULT_SHIFT_HOURS`（預設值班 9 小時）、`LOG_AUTO_REPLIES`（填 `false` 就不通知自動回覆的紀錄）

7. 記下 Worker 的網址，例如 `https://leyan-cat.你的帳號.workers.dev`

## 三、開啟 LINE Messaging API（10 分鐘）

1. 到 **LINE Official Account Manager** → 右上 **設定** → 左側 **Messaging API** → **啟用 Messaging API**（選擇或建立一個 Provider）
2. 同一頁會顯示 **Channel secret** → 填到 Cloudflare 的 `LINE_CHANNEL_SECRET`
3. 到 **LINE Developers**（https://developers.line.biz）→ 選這個 Channel → **Messaging API** 分頁 → 最下面 **Channel access token** → **Issue** → 填到 `LINE_CHANNEL_ACCESS_TOKEN`
4. 同一頁 **Webhook URL** 填 `https://leyan-cat.你的帳號.workers.dev/line` → **Verify** 出現 Success → 開啟 **Use webhook**
5. 回到 **LINE Official Account Manager → 設定 → 回應設定**：
   - **聊天**：開啟（你們照樣可以在後台手動回覆）
   - **Webhook**：開啟
   - **自動回應訊息**：建議關閉，避免跟小黑貓重複回覆

## 四、接上 Telegram 並測試

1. 用瀏覽器打開：`https://leyan-cat.你的帳號.workers.dev/setup?key=你的TELEGRAM_WEBHOOK_SECRET`
   → 頁面顯示「完成！」，Telegram 會收到小黑貓的訊息
2. 在 Telegram 對小黑貓傳 `/狀態`，它會回「目前沒有值班」
3. 先試試看它會怎麼回答：打開 `https://leyan-cat.你的帳號.workers.dev/test?q=讀卡機跳4029`
4. 傳 `/值班開始`，再用你自己的 LINE 傳訊息給（測試用）官方帳號，確認會收到自動回覆、Telegram 會收到紀錄

## 每天怎麼用

| 在 Telegram 傳 | 效果 |
|---|---|
| `/值班開始` | 小黑貓上班，預設 9 小時後自動下班 |
| `/值班開始 4` | 上班 4 小時 |
| `/值班結束` | 立刻下班，訊息交還人工 |
| `/狀態` | 查看目前有沒有在值班 |

## 更新手冊或常見問題後

小黑貓的資料是打包在 `dist/worker.js` 裡的。網站的手冊或常見問題更新後，請 Claude 重新產生 `dist/worker.js`（或自己在 customer-help 資料夾執行 `node line-cat-worker/build.mjs`），再貼到 Cloudflare 的「編輯程式碼」→ 部署。

## 費用

- Cloudflare Workers、KV：免費方案每天有 10 萬次請求，一般客服量用不完。
- LINE：小黑貓回覆客戶用的是「回覆訊息」，依 LINE 的計費規則通常不計入每月則數（請以 LINE 官方說明為準）；通知你是走 Telegram，不花 LINE 的則數。
- Telegram：免費。
