// Run: node tests/regional-indicators.cjs
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const s=fs.readFileSync('assistant.js','utf8');
const start=s.indexOf(' const indicatorRegions=['),end=s.indexOf(" const cityKey=",start);
const context=vm.createContext({});
vm.runInContext(s.split('\n').find(l=>l.startsWith('const norm='))+s.slice(start,end)+';this.regions=indicatorRegions;this.isIndicator=q=>namedIndicator(q)||regionalIndicatorQuestion(q);',context);
for(const q of ['指標','我的指標超標有關係嗎','endo未完成比率','根管完成率','根管未完率','影像醫令上傳率','申報規範'])assert.equal(context.isIndicator(q),true,q);
for(const q of ['健保申報','如何月申報','EMR拋轉','91003C支付標準','醫令','影像上傳'])assert.equal(context.isIndicator(q),false,q);
for(const [city,id] of [['桃園市','nhi-north-exemption-notes'],['新竹市','nhi-north-exemption-notes'],['新竹縣','nhi-north-exemption-notes'],['苗栗縣','nhi-north-exemption-notes'],['臺南市','nhi-south-notes'],['高雄市','nhi-kaoping-notes'],['臺中市','nhi-central-notes'],['彰化縣','nhi-central-notes'],['嘉義市','nhi-south-notes'],['屏東縣','nhi-kaoping-notes']])assert.equal(context.regions.find(r=>r.cities.includes(city)).doc,id);
for(const city of ['臺北市','花蓮縣'])assert.equal(context.regions.find(r=>r.cities.includes(city)).doc,undefined);
console.log('PASS regional indicator phrases, ordinary submission exclusion, approved city mapping');
