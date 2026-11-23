const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');const c=vm.createContext({URL,location:{href:'https://example.test/'},window:{}});for(const f of ['manuals.js','functional-index.js','faq.js','assistant.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);const cat=c.window.LeyanCat;
const positive=['請問一下你們系統有費用報價嗎，我們之後可能有開業的計劃想了解一下','報價','系統多少錢','多少錢你們的系統','你們系統費用怎麼算','價格是多少','想詢問合約','想續約','簽約找誰','我們要開業想問報價'];
const negative=['醫療費用要補報要怎麼做','醫療費用收據上要顯示印花稅總繳章要怎麼設定','掛號費要調整','診察費怎麼查','健保申報費用','日結費用不對','部分負擔費用','生日簡訊儲值','收據費用錯誤','系統醫療費用補報'];
for(const q of positive){assert.equal(cat.routeQuestion(q)?.type,'human',q);assert.equal(cat.rank(q).length+cat.rankFaq(q).length,0,q)}
for(const q of negative)assert.notEqual(cat.routeQuestion(q)?.type,'human',q);
for(const q of ['請問補卡出現這個要怎麼處理','醫事人員卡認證時出現這個代碼是鎖卡了嗎?','請問怎麼不能寫卡？','這個確定不是讀卡機的問題嗎？','請問4月要申報，為什麼會出現這個ic上傳']){assert.equal(cat.routeQuestion(q)?.type,'clarify',q);assert.equal(cat.rank(q).length+cat.rankFaq(q).length,0,q)}
assert.deepEqual(Array.from(cat.rankFaq('請問我們可以調2/3的監視器畫面嗎?'),x=>x.f.id),['m061']);assert(cat.rankFaq('請問我們可以調2/3的監視器畫面嗎?')[0].f.form.filename.includes('v2_2'));
console.log('PASS quotation 10 positives / 10 negatives, missing context, unchanged current m061');
