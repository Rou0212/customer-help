# Website question rounds

`assistant.js` owns only the website widget; LINE worker remains unchanged.

- Text, quick prompts, confirmed local OCR text and speech use `ask`.
- `createQuestionRound` keeps local round text, debounces 5 seconds from last submission, and flushes at 60 seconds from the first submission in a batch. Immediate query flushes that batch.
- Keep one persistent window question by default, including complete same-topic sentences, quick prompts, low-information text and error codes after debounce or candidate/answer display. Five seconds ends only a message batch, not the question round. Ask once only when named/actionable next-topic evidence is disjoint from the current subject; compatible upload/claim/network context remains together. Header 新問題, typed reset commands, or a confirmed new-topic choice are the explicit round boundaries. Human requests and city changes clear pending state immediately.
- Treat 不是這個 as rejection of the displayed candidates, not deletion of the original question. Preserve that useful context for the next supplement. For 不是…是… corrections replace the rejected object in existing text when possible; otherwise drop conflicting topic lines but keep diagnostic fragments/codes.
- Before reranking, disable prior candidate controls and links. Approved FAQ/manual answers still require candidate confirmation; account dental/non-dental remains an explicit confirmation path.
- OCR results and their buttons carry a round epoch and city check so stale images cannot submit into a later round.

Verification: run `for f in tests/*.cjs; do node "$f" || exit 1; done`. `tests/question-round.cjs` uses a fake clock for exact debounce / 60-second / cancellation assertions. Browser acceptance: split input, correction, candidate confirmation, supplementary error code, ambiguous change/new selection, account clinic follow-up, human request and city switch while timer pending. Check mobile overflow and browser errors.

## Compact conversation UI

- Header 新問題 resets local state, cancels pending queries, invalidates old controls, clears the draft, and inserts a muted divider without deleting history. Choosing 問新問題 in a disambiguation also inserts a divider before its new query runs.
- The status / 立即查詢 row is visible only while a debounce batch is pending. It is hidden initially, after a query, during topic disambiguation, and on reset / human handoff / city switch.
- Check both index.html floating widget (480px desktop) and cat.html at desktop and 390px; verify reset in header, no blank toolbar, pending-only immediate action, retained history with disabled old candidates, and no horizontal overflow.

- Explicit 問新問題 consumes the held text, clears the old round and runs once immediately; repeated resolve / flush calls with no pending batch are no-ops. Quick prompts use the same topic-evidence rules as typed text; they never unconditionally reset a round.

## Natural typing acceptance

Use the real deployed index.html floating widget and cat.html, type each input and wait at least 5 seconds without pressing immediate query: 讀卡機讀不到 → 讀卡機怎麼重新啟動 → 顯示4043 → 點候選確認 → 這個要怎麼處理. Verify same-topic continuation and no automatic reset; click a same-topic quick prompt and verify no divider/reset. Type 怎麼改登入密碼 and verify one decision only; add fragments while held, then select 補充上一題 or 問新問題 in separate runs. Confirm new runs once, append keeps the old subject, and resolved old choices cannot be used. Test header reset, identical resubmissions, 不是這個 retaining the question, contextual negation, pending reset, human handoff and city cancellation. Record active/disabled choices, candidate outputs, pending visibility, version and screenshots; do not substitute quick prompts or internal round calls for natural typing acceptance.

- Remember explicitly rejected visible candidate IDs within the current question and exclude them from subsequent rankings. Retain text/error context; clear rejected IDs only on explicit new/reset, human handoff or city switch. A generic follow-up must not reoffer the exact candidates just rejected.
