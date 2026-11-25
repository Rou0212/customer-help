const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const context=vm.createContext({URL,location:{href:'https://example.test/'},window:{}});
for(const f of ['manuals.js','functional-index.js','faq.js','assistant.js'])vm.runInContext(fs.readFileSync(f,'utf8'),context);
const {routeQuestion}=context.window.LeyanCat;
for(const q of ['ｘ光不能開','ｘ光打不開','ｘ光不能用','X 光無法開啟','X光開不起來'])assert.equal(routeQuestion(q)?.type,'xray-open',q);
for(const q of ['X 光上傳不能用','X 光上傳失敗'])assert.equal(routeQuestion(q)?.type,'image-upload',q);
assert.notEqual(routeQuestion('樂晴不能用')?.type,'xray-open');
