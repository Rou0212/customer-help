const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const root=require('path').resolve(__dirname,'..')+'/';
const s=fs.readFileSync(root+'assistant.js','utf8'),h=fs.readFileSync(root+'index.html','utf8');
const c=vm.createContext({});vm.runInContext(fs.readFileSync(root+'faq.js','utf8')+';const FQ=FAQS;',c);
vm.runInContext(s.split('\n').find(x=>x.startsWith('const norm='))+s.slice(s.indexOf(' const indicatorRegions=['),s.indexOf(" const cityKey="))+s.slice(s.indexOf(' function taipeiIndicatorChoices('),s.indexOf(' function chooseTaipeiIndicator('))+';this.pick=taipeiIndicatorChoices;this.region=regionalIndicatorQuestion;',c);
for(const q of ['管控的點數怎看','管控點數','指標','我的指標超標有關係嗎']){assert.equal(c.region(q),true,q);assert.ok(c.pick(q).length>1);assert.ok(c.pick(q).every(f=>f.group==='taipei'));}
assert.equal(c.pick('新特約')[0].id,'taipei-control-06');
const home=vm.createContext({});
for(const name of ['norm','searchHit','topicSearchHit'])vm.runInContext(h.split('\n').find(l=>l.startsWith('const '+name+'=')),home);
for(const q of ['管控的點數怎看','管控點數','指標','我的指標超標有關係嗎']){home.q=q;assert.equal(vm.runInContext("topicSearchHit(q,'台北區｜哪些項目不會算進管控的申報點數？','')",home),true);assert.equal(vm.runInContext("topicSearchHit(q,'電子抽審','')",home),false);}
assert.equal(vm.runInContext("topicSearchHit('醫令','其他主題','醫令')",home),false);
assert.ok(s.includes("f.group==='taipei'&&indicatorRegions.find"));
console.log('PASS Taipei multi-candidate wording, new-contract scope, homepage aliases and exact 醫令 body exclusion');
