# 小黑貓 LINE@ 自動回覆：設定教學

值班時，小黑貓會自動回覆 LINE 官方帳號的訊息；看不懂的、客戶要找真人的、截圖，都會立刻透過 OpenClaw 的 bot 傳到你的 Telegram。值班的開關和教新題目，都直接跟 OpenClaw 說。

- **非值班時間**：小黑貓完全不動作，照舊由人工回覆。
- **值班中**：
  - 有把握的問題（錯誤代碼、常見狀況、手冊）：自動回覆步驟、圖卡和手冊連結，並通知你一份紀錄。
  - 看不懂的問題：回客戶「已收到，客服會盡快回覆」（30 分鐘內只回一次），並通知你。
  - 客戶說「真人／客服」，或提到調閱、權限、同意書、報價、合約等：回「已通知客服」，並通知你。
  - 截圖：回「已收到截圖」，並把截圖轉到你的 Telegram。

整個設定大約 30 分鐘。**金鑰都由你自己填，不要貼在對話或 GitHub 上。**
建議先用一個「測試用」LINE 官方帳號跑一週，沒問題再接正式帳號。

---

## 一、準備 Telegram 通知（5 分鐘）

通知直接用 **OpenClaw 現在的 Telegram bot** 發，不用另外建 bot。小黑貓只會「發訊息」，不會接收或更動 bot 設定，所以不會搶走 OpenClaw 的訊息。

1. 從 OpenClaw 的設定找到它的 **Telegram bot token**（像 `123456:ABC-...`），先記在安全的地方
2. 在 Telegram 搜尋 **@userinfobot** → 按「開始」，它會回你的 **Id**（一串數字），這就是 `TELEGRAM_CHAT_ID`

## 二、建立 Cloudflare Worker（10 分鐘）

1. 到 https://dash.cloudflare.com 註冊並登入（免費方案即可）
2. 左側 **Workers 和 Pages** → **建立** → **建立 Worker** → 名稱輸入 `leyan-cat` → **部署**
3. 按 **編輯程式碼**，把 `dist/worker.js` 的內容**全部**貼上（取代原本的內容）→ **部署**
4. 左側 **儲存體和資料庫 → KV** → **建立命名空間**，名稱 `leyan-cat`
5. 回到 `leyan-cat` Worker → **設定 → 繫結** → 新增 **KV 命名空間**：變數名稱填 `CAT_KV`，選剛剛的 `leyan-cat`
6. **設定 → 變數和祕密** → 新增以下項目（類型選「祕密」）：

   | 名稱 | 內容 |
   |---|---|
   | `TELEGRAM_BOT_TOKEN` | 第一步：OpenClaw 的 bot token |
   | `TELEGRAM_CHAT_ID` | 第一步拿到的 Id（數字） |
   | `DUTY_KEY` | 自己打一串 20 字以上的英數亂碼。OpenClaw 切換值班要用，等一下也要交給 OpenClaw |
   | `LINE_CHANNEL_SECRET` | 第三步拿到 |
   | `LINE_CHANNEL_ACCESS_TOKEN` | 第三步拿到 |

   選填（類型「純文字」）：`DEFAULT_SHIFT_HOURS`（預設值班 9 小時）、`LOG_AUTO_REPLIES`（填 `false` 就不通知自動回覆的紀錄）

   > **不要**設定 `TELEGRAM_RECEIVE`。那是給「專屬 bot」用的，用 OpenClaw 的 bot 時設了會搶走 OpenClaw 的訊息。

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

## 四、測試

1. 用瀏覽器打開：`https://leyan-cat.你的帳號.workers.dev/setup?key=你的DUTY_KEY`
   → 頁面顯示「完成！」，Telegram 的 OpenClaw 對話裡會收到小黑貓的測試訊息
2. 打開 `https://leyan-cat.你的帳號.workers.dev/health`，確認 `"data":"live"`（代表有讀到網站上最新的資料）
3. 試試看它會怎麼回答：`https://leyan-cat.你的帳號.workers.dev/test?q=讀卡機跳4029`
4. 把 `OPENCLAW-說明書.md` 交給 OpenClaw，並把 Worker 網址和 `DUTY_KEY` 存進 OpenClaw 的設定（**不要**透過 LINE 傳）
5. 跟 OpenClaw 說「小黑貓開始值班 1 小時」，再用你自己的 LINE 傳訊息給（測試用）官方帳號，確認會收到自動回覆、Telegram 會收到紀錄

## 每天怎麼用

直接跟 OpenClaw 說：

| 你說 | 效果 |
|---|---|
| 「小黑貓上班」 | 開始值班，預設 9 小時後自動下班 |
| 「小黑貓值班 4 小時」 | 上班 4 小時 |
| 「小黑貓下班」 | 立刻下班，訊息交還人工 |
| 「小黑貓有在值班嗎？」 | 查看目前狀態 |

**教小黑貓新題目**：收到「❓ 小黑貓看不懂」的通知時，在 Telegram **回覆那則通知**，告訴 OpenClaw 正確處理方式，例如「把這題加進常見問題：沒有 ACC 編號的那幾筆是附件沒傳上去，請重新上傳那幾筆的附件」。OpenClaw 會改 `faq.js` 推上 GitHub。
- 網站的小黑貓：GitHub Pages 更新後（約 1～2 分鐘）就會了
- LINE 的小黑貓：每 5 分鐘自動到網站抓最新資料，學會新題目時會通知你「🐾 小黑貓學會了新題目」
- `faq.js` 寫壞了（例如少了逗號）：LINE 小黑貓會沿用上一版繼續回覆，並通知你哪裡有問題
- 題目裡如果出現「請提供密碼／PIN 碼／身分證」這類字眼，小黑貓不會拿那題自動回覆，並通知你

## 什麼時候才需要重新貼程式碼

只有改到 `line-cat-worker/src/handler.js`（小黑貓的判斷邏輯）時才需要：在 customer-help 資料夾執行 `node line-cat-worker/build.mjs`，把新的 `dist/worker.js` 貼到 Cloudflare 的「編輯程式碼」→ 部署。改手冊或常見問題**不用**重貼。

## 費用

- Cloudflare Workers、KV：免費方案每天 10 萬次請求、KV 每天 1,000 次寫入，一般客服量用不完。
- LINE：小黑貓回覆客戶用的是「回覆訊息」，依 LINE 的計費規則通常不計入每月則數（請以 LINE 官方說明為準）；通知你是走 Telegram，不花 LINE 的則數。
- Telegram：免費。
