// 同事回報：問「掛號時間可以自己調嗎」卻只出現「初診或未帶健保卡怎麼掛號」。
// 主線已新增 registration-time 問答，這裡確認各種問法都會先回答它，且不混入初診掛號。
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c=vm.createContext({URL,location:{href:'https://example.test/'},window:{}});
for(const f of ['manuals.js','faq.js','assistant.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);
const cat=c.window.LeyanCat;
for(const q of ['這個掛號時間可以調嗎','掛號時間可以自己調嗎','掛號時間怎麼改','怎麼修改掛號的時間','可以改掛號結束時間嗎','掛號時間能調整嗎']){
 const r=cat.rankFaq(q);
 assert.equal(r[0]?.f.id,'registration-time',q);
 assert(!r.slice(0,2).some(x=>x.f.id==='np-nocard'),q+' 不應出現初診掛號');
}
// 原本的掛號問題不受影響
assert.equal(cat.rankFaq('初診怎麼掛號')[0].f.id,'np-nocard');
assert.equal(cat.rankFaq('沒帶健保卡怎麼掛號')[0].f.id,'np-nocard');
console.log('PASS registration time FAQ');
// 同事回報：問「權限怎麼改」完全找不到，只出現人工客服。
for(const q of ['權限怎麼改','修改權限','帳號權限','權限設定','怎麼開權限','我沒有權限','群組權限']){
 assert.equal(cat.rankFaq(q)[0]?.f.id,'permission-edit',q);
}
assert.equal(cat.rankFaq('樂易智看不到設定選項')[0].f.id,'batch-37');
// 人工客服提示要用目前夥伴的名字，不寫死「小黑貓」
assert(!/supportHtml\(\)/.test(fs.readFileSync('assistant.js','utf8')),'supportHtml 要帶入夥伴名稱');
console.log('PASS permission FAQ and companion name in support box');
// 醫事卡（醫師卡）問題一律引導到醫事憑證管理中心；有對應教案（醫事卡解鎖）就一起附上
const byId=id=>vm.runInContext('FAQS',c).find(f=>f.id===id);
for(const q of ['醫事卡怎麼開卡','醫師卡開卡','開卡'])assert.equal(cat.rankFaq(q)[0]?.f.id,'hca-open',q);
for(const q of ['醫事卡','醫事卡密碼忘記','醫事卡過期','醫事卡遺失'])assert.equal(cat.rankFaq(q)[0]?.f.id,'hca-card',q);
for(const q of ['醫事卡鎖住了','醫師卡鎖卡'])assert.equal(cat.rankFaq(q)[0]?.f.id,'9043',q);
assert(cat.rankFaq('醫事卡解鎖').slice(0,2).some(x=>x.f.id==='9043'));
for(const id of ['hca-open','hca-card'])assert.equal(byId(id).sourceUrl,'https://hca.nat.gov.tw/');
assert.deepEqual([...byId('hca-card').docs],['hca-unlock']);
// 一般「忘記密碼」仍是系統密碼；讀不到卡仍先處理讀卡機
assert.equal(cat.rankFaq('忘記密碼')[0].f.id,'user-pw');
assert.equal(cat.rankFaq('醫師卡讀不到')[0].f.id,'restart-console');
console.log('PASS HCA card questions link to hca.nat.gov.tw with unlock tutorial');
