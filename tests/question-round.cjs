const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');const c=vm.createContext({URL,location:{href:'https://example.test/'},window:{}});for(const f of ['manuals.js','functional-index.js','faq.js','assistant.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);
let now=0,id=0,jobs=new Map(),out=[],choices=0;const clock={now:()=>now,set:(f,n)=>{jobs.set(++id,{at:now+n,f});return id},clear:i=>jobs.delete(i)};function tick(n){const end=now+n;while(true){let next=[...jobs].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>end)break;now=next[1].at;jobs.delete(next[0]);next[1].f()}now=end}const r=c.window.LeyanCat.createQuestionRound({clock,run:q=>out.push(q),pending:()=>{},choose:()=>choices++});
r.submit('申報');tick(4000);r.submit('出現錯誤');tick(4999);assert.equal(out.length,0);tick(1);assert.equal(out.pop(),'申報\n出現錯誤');r.submit('代碼5022');r.flush();assert.equal(out.pop(),'申報\n出現錯誤\n代碼5022');
r.submit('不是申報，是讀卡機沒反應');r.flush();assert.equal(out.pop(),'讀卡機沒反應');r.submit('新增藥品');assert.equal(choices,1);tick(6000);assert.equal(out.length,0);r.resolve('new');r.flush();assert.equal(out.pop(),'新增藥品');r.submit('收據');r.resolve('append');r.flush();assert.equal(out.pop(),'新增藥品\n收據');
r.reset();r.submit('申報');for(let i=0;i<14;i++){tick(4000);r.submit('出現錯誤')}tick(4000);assert.equal(out.length,1);assert.equal(now>=60000,true);r.reset();r.submit('待查');r.reset();tick(60000);assert.equal(out.length,1);assert.equal(r.text,'');console.log('PASS debounce, maximum 60s, immediate, accumulated follow-up, correction, ambiguity choices and reset cancellation');

// Explicit topic decisions must complete once, without re-entering ambiguity or leaving a delayed query.
r.reset();out=[];choices=0;
r.submit('讀卡機沒反應');r.flush();assert.deepEqual(out,['讀卡機沒反應']);
r.submit('那個設定');assert.equal(choices,1);r.resolve('new');
assert.deepEqual(out,['讀卡機沒反應','那個設定']);assert.equal(r.text,'那個設定');
r.resolve('new');r.flush();tick(60000);assert.equal(out.length,2,'new decision must run exactly once');assert.equal(choices,1);
// A known quick-prompt intent starts a new round, but still allows segmented supplements.
r.submit('上傳無法夾帶檔案','new');assert.equal(choices,1);tick(3000);r.submit('顯示錯誤5022');tick(5000);
assert.equal(out.at(-1),'上傳無法夾帶檔案\n顯示錯誤5022');assert.equal(choices,1);
// Header reset clears pending/held state; the first question must never ask for topic disambiguation.
r.submit('另一個題目');assert.equal(choices,2);r.reset();r.submit('上傳無法夾帶檔案');r.flush();
assert.equal(out.at(-1),'上傳無法夾帶檔案');assert.equal(choices,2);
r.submit('密碼');assert.equal(choices,3);r.resolve('append');r.flush();assert.equal(out.at(-1),'上傳無法夾帶檔案\n密碼');
const before=out.length;r.submit('出現5022');r.reset();r.resolve('new');r.flush();tick(60000);assert.equal(out.length,before);
console.log('PASS explicit new resolves once immediately, quick intent plus split supplement, reset clears held/pending, append preserved');
