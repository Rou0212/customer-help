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

// Exercise the actual homepage topic matcher against the current content.
const home=fs.readFileSync('index.html','utf8');
for(const name of ['norm','searchHit','topicSearchHit']){
 const line=home.split('\n').find(l=>l.startsWith('const '+name+'='));
 assert.ok(line, name+' exists');
 vm.runInContext(line,ctx);
}
vm.runInContext(fs.readFileSync('faq.js','utf8'),ctx);
vm.runInContext(fs.readFileSync('manuals.js','utf8'),ctx);
const matches=vm.runInContext("FAQS.filter(f=>topicSearchHit('醫令',f.title+' '+f.tags,(f.text||'')+' '+(f.steps||[]).join(' '))).map(f=>f.id)",ctx);
assert.deepEqual(Array.from(matches),['9999','ic-vs-cloud','batch-26']);
assert.equal(vm.runInContext("documents.filter(d=>!d.region&&!d.parent&&topicSearchHit('醫令',d.title+' '+d.description+' '+d.keywords,d.fullSteps.join(' '))).map(d=>d.id).join(',')",ctx),'nhi-dentist-handbook-2026,manual-order-list');
for(const q of ['醫令上傳','影像醫令上傳率','健保申報','根管未完成率']){
 ctx.query=q;
 assert.equal(vm.runInContext("FAQS.every(f=>topicSearchHit(query,f.title+' '+f.tags,(f.text||'')+' '+(f.steps||[]).join(' '))===searchHit(query,f.title+' '+f.tags+' '+(f.text||'')+' '+(f.steps||[]).join(' ')))",ctx),true,q);
}
console.log('PASS homepage exact 醫令 topics and specific-query regressions');
