const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');const c=vm.createContext({URL,location:{href:'https://example.test/'},window:{}});for(const f of ['manuals.js','functional-index.js','faq.js','assistant.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);const cat=c.window.LeyanCat;
for(const q of ['合理量','我在問合理量耶','想問合理量','合理量怎麼算','合理量負數','調整合理量','合理門診點數','合理量調升','合理量調降']){assert.deepEqual(Array.from(cat.routeQuestion(q).faqs),['reasonable-volume-adjustment'],q);assert.deepEqual(Array.from(cat.rankFaq(q),x=>x.f.id),['reasonable-volume-adjustment'],q)}
for(const q of ['合理量指標','北區合理量免審','臺北合理量管控規範','合理量分區官方文件'])assert.equal(cat.routeQuestion(q),null,q);
console.log('PASS reasonable-volume bare/natural/correction questions and explicit regional-policy separation');
