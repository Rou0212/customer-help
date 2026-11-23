// 同事回報：問「掛號時間可以自己調嗎」卻只出現「初診或未帶健保卡怎麼掛號」。
// 應該回答掛號時間權限設定，且不要混入只因「掛號」二字碰到的無關問答。
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c=vm.createContext({URL,location:{href:'https://example.test/'},window:{}});
for(const f of ['manuals.js','faq.js','assistant.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);
const cat=c.window.LeyanCat;
for(const q of ['掛號時間可以自己調嗎','掛號時間怎麼改','怎麼修改掛號的時間','可以改掛號結束時間嗎','掛號時間能調整嗎']){
 const r=cat.rankFaq(q);
 assert.equal(r[0]?.f.id,'reg-time-edit',q);
 assert(!r.slice(0,2).some(x=>x.f.id==='np-nocard'),q+' 不應出現初診掛號');
}
// 原本的掛號問題不受影響
assert.equal(cat.rankFaq('初診怎麼掛號')[0].f.id,'np-nocard');
assert.equal(cat.rankFaq('沒帶健保卡怎麼掛號')[0].f.id,'np-nocard');
assert.equal(cat.rankFaq('掛號費要調整')[0].f.id,'batch-38');
// 相關的錯誤代碼仍會一起列為候選
assert(cat.rankFaq('錯誤 9043：醫師 PIN 碼鎖住').slice(0,2).some(x=>x.f.id==='9039'));
console.log('PASS registration time FAQ and weak-candidate filtering');
