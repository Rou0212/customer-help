const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');let c=vm.createContext({URL,location:{href:'https://example.test/'},window:{}});for(let f of ['manuals.js','functional-index.js','faq.js','assistant.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);let cat=c.window.LeyanCat;
for(let q of ['不能發訊息','請問為什麼不能發訊息？','不是簡訊，是其他訊息','都不是','帳密忘記了','帳號要去哪裡查']){assert.equal(cat.routeQuestion(q).type,'clarify',q);assert.equal(cat.rankFaq(q).length+cat.rank(q).length,0,q);}
for(let q of ['掛號費要調整','調整掛號費','掛號費，想改一下','不是報價，我要改掛號費']){assert.deepEqual(Array.from(cat.rankFaq(q),x=>x.f.id),['batch-38']);assert.equal(cat.rank(q).length,0);}
for(let [q,exclude] of [['不是讀卡機，是新增藥品','card-reader-errors'],['不是藥品，是讀卡機沒反應','ley-drug']])assert(![...cat.rankFaq(q).map(x=>x.f.id),...cat.rank(q).map(x=>x.d.id)].includes(exclude),q);
console.log('PASS multi-turn clarification, explicit topic rejection and fee candidate isolation');
