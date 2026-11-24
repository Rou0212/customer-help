const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');const c=vm.createContext({URL,location:{href:'https://example.test/'},window:{}});
for(const f of ['manuals.js','functional-index.js','faq.js','assistant.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);
const match=c.window.LeyanCat.isWaitCommand;
for(const q of ['等等','等一下','請等一下喔','請，等一下喔。','麻煩你等一下','等我一下！','先等等','稍等一下','再等一下下','請你先等一等吧','等等我','稍等'])assert.equal(match(q),true,q);
for(const q of ['讀卡機一直等待中','上傳等等要怎麼處理','等一下再上傳申報','我要問等等的上傳問題','讀卡機顯示請等一下','等等是什麼意思','我等一下上傳','請等候系統回應','一直失敗','顯示E465',''])assert.equal(match(q),false,q);
assert.equal(c.window.LeyanCat.routeQuestion('不是這個').type,'clarify');
assert.equal(c.window.LeyanCat.isAccountLookup('當天帳怎麼看'),true);
console.log('PASS anchored natural standalone waits and no substring false positives; existing rejection/account routes retained');
