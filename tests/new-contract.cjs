const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const s=fs.readFileSync('assistant.js','utf8'),c=vm.createContext({});
vm.runInContext(fs.readFileSync('faq.js','utf8')+';const FQ=FAQS;',c);
vm.runInContext(s.slice(s.indexOf(' const indicatorRegions=['),s.indexOf(' // 依中區'))+s.slice(s.indexOf(' function newContractFaqs('),s.indexOf(' function chooseNewContract('))+';this.pick=(q,city)=>newContractFaqs(q,city).map(f=>f.id);',c);
for(const q of ['新特約','新特約會抽審嗎','新特約申報','新特約支付標準']){
 assert.deepEqual(Array.from(c.pick(q,'臺南市')),['g000-no-card']);
 assert.deepEqual(Array.from(c.pick(q,'臺北市')),['taipei-control-06','taipei-control-07','taipei-control-08','g000-no-card']);
 for(const city of ['高雄市','臺中市','桃園市','花蓮縣'])assert.ok(!c.pick(q,city).some(id=>id.startsWith('taipei')));
}
assert.deepEqual(Array.from(c.pick('新特約忘帶健保卡','臺北市')),['g000-no-card']);
assert.ok(s.includes("if(n.includes('新特約'))return []"));
console.log('PASS new-contract approved FAQ and city scope; G000 remains available');
