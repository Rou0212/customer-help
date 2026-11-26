const fs=require('fs'),vm=require('vm'),a=require('node:assert/strict');
const c=vm.createContext({URL,location:{href:'https://example.test/'},window:{}});
for(const f of ['manuals.js','functional-index.js','faq.js','assistant.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);
for(const [q,id] of [['客人想換療程怎麼做','treatment-switch'],['終止按錯怎麼還原課程','treatment-stop'],['按了課程退款錢就退了嗎','treatment-status'],['療程退費怎麼登記','treatment-payment'],['怎麼用預付金抵扣','treatment-credit'],['治療單開錯怎麼作廢','treatment-void'],['預付金餘額','report-prepaid-points']])a.equal(c.window.LeyanCat.rankFaq(q)[0]?.f.id,id,q);
