# 他院處置提醒：Issue #12

Rou授權新增未重複題目，本次僅新增 FAQ `other-clinic-procedure-warning`（健保申報與病歷）。來源為靖欣客服實務：https://github.com/Rou0212/customer-help/issues/12 。

黃框主要提醒本院紀錄；他院由具權限人員透過雲端／醫令核對。沒有警告不等於可重複處置或申報。保留個案人工界線，不蒐集患者資料；不保證所有系統版本、他院資料完整或即時。來源實務不是健保支付條件。

分類沿用 PROBLEM_TYPES `nhi` 與 FAQ_GROUPS `nhi`；INTENTS 是手冊映射，本題沒有核可對應手冊，故不新增手冊意圖。搜尋須有他院/外院/別家/其他院所等對象證據與處置/提醒情境，不能只憑黃框或警告搶走其他題。沿用候選確認後顯示答案。

`node tests/other-clinic-warning.cjs` 驗證自然問句與跨題負例。其他Issue仍待原審核報告所需資料；本次不變更、留言或關閉。
