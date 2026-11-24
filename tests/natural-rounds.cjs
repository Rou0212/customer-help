const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const ctx=vm.createContext({URL,location:{href:'https://example.test/'},window:{}});
for(const f of ['manuals.js','functional-index.js','faq.js','assistant.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx);
let now=0,id=0,jobs=new Map(),out=[],choices=0,restarts=0;
const clock={now:()=>now,set:(f,n)=>{jobs.set(++id,{at:now+n,f});return id},clear:i=>jobs.delete(i)};
function tick(n){const end=now+n;while(true){const next=[...jobs].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>end)break;now=next[1].at;jobs.delete(next[0]);next[1].f()}now=end}
const r=ctx.window.LeyanCat.createQuestionRound({clock,run:q=>out.push(q),pending:()=>{},choose:()=>choices++,restart:()=>restarts++});
const ask=q=>{r.submit(q);tick(5000);return out.at(-1)};
assert.equal(ask('讀卡機讀不到'),'讀卡機讀不到');
assert.equal(ask('怎麼改密碼'),'怎麼改密碼');assert.equal(choices,0);
assert.equal(ask('上傳無法夾帶檔案'),'上傳無法夾帶檔案');assert.equal(choices,0);
assert.equal(ask('補充錯誤E465'),'上傳無法夾帶檔案\n補充錯誤E465');
assert.equal(ask('要怎麼做'),'上傳無法夾帶檔案\n補充錯誤E465\n要怎麼做');
assert.equal(ask('不是這個'),'不是這個');assert.equal(r.text,'');assert.equal(choices,0);
assert.equal(ask('停電要怎麼關機'),'停電要怎麼關機');
r.reset();assert.equal(ask('讀卡機讀不到'),'讀卡機讀不到');
assert.equal(ask('讀卡機讀不到'),'讀卡機讀不到');assert.equal(choices,0,'same question must not require a choice or concatenate itself');
// Real uncertainty pauses once; further fragments are retained, not searched with A.
r.submit('那個設定');const previous=out.length;tick(60000);assert.equal(out.length,previous);
r.submit('那個設定');r.submit('找不到了');r.resolve('new');assert.equal(out.at(-1),'那個設定\n找不到了');
const count=out.length;r.resolve('new');r.flush();tick(60000);assert.equal(out.length,count);
// A full new question can replace a held unclear fragment without another decision.
r.submit('其他的');const before=choices;r.submit('我要新增藥品');tick(5000);assert.equal(choices,before);assert.equal(out.at(-1),'我要新增藥品');
r.submit('收據');r.resolve('append');tick(5000);assert.equal(out.at(-1),'我要新增藥品\n收據');
// Normal segmented text stays within the pending 5s window; explicit independent questions do not merge.
r.reset();r.submit('讀卡機');tick(2000);r.submit('讀不到');tick(4999);const size=out.length;tick(1);assert.equal(out.length,size+1);assert.equal(out.at(-1),'讀卡機\n讀不到');
r.submit('怎麼改密碼');tick(1000);r.submit('上傳無法夾帶檔案');tick(5000);assert.equal(out.at(-1),'上傳無法夾帶檔案');
r.submit('顯示E465');r.reset();const stopped=out.length;tick(60000);assert.equal(out.length,stopped);
assert.equal(ask('無法申報健保資料'),'無法申報健保資料');assert.equal(ask('如何共用Google日曆'),'如何共用Google日曆');
assert.equal(ask('不是日曆，是讀卡機讀不到'),'讀卡機讀不到');
assert.ok(restarts>=5);console.log('PASS natural independent topics, rejection, repeats, held fragments, explicit decisions once, split input, resets and corrections');
