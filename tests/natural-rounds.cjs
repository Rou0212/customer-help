const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const ctx=vm.createContext({URL,location:{href:'https://example.test/'},window:{}});for(const f of ['manuals.js','functional-index.js','faq.js','assistant.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx);
let now=0,id=0,jobs=new Map(),out=[],choices=0,restarts=0;
const clock={now:()=>now,set:(f,n)=>{jobs.set(++id,{at:now+n,f});return id},clear:i=>jobs.delete(i)};
function tick(n){const end=now+n;while(true){const next=[...jobs].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>end)break;now=next[1].at;jobs.delete(next[0]);next[1].f()}now=end}
const r=ctx.window.LeyanCat.createQuestionRound({clock,run:q=>out.push(q),pending:()=>{},choose:()=>choices++,restart:()=>restarts++});
const ask=q=>{r.submit(q);tick(5000);return out.at(-1)};
assert.equal(ask('讀卡機讀不到'),'讀卡機讀不到');
assert.equal(ask('讀卡機怎麼重新啟動'),'讀卡機讀不到\n讀卡機怎麼重新啟動');assert.equal(choices,0);assert.equal(restarts,0);
assert.equal(ask('這個設定在哪裡'),'讀卡機讀不到\n讀卡機怎麼重新啟動\n這個設定在哪裡');assert.equal(choices,0);
// A same-topic quick-prompt string follows the same persistent rule as typed text.
assert.equal(ask('讀卡機沒反應'),'讀卡機讀不到\n讀卡機怎麼重新啟動\n這個設定在哪裡\n讀卡機沒反應');assert.equal(restarts,0);
const old=r.text;r.submit('怎麼改登入密碼');assert.equal(choices,1);tick(60000);assert.equal(r.text,old);
r.submit('怎麼改登入密碼');r.submit('找不到設定');r.resolve('new');assert.equal(out.at(-1),'怎麼改登入密碼\n找不到設定');assert.equal(restarts,1);
const count=out.length;r.resolve('new');r.flush();tick(60000);assert.equal(out.length,count);
assert.equal(ask('登入密碼忘記怎麼辦'),'怎麼改登入密碼\n找不到設定\n登入密碼忘記怎麼辦');assert.equal(choices,3,'only held-input updates rerender the same choice, not a new topic query');
r.submit('上傳無法夾帶檔案');assert.equal(choices,4);r.resolve('new');assert.equal(r.text,'上傳無法夾帶檔案');
assert.equal(ask('補充錯誤E465'),'上傳無法夾帶檔案\n補充錯誤E465');
assert.equal(ask('申覆上傳檔案要怎麼選'),'上傳無法夾帶檔案\n補充錯誤E465\n申覆上傳檔案要怎麼選');
const upload=r.text;assert.equal(ask('不是這個'),'不是這個');assert.equal(r.text,upload,'reject a candidate without deleting useful question context');
assert.equal(ask('顯示E465'),upload+'\n顯示E465');
r.reset();assert.equal(ask('讀卡機讀不到'),'讀卡機讀不到');assert.equal(ask('讀卡機讀不到'),'讀卡機讀不到');
assert.equal(ask('那個設定'),'讀卡機讀不到\n那個設定');
assert.equal(ask('不是讀卡機，是印表機'),'印表機讀不到\n那個設定');
r.reset();r.submit('申報上傳失敗');r.submit('顯示E465');r.submit('不是申報，是申覆');tick(5000);assert.equal(out.at(-1),'申覆上傳失敗\n顯示E465');
r.reset();r.submit('讀卡機');tick(2000);r.submit('讀不到');tick(4999);const size=out.length;tick(1);assert.equal(out.length,size+1);assert.equal(out.at(-1),'讀卡機\n讀不到');
r.submit('怎麼改登入密碼');r.reset();const stopped=out.length;tick(60000);assert.equal(out.length,stopped);assert.equal(ask('上傳無法夾帶檔案'),'上傳無法夾帶檔案');
console.log('PASS persistent full sentences/quick text, low-information supplements, disjoint-topic choice, rejection retains context, contextual negation and repeat/reset');
