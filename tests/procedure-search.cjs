// Run: node tests/procedure-search.cjs
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ctx=vm.createContext({});
vm.runInContext(fs.readFileSync('training/nhi-code-pages.js','utf8'),ctx);
for(const input of ['92133C','91021']){
 const hit=ctx.matchNhiProcedureCode(input);
 assert.equal(hit.status,'found');
 assert.equal(ctx.matchesNhiProcedureFaq(hit,{title:hit.code+' 的處置說明',group:'nhi'}),true);
 assert.equal(ctx.matchesNhiProcedureFaq(hit,{title:'特定醫令答案',tags:input}),true);
 assert.equal(ctx.matchesNhiProcedureFaq(hit,{title:'一般健保申報',text:hit.code}),false);
 assert.equal(ctx.matchesNhiProcedureFaq(hit,{title:'其他處置',tags:input==='91021'?'92133C':'91021C'}),false);
}
assert.equal(ctx.matchNhiProcedureCode('健保申報'),null);
assert.equal(ctx.matchNhiProcedureCode('根管未完成率'),null);
assert.equal(ctx.matchesNhiProcedureFaq(ctx.matchNhiProcedureCode('99999'),{tags:'99999'}),false);
console.log('PASS procedure FAQ matching, unrelated-body exclusion, natural queries');
