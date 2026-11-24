# 2026-11-24 Issue文件與FAQ核可

Rou已核可新增未重複內容；本次保留 #12（01ff406）及 #6既有回答，不重複新增。

## #20 原PDF提供方式

Rou指定北區院所詢問指標時提供此PDF，非政策FAQ或免審資格引擎。使用Issue20原附件全部14頁，未遮蔽、改寫、刪頁或重新產生。

- doc ID：nhi-north-exemption-notes
- 名稱：北區免審指標重點（樂衍整理版）
- 原附件：https://github.com/user-attachments/files/35321448/_20261124.2.pdf
- SHA256：59a3902411a0a24fe789b15907e1eb88dc80e9d7728ba9a7dfcf81f9c15a2ffb
- 456633 bytes，14頁；製作者樂衍，2026-11-24整理，引用官方114年第4次共管會議（115/2費用年月起）。不宣稱現行唯一最新版。

沿用桃園市、新竹市、新竹縣、苗栗縣北區映射。指標／免審問題先確認文件候選，再提供開啟、原檔下載及引用官方PDF/公告；切縣市後舊候選失效。一般處置代碼仍查支付標準，不以摘要判申報或免審資格。北區新特約個案不把這份免審摘要當新特約專用規範。首頁健保申報卡內分區文件也可閱讀下載，搜尋北區、免審與教材代碼可找到父項目。

## 五題原答核可

Rou明確確認#18僅刪「不是看診當下做」，其他原意不變；#11/#9/#8/#7原回答核可。這取代本次前一份審核建議的待補資料狀態，不冒稱有新取得官方政策證明。GitHub原Issue正文未變；僅去除Markdown強調標記作純文字呈現，不另寫安全稿或加推導步驟。

|Issue|FAQ ID|分類|來源|
|---|---|---|---|
|18|reasonable-volume-adjustment|健保申報與病歷|益祥樂晴系統操作實務|
|11|referral-clinic-not-found|健保申報與病歷|靖欣客服實務|
|9|telecom-outage-registration|掛號・補卡・帳務|靖欣客服實務|
|8|id-change-refill-card|掛號・補卡・帳務|靖欣客服實務|
|7|patient-name-question-mark|掛號・補卡・帳務|靖欣客服實務|

PROBLEM_TYPES沿用nhi/reg。INTENTS是手冊映射，這五題不擅加對應手冊。自然句走主題route，先候選後答案；合理量調升降操作不被一般分區指標流程攔走。姓名問號不混預約LINE問號；電信維修掛號不覆寫batch-12異常卡號來源查找。

驗證：所有tests/*.cjs、node --check assistant.js/manuals.js、git diff --check；owner-approved-issues.cjs另驗原答、自然問句、負例、北區原檔SHA及隔離。Issues未留言/關閉，LINE程式未改。
