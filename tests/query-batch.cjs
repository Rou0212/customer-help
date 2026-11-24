const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const ctx=vm.createContext({URL,location:{href:'https://example.test/'},window:{}});
for(const f of ['manuals.js','functional-index.js','faq.js','assistant.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx);
function fixture(){let now=0,id=0,jobs=new Map(),out=[],states=[],starts=0,idle=0;
 const clock={now:()=>now,set:(f,n)=>{jobs.set(++id,{at:now+n,f});return id},clear:i=>jobs.delete(i)};
 const batch=ctx.window.LeyanCat.createQueryBatch({clock,run:q=>out.push(q),start:()=>starts++,idleWait:()=>idle++,pending:s=>states.push(s&&{...s})});
 function tick(n){const end=now+n;while(true){const next=[...jobs].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>end)break;now=next[1].at;jobs.delete(next[0]);next[1].f()}now=end}
 return {batch,tick,out,states,get starts(){return starts},get idle(){return idle},get jobs(){return jobs.size},get now(){return now}};
}
let f=fixture();f.batch.submit('讀卡機讀不到');assert.equal(f.starts,1);
for(let seconds=5;seconds>=1;seconds--){assert.equal(f.states.at(-1).seconds,seconds);f.tick(1000)}
assert.deepEqual(f.out,['讀卡機讀不到']);assert.equal(f.batch.text,'');assert.equal(f.batch.active,false);assert.equal(f.states.at(-1),null);assert.equal(f.jobs,0);
f.batch.flush();f.tick(60000);assert.equal(f.out.length,1);
f.batch.submit('怎麼改登入密碼');f.tick(5000);assert.deepEqual(f.out,['讀卡機讀不到','怎麼改登入密碼']);assert.equal(f.starts,2,'each completed batch starts independently without any topic decision');
f=fixture();f.batch.submit('健保上傳');f.tick(4000);f.batch.submit('一直失敗');assert.equal(f.states.at(-1).seconds,5);f.tick(4999);assert.equal(f.out.length,0);f.tick(1);assert.equal(f.out[0],'健保上傳\n一直失敗');
f.batch.submit('顯示E465');f.tick(5000);assert.equal(f.out[1],'顯示E465','a code after completion cannot inherit the prior batch');
f=fixture();f.batch.submit('健保上傳');f.tick(3000);f.batch.submit('請，等一下喔。');assert.equal(f.states.at(-1).seconds,15);assert.equal(f.states.at(-1).waiting,true);f.tick(1000);assert.equal(f.states.at(-1).seconds,14);
f.tick(2000);f.batch.submit('等等');assert.equal(f.states.at(-1).seconds,15);f.tick(1000);f.batch.submit('一直失敗');assert.equal(f.states.at(-1).seconds,5);assert.equal(f.states.at(-1).waiting,false);f.tick(5000);assert.equal(f.out[0],'健保上傳\n一直失敗');
f.batch.submit('等一下');assert.equal(f.idle,1);assert.equal(f.starts,1);assert.equal(f.jobs,0);assert.equal(f.batch.flush(),false);assert.equal(f.out.length,1);
f=fixture();f.batch.submit('待查');f.batch.submit('等一下');f.tick(14999);assert.equal(f.out.length,0);f.tick(1);assert.equal(f.out[0],'待查');
f=fixture();f.batch.submit('待查');for(let i=0;i<4;i++){f.tick(i?14000:4000);f.batch.submit('等一下')};f.tick(13999);assert.equal(f.out.length,0);f.tick(1);assert.equal(f.now,60000);assert.deepEqual(f.out,['待查']);assert.equal(f.jobs,0,'wait extensions cannot escape 60-second cap');
f=fixture();f.batch.submit('申報');for(let i=0;i<14;i++){f.tick(4000);f.batch.submit('出現錯誤')};f.tick(4000);assert.equal(f.out.length,1);assert.equal(f.now,60000);
f=fixture();f.batch.submit('先前問題');f.batch.submit('等等');f.batch.reset();f.tick(60000);assert.equal(f.out.length,0);assert.equal(f.jobs,0);assert.equal(f.states.at(-1),null);
f.batch.submit('新問題內容');assert.equal(f.batch.flush(),true);assert.deepEqual(f.out,['新問題內容']);assert.equal(f.starts,2);
console.log('PASS real-second countdown, debounce reset, isolated batches/codes, wait15/repeat/resume5, idle wait, immediate, cap60 and cancellation');
