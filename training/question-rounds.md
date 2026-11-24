# Website question rounds

`assistant.js` owns only the website widget; LINE worker remains unchanged.

- Text, quick prompts, confirmed local OCR text and speech use `ask`.
- `createQuestionRound` keeps local round text, debounces 5 seconds from last submission, and flushes at 60 seconds from the first submission in a batch. Immediate query flushes that batch.
- Dependent prefixes / error codes supplement the round; explicit `不是…是…` replaces the direction. Otherwise visitors choose supplement or new question before ranking. New question and city changes clear timers and fixed clarifications; human requests bypass timers and clear state immediately.
- Before reranking, disable prior candidate controls and links. Approved FAQ/manual answers still require candidate confirmation; account dental/non-dental remains an explicit confirmation path.
- OCR results and their buttons carry a round epoch and city check so stale images cannot submit into a later round.

Verification: run `for f in tests/*.cjs; do node "$f" || exit 1; done`. `tests/question-round.cjs` uses a fake clock for exact debounce / 60-second / cancellation assertions. Browser acceptance: split input, correction, candidate confirmation, supplementary error code, ambiguous change/new selection, account clinic follow-up, human request and city switch while timer pending. Check mobile overflow and browser errors.

## Compact conversation UI

- Header 新問題 resets local state, cancels pending queries, invalidates old controls, clears the draft, and inserts a muted divider without deleting history. Choosing 問新問題 in a disambiguation also inserts a divider before its new query runs.
- The status / 立即查詢 row is visible only while a debounce batch is pending. It is hidden initially, after a query, during topic disambiguation, and on reset / human handoff / city switch.
- Check both index.html floating widget (480px desktop) and cat.html at desktop and 390px; verify reset in header, no blank toolbar, pending-only immediate action, retained history with disabled old candidates, and no horizontal overflow.

- Explicit 問新問題 consumes the held text, clears the old round and runs once immediately; repeated resolve / flush calls with no pending batch are no-ops. Quick prompts supply an explicit new-round intent instead of entering topic disambiguation, while retaining the 5-second window for typed supplements.
