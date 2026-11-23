const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto');
const c=vm.createContext({URL,location:{href:'https://example.test/'},window:{}});
for(const f of ['manuals.js','functional-index.js','faq.js','assistant.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);
const faq=vm.runInContext('FAQS',c),docs=vm.runInContext('documents',c),cat=c.window.LeyanCat;
assert.equal(faq.length,156);assert.equal(new Set(faq.map(f=>f.id)).size,156);
for(const [q,id] of [['樂晴的進度1~7各代表什麼意思','progress-1-7'],['掛號畫面卡號顯示02怎麼辦','02card'],['同意書的醫師簽名跑不出來','consent-signature-missing'],['針對個別患者要怎麼撈出醫令清單','batch-26'],['醫療費用要補報要怎麼做','supplement-claim-upload'],['補報的抽審要從哪裡上傳','supplement-review-upload'],['醫療費用收據上要顯示印花稅總繳章要怎麼設定','receipt-stamp-image']])assert.equal(cat.rankFaq(q)[0].f.id,id,q);
for(const q of ['主訴在哪調整','醫療費用要補報要怎麼做'])assert(!cat.rankFaq(q).some(x=>['batch-38','receipt-stamp-image','diag-fee'].includes(x.f.id)),q);
assert(!cat.rankFaq('樂晴的進度1~7各代表什麼意思').some(x=>x.f.id==='batch-36'));
assert(!cat.rankFaq('進度6是什麼').some(x=>x.f.id==='user-pw'));
assert(!cat.rankFaq('補報申報日期').some(x=>x.f.id==='e300'));
for(const q of ['申覆','申複','申復'])assert.deepEqual(Array.from(cat.rankFaq(q).map(x=>x.f.id)),Array.from(cat.rankFaq('申覆').map(x=>x.f.id)));
for(const f of faq){if(f.img)assert(fs.existsSync('images/faq/'+f.img+'.png'),f.id);for(const id of [f.doc,...(f.docs||[])].filter(Boolean))assert(docs.some(d=>d.id===id),f.id);}
for(const id of ['manual-order-list','supplement-claim','cache-desktop','cache-mobile']){const d=docs.find(d=>d.id===id),b=fs.readFileSync(d.url);assert.equal(b.subarray(0,5).toString(),'%PDF-');assert.equal(crypto.createHash('sha256').update(b).digest('hex'),d.sha256);}
assert(faq.find(f=>f.id==='progress-1-7').text.includes('6：異動病歷後重新寫卡完成'));
assert(faq.find(f=>f.id==='supplement-claim-upload').text.includes('暫不提供填法'));
console.log('PASS approved batch: seven question routes, unrelated exclusions, aliases, attachments, 156 IDs and pending-date boundary');

for(const q of ['進度意思','進度','進度怎麼看','進度是什麼','進度說明'])assert.equal(cat.rankFaq(q)[0].f.id,'progress-1-7',q);
for(const q of ['補報進度','上傳進度','簽章進度','申報進度查詢'])assert(!cat.rankFaq(q).some(x=>x.f.id==='progress-1-7'),q);
console.log('PASS short progress questions and distinct workflow-progress exclusions');
