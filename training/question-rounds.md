# Website single-query batches

`assistant.js` changes only the website widget. LINE remains unchanged; PR #19 styling and animal selection remain in place.

## Current contract

- `createQueryBatch` owns only pending text. Submit starts a real 5-second countdown; any actual supplement before completion joins that batch and resets the countdown to 5. Flush consumes and clears all text before routing. The next input is a new independent query, regardless of topic or error-code similarity.
- There is no persistent question round and no new/append topic-choice flow. Do not restore topic heuristics or carry `lastQuestion` into a later batch. Plain typed text, quick prompts, confirmed local OCR and speech all enter through `ask`.
- Anchored standalone waits (`等等`, `等一下`, polite/punctuated variants) extend an active batch from 15 seconds and reset again on repetition. They are shown as user commands but excluded from query text and question statistics. Actual new text returns the countdown to 5. Full questions containing wait words are ordinary input. A wait with no pending text gives a short instruction, never an empty query.
- Keep the first-input 60-second hard cap across every supplement and wait extension; do not expose it in the visitor UI. Tick once per displayed second using wall-clock deadlines, and clear timers on flush/reset.
- New batches invalidate old candidate/answer buttons and links and clear `lastQuestion` and pending operational choices. Candidate confirmation still precedes approved FAQ/manual content. Dental/non-dental buttons, regional document choices and similar explicit operational choices belong to the completed query, not to a new search. A typed dental/non-dental reply is accepted only while that explicit choice is pending.
- Human requests bypass timers and cancel pending queries immediately. Header reset, typed reset commands and city changes cancel pending text, invalidate old controls and retire OCR epochs. A local OCR result/confirmation cannot submit after its originating batch has ended or been reset.

## UI and accessibility

- Place the pale purple-gray pin card outside the scrollable log, below the header. Yellow marker covers only `麻煩將問題一次輸入完整`; the trailing animal name follows the selected animal. Keep the inline official human-support action and PR #19 support card.
- Show countdown and immediate-query action only while pending, inside the conversation. Wait mode replaces the numeric circle with a hanging sloth and keeps the numeric remaining seconds beside it. Do not scroll the conversation on each tick.
- Mark the decorative countdown/pending region `aria-live=off` and dynamic numbers `aria-hidden=true`. Announce only input/mode changes/completion via a separate status region, not every second.
- Keep selected animal names and illustrations dynamic. Never globally rename animal characters to a generic helper.

## Verification

Run `for f in tests/*.cjs; do node "$f" || exit 1; done`, `node --check assistant.js`, and `git diff --check`. `tests/query-batch.cjs` uses a fake clock for exact 5→4 ticks, supplementation, 15→14 waits, repeated waits, resume5, completion isolation, immediate flush, idle wait, cap60 and cancellation. `tests/wait-command.cjs` covers polite commands and complete-question false positives. Existing tests retain approved FAQ, fixed account routing, procedure and regional rules.

In both real index.html floating widget and cat.html, type and actually wait (do not substitute internal function calls): 健保上傳 → 一直失敗 (reset5) → 等一下 (15→14) → actual detail (back to5). Confirm query candidates, click one to reveal approved content, then submit an unrelated next question and verify old controls stop working. Test no-pending wait, a complete question containing 等待/等等, header/city/human cancellation, dental/non-dental choice, animal switch/name, OCR epoch guards, mobile390 and desktop layout. Capture screenshots, inspect browser errors, and compare scrollWidth with innerWidth. Verify the deployed Pages commit and cache tokens before acceptance.
