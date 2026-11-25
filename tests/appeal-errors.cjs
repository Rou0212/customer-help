const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const c=vm.createContext({URL,location:{href:'https://example.test/'},window:{}});
for(const f of ['manuals.js','functional-index.js','faq.js','assistant.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);
const {routeQuestion}=c.window.LeyanCat;
for(const q of ['Ｅ２０１','E201','e201 附件未到','申覆附件資料未送達'])assert.equal(routeQuestion(q)?.type,'appeal-e201',q);
for(const q of ['申復上傳失敗','申複錯誤','申覆傳不上','申覆有問題','申復有問題','申複上傳異常','申覆出問題'])assert.equal(routeQuestion(q)?.type,'appeal-error',q);
assert.equal(routeQuestion('申覆壓縮檔錯誤')?.faqs?.[0],'e465');
assert.equal(routeQuestion('抽審上傳了40分鐘沒好')?.faqs?.[0],'vpn-queue');
assert.equal(routeQuestion('X光上傳失敗')?.type,'image-upload');

assert.equal(routeQuestion('申覆上傳錯誤 E300')?.faqs?.[0],'e300');
assert.notEqual(routeQuestion('申覆要怎麼操作')?.type,'appeal-error');
