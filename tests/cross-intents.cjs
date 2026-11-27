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
 ['您好、想請教看診過的這些預約資料項目的顏色可以改嗎？如果可以是在哪邊更改呢？','appointment-arrival-color'],
 ['到診顏色怎麼改','appointment-arrival-color'],
 ['到枕顏色','appointment-arrival-color'],
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
for(const q of ['簡訊發送不出但有通數','簡訊有通數卻發送失敗','簡訊發不出去','簡訊通數不足','簡訊具名怎麼寫'])assert.equal(rankFaq(q)[0]?.f.id,'batch-49',q);
assert.equal(rankFaq('要發送生日簡訊給當月壽星，要如何操作？')[0]?.f.id,'report-birthday-sms');
assert.notEqual(rankFaq('LINE不能發訊息')[0]?.f.id,'batch-49');

for(const q of ['預設預約背景色怎麼改','怎麼改休診顏色']) assert.notEqual(rankFaq(q)[0]?.f.id,'appointment-arrival-color',q);

for(const q of ['外籍人士身分證要打什麼','外籍人士身份證要打什麼','外國人建檔要填什麼','外籍病人掛號可以填護照嗎']) assert.equal(rankFaq(q).map(x=>x.f.id).join(','),'np-nocard',q);
for(const q of ['寫卡錯誤 5020：資料不一致','批價沒有帶入健保身分','欠卡患者換身分證無法補卡']) assert.notEqual(rankFaq(q)[0]?.f.id,'np-nocard',q);

for(const q of ['4000','４０００ TIME OUT','4000-讀卡機 TIMEOUT','讀卡機逾時']) assert.equal(rankFaq(q)[0]?.f.id,'4000',q);
assert.notEqual(rankFaq('網路 TIMEOUT')[0]?.f.id,'4000');
assert.equal(ctx.window.LeyanCat._ocrPrep.popupCode('4O00 - 讀卡機 time out\n5022 其他資料',true),'4000 讀卡機 TIMEOUT');
