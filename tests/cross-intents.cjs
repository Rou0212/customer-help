const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx=vm.createContext({URL,location:{href:'https://example.test/'},window:{}});
for(const f of ['manuals.js','functional-index.js','faq.js','assistant.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx);
const {rankFaq,routeQuestion,isAccountLookup}=ctx.window.LeyanCat;
const cases=[
 ['您好，想詢問批價的「優待身份」項目，如何做更改及刪除','ley-discount'],
 ['如何刪掉優惠身分','ley-discount'],
 ['補卡出現優待部分負擔已經超過部分負擔費用','refill-discount'],
 ['更改付款方式','batch-41'],
 ['病歷調劑方式自費藥怎麼印','self-pay-prescription-print'],
 ['病歷裡要怎麼新增自費藥給患者','self-pay-prescription-print'],
 ['新增自費藥品','ley-drug'],
 ['有些人讀IC讀得到 有些人就要從雲端的牙科才能看到','ic-vs-cloud'],
 ['IC卡讀不到雲端看得到','ic-vs-cloud'],
 ['抽審傳了四十分鐘','vpn-queue'],
 ['系統沒有２５００４Ｃ','ley-procedure-add'],
 ['預約時間超過了要更改內容 無法點進去修改','batch-48'],
 ['患者換身分證怎麼調整','patient-id-edit'],
 ['欠卡患者換身分證無法補卡','id-change-refill-card'],
 ['補卡出現ICD10未填寫','9127'],
 ['福保釋低收嗎','copay-exemption-eligibility']
];
for(const [q,id] of cases)assert.equal(rankFaq(q)[0]?.f.id,id,q);
for(const [q,id] of [['申報上傳失敗等很久','vpn-queue'],['雲端的牙科才能看到','dental-daily-cash']])assert(!rankFaq(q).some(x=>x.f.id===id),q);
assert(isAccountLookup('牙科診所當天的現金帳在哪看'));
for(const [q,type] of [['申覆有問題','appeal-error'],['Ｅ２０１','appeal-e201'],['X光不能用','xray-open'],['X光上傳失敗','image-upload']])assert.equal(routeQuestion(q)?.type,type,q);
console.log('PASS 23 cross-intent cases');
