// 樂衍小黑貓：依文字或語音提出候選問題，使用者確認後才顯示答案或手冊。需先載入 manuals.js。
// 用法：LeyanCat.mount(元素, {mode:'page'|'fab', onOpen:function(doc,url){...}})
(function(){
const BASE=new URL('./',location.href).href;
const norm=s=>String(s).toLowerCase().replace(/[\s，。？！、,.?!:：;；「」『』（）()]/g,'').replace(/臺/g,'台').replace(/申復/g,'申覆').replace(/日曆/g,'行事曆').replace(/健保局/g,'健保署');
// 常見說法 → 手冊（客戶口語、錯字與同義詞補在這裡）
const INTENTS={
'nhi-claim':['申報','月申報','總表','線上確認','補正','欠卡','合理量','指標','點值'],
'nhi-review':['抽審','抽樣','送審','審查資料','電子審查'],
'nhi-appeal':['申覆','補件','專業審查','小綠人','申覆上傳'],
'nhi-dispute':['爭議','爭審','爭議審議'],
'tooth-correction':['牙位','牙位更正','拔牙更正','牙位錯','更正清單'],
'nhi-dentist-handbook-2026':['牙科支付標準','支付標準表','牙醫支付標準','給付項目','牙結石清除','牙結石','氟化物治療','特定疾病病人牙科就醫安全','高風險疾病口腔照護','91003C','91004C','91090C','P3601C','P7302C'],
'nhi-doctor-access':['授權','受僱醫師','新醫師vpn','醫師權限','vpn權限','新增醫師'],
'nhi-clinic-hours':['看診時段','門診時段','掛號費','連假','春節','快易通','長假'],
'nhi-lab-upload':['檢驗','檢查結果','每日上傳','xml'],
'nhi-image-upload':['影像上傳','x光上傳','醫療影像','每日影像'],
'emr-sign':['簽章','電子病歷','emr','加簽','簽病歷','醫事人員卡密碼'],
'emr-cloud-sign':['雲端簽章','雲端emr','emr加簽連結','hca元件','跨平台網頁元件'],
'perio-chart':['牙周','囊袋','牙菌斑','probing','牙周病歷'],
'card-reader-errors':['讀卡機','讀不到卡','卡讀不到','讀不到','讀卡','讀取失敗','無法讀卡','錯誤碼','錯誤代碼','卡片錯誤','ic卡錯誤','認證失敗','com埠','安全模組'],
'hca-unlock':['鎖卡','卡鎖住','鎖住','解卡','解鎖','pin','puk','密碼錯','密碼鎖','密碼輸入錯誤','錯誤太多次','輸錯太多','卡被鎖'],
'ic-card-incident-form':['停電','當機','網路斷','網路不通','報備','異常報備','無法上傳就醫'],
'edge-ie-mode':['edge','ie模式','相容性','無法夾帶','夾帶','附件上傳','上傳失敗','瀏覽器','選擇檔案'],
'google-members':['共用','新進醫師','醫師離職','加入行事曆','刪除醫師','行事曆權限'],
'google-sync':['看不到約診','手機看不到','同步','手機行事曆','行事曆app','接受邀請','邀請信']};
const pool=documents.filter(d=>!d.region);
const codeOf=d=>STATION[d.parent||d.id]||'';
const bigrams=s=>{const r=new Set();for(let i=0;i<s.length-1;i++)r.add(s.slice(i,i+2));return r};
const FQ=(typeof FAQS!=='undefined')?FAQS:[],FG=(typeof FAQ_GROUPS!=='undefined')?FAQ_GROUPS:[];
const faqPool=FQ.map(f=>({f,toks:[...new Set(f.tags.split(/\s+/).map(norm).filter(t=>t.length>=2))],title:norm(f.title),bg:bigrams(norm(f.title+(f.text||'')+(f.steps||[]).join('')))}));
function rankFaq(q){const n=norm(q);if(!n)return [];return faqPool.map(p=>{let s=0;p.toks.forEach(t=>{if(n.includes(t))s+=/^\d{4}$/.test(t)?55:Math.min(t.length,6)*3});if(n.includes(p.title))s+=15;let o=0;bigrams(n).forEach(b=>{if(p.bg.has(b))o++});s+=o;return {f:p.f,score:s}}).filter(r=>r.score>=10).sort((a,b)=>b.score-a.score)}
// ---- 看圖：在瀏覽器內用 Tesseract.js 辨識截圖文字（圖片不會上傳）----
const KNOWN_CODES=new Set();FQ.forEach(f=>f.tags.split(/\s+/).forEach(t=>{if(/^\d{4}$/.test(t))KNOWN_CODES.add(t)}));pool.forEach(d=>(d.keywords.match(/\b\d{4}\b/g)||[]).forEach(c=>KNOWN_CODES.add(c)));
function analyzeScreen(raw){const t=norm(raw.replace(/[OoＯ](?=\d{3})/g,'0'));const codes=[...new Set((t.match(/\d{4}/g)||[]).filter(c=>KNOWN_CODES.has(c)))];
 const lc=(t.match(/e\d{3}|d11|aa(?![a-z])/g)||[]);
 const faqs=faqPool.map(p=>{let s=0;p.toks.forEach(k=>{if(/^\d{4}$/.test(k)){if(codes.includes(k))s+=60}else if(lc.includes(k))s+=40;else if(k.length>=3&&t.includes(k))s+=k.length*2});return {f:p.f,score:s}}).filter(r=>r.score>=8).sort((a,b)=>b.score-a.score);
 let doc=null;if(codes.length&&!faqs.some(r=>r.score>=60)){doc=pool.find(d=>d.id==='card-reader-errors'&&codes.some(c=>d.keywords.includes(c)))||null}
 const lines=raw.split(/\n+/).map(x=>x.trim().replace(/([\u3000-\u303f\u4e00-\u9fff\uff00-\uffef])\s+(?=[\u3000-\u303f\u4e00-\u9fff\uff00-\uffef])/g,'$1')).filter(x=>x&&(codes.some(c=>x.includes(c))||/錯誤|找不到|失敗|無法|不正確|請先|無卡號/.test(x))).slice(0,3);
 return {codes,faqs:faqs.slice(0,2),doc,lines}}
let ocrLib=null;
function loadOcr(){if(ocrLib)return ocrLib;ocrLib=new Promise((res,rej)=>{if(window.Tesseract)return res(window.Tesseract);const sc=document.createElement('script');sc.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';sc.onload=()=>res(window.Tesseract);sc.onerror=()=>{ocrLib=null;rej(new Error('load'))};document.head.appendChild(sc)});return ocrLib}
let ocrWorker=null;
// OCR 常把 5 讀成 S、0 讀成 O：在 4 位數錯誤碼前後先修正
const fixDigits=t=>String(t).replace(/[Ss$](?=[0-9OoＯ]{3})/g,'5').replace(/[OoＯ](?=\d{3})/g,'0').replace(/(\d{3})[OoＯ]/g,(m,a)=>a+'0');
// 讀成不存在的代碼時，只修正一個常見混淆的數字（例如 9022→5022）；修正後剛好只有一個已知代碼才採用
const CONFUSE={'5':'96','9':'5','6':'58','8':'036','0':'8','3':'8','1':'7','7':'1'};
function nearCode(c){const hits=new Set();for(let i=0;i<4;i++)for(const r of (CONFUSE[c[i]]||'')){const k=c.slice(0,i)+r+c.slice(i+1);if(KNOWN_CODES.has(k))hits.add(k)}return hits.size===1?[...hits][0]:''}
function popupCode(raw,fuzzy){
 const lines=fixDigits(raw).split(/\r?\n/);
 for(const line of lines){
  const m=line.match(/(?:^|[^\d])([0-9]{4})\s*[-－—–)）:：]/);
  if(m&&KNOWN_CODES.has(m[1]))return m[1]
 }
 const all=(fixDigits(raw).match(/(^|\D)(\d{4})(?!\d)/g)||[]).map(x=>x.slice(-4));
 const codes=[...new Set(all.filter(c=>KNOWN_CODES.has(c)))];
 if(codes.length===1)return codes[0];
 if(fuzzy&&!codes.length){const n=[...new Set(all.filter(c=>!/^(19|20)\d\d$/.test(c)).map(nearCode).filter(Boolean))];if(n.length===1)return n[0]}
 return ''
}
// 找瀏覽器警告視窗的藍色「確定」按鈕，回傳按鈕上方的對話框範圍（找不到回傳 null）
function findDialog(c){
 const sw=600,s=sw/c.width,sh=Math.round(c.height*s),t=document.createElement('canvas');t.width=sw;t.height=sh;
 const tg=t.getContext('2d');tg.drawImage(c,0,0,sw,sh);const d=tg.getImageData(0,0,sw,sh).data,m=new Uint8Array(sw*sh);
 for(let i=0;i<sw*sh;i++){const r=d[i*4],g=d[i*4+1],b=d[i*4+2];if(b>150&&b-r>90&&b-g>40&&r<110)m[i]=1}
 let best=null;const st=[];
 for(let i=0;i<sw*sh;i++){if(m[i]!==1)continue;m[i]=2;st.push(i);let n=0,x0=sw,x1=0,y0=sh,y1=0;
  while(st.length){const k=st.pop(),x=k%sw,y=(k-x)/sw;n++;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;
   for(const q of [k-1,k+1,k-sw,k+sw]){if(q>=0&&q<sw*sh&&m[q]===1&&Math.abs(q%sw-x)<=1){m[q]=2;st.push(q)}}}
  const bw=x1-x0+1,bh=y1-y0+1,asp=bw/bh,fill=n/(bw*bh);
  if(asp>1.6&&asp<3.8&&fill>.5&&bw>=sw*.015&&bw<=sw*.14&&y0>bh*2){const sc=n-Math.abs((x0+x1)/2-sw/2)*.3;if(!best||sc>best.sc)best={sc,x0,y0,bw,bh}}}
 if(!best)return null;
 const R=v=>v/s,bx=R(best.x0),by=R(best.y0),bw=R(best.bw),bh=R(best.bh);
 const x=Math.max(0,bx+bw-7.6*bw),y=Math.max(0,by-3.4*bh);return {x,y,w:Math.min(c.width,bx+bw*1.3)-x,h:by-y}}
// 裁出範圍、放大、輕微模糊（去掉翻拍螢幕的紋路）、轉灰階拉對比
function prepCrop(c,r,bl){if(bl==null)bl=1.2;
 const k=Math.min(4,Math.max(1.5,1800/r.w)),o=document.createElement('canvas');o.width=Math.round(r.w*k);o.height=Math.round(r.h*k);
 const g=o.getContext('2d');g.imageSmoothingQuality='high';if('filter' in g)g.filter='blur('+(bl*k).toFixed(1)+'px)';
 g.drawImage(c,r.x,r.y,r.w,r.h,0,0,o.width,o.height);if('filter' in g)g.filter='none';
 const im=g.getImageData(0,0,o.width,o.height),p=im.data,h=new Uint32Array(256);
 for(let i=0;i<p.length;i+=4){const v=(p[i]*299+p[i+1]*587+p[i+2]*114)/1000|0;p[i]=v;h[v]++}
 let lo=0,hi=255,acc=0,cut=p.length/4*.02;while(acc+h[lo]<cut)acc+=h[lo++];acc=0;while(acc+h[hi]<cut)acc+=h[hi--];const sp=Math.max(1,hi-lo);
 for(let i=0;i<p.length;i+=4){const v=Math.max(0,Math.min(255,(p[i]-lo)*255/sp));p[i]=p[i+1]=p[i+2]=v}
 g.putImageData(im,0,0);return o}
async function ocr(file){const T=await loadOcr();if(!ocrWorker)ocrWorker=await T.createWorker(['chi_tra','eng']);
 const src=URL.createObjectURL(file);let img;
 try{img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src})}finally{URL.revokeObjectURL(src)}
 const scale=Math.min(3,Math.max(1,2000/img.width));const c=document.createElement('canvas');c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);const g=c.getContext('2d');g.imageSmoothingQuality='high';g.drawImage(img,0,0,c.width,c.height);
 // 1) 有藍色「確定」按鈕的警告視窗：只讀視窗裡的字
 const dlg=findDialog(c);
 if(dlg){const votes={};for(const bl of [1.2,0,0.6]){const t=(await ocrWorker.recognize(prepCrop(c,dlg,bl))).data.text||'';const k=popupCode(t,true);if(k){votes[k]=(votes[k]||0)+1;if(votes[k]>=2)return {t:k,how:'dialog'}}}
  const ks=Object.keys(votes);if(ks.length===1)return {t:ks[0],how:'dialog'};return {t:'',how:'unclear'}}
 // 2) 畫面中央（彈窗通常在中間）
 const ctr={x:c.width*.15,y:c.height*.28,w:c.width*.7,h:c.height*.42};
 const focused=(await ocrWorker.recognize(prepCrop(c,ctr))).data.text||'';
 const code=popupCode(focused);if(code)return {t:code,how:'center'};
 // 3) 整張（不確定，會請使用者確認）
 return {t:(await ocrWorker.recognize(c)).data.text||'',how:'full'}}
const prepared=pool.map(d=>({d,toks:[...new Set(d.keywords.split(/\s+/).map(norm).filter(t=>t.length>=2))],title:norm(d.title),bg:bigrams(norm(d.title+d.description+d.steps.join('')))}));
function rank(q){const n=norm(q);if(!n)return [];
 const policy=typeof matchNhiProcedureCode==='function'?matchNhiProcedureCode(q):null;if(policy){const d=pool.find(x=>x.id==='nhi-dentist-handbook-2026');return policy.status==='found'&&d?[{d,score:100}]:[]}
 const cm=n.match(/(^|[^a-z])([nvuedg])0?(\d{1,2})(?!\d)/);if(cm){const code=cm[2].toUpperCase()+String(cm[3]).padStart(2,'0');const d=pool.find(x=>!x.parent&&STATION[x.id]===code);if(d)return [{d,score:100}]}
 return prepared.map(p=>{let s=0;
  (INTENTS[p.d.id]||[]).forEach(ph=>{const k=norm(ph);if(n.includes(k))s+=(p.d.parent?20:10)+k.length});
  p.toks.forEach(t=>{if(n.includes(t))s+=Math.min(t.length,6)*1.5});
  if(n.includes(p.title))s+=15;
  if(/\d{4}/.test(n)&&p.d.id==='card-reader-errors'){const nums=n.match(/\d{4}/g);if(nums.some(x=>p.d.keywords.includes(x)))s+=40}
  if(n.length>=2){let o=0;bigrams(n).forEach(b=>{if(p.bg.has(b))o++});s+=o*1.2}
  if(p.d.parent)s-=4;
  return {d:p.d,score:s}}).filter(r=>r.score>=8).sort((a,b)=>b.score-a.score)}
const urlOf=d=>BASE+'?doc='+encodeURIComponent(d.parent?d.id:codeOf(d))+'&read=1';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LINE_URL='https://line.me/R/ti/p/%40leyan';
const humanRequest=q=>/人工客服|轉人工|找真人|找客服|聯絡客服|需要人工|官方line|line@|客服電話/i.test(norm(q));
const supportHtml=()=>'<div class="lc-support"><b>這題請由人工客服協助</b><p>小黑貓只能依網站手冊與常見問題提供操作指引，無法查看個案資料。請聯絡官方 LINE@ <strong>@leyan</strong>。</p><a class="lc-line-link" href="'+LINE_URL+'" target="_blank" rel="noopener noreferrer">開啟官方 LINE@ @leyan</a><a class="lc-line-qr" href="'+LINE_URL+'" target="_blank" rel="noopener noreferrer" aria-label="掃描 QR code 加入官方 LINE@ @leyan"><img src="'+BASE+'images/line-official-qr.png" alt="官方 LINE@ @leyan 加入好友 QR code" loading="lazy"></a><small>可用另一台手機掃描；不方便使用 LINE 時，可撥 04-2251-8815 分機 9。</small></div>';
const CAT='<svg class="lc-cat" viewBox="0 0 120 120" aria-hidden="true"><g class="lc-tail"><path d="M84 96c18-2 26-14 22-30-2-8-9-10-12-5" fill="none" stroke="#15191E" stroke-width="9" stroke-linecap="round"/></g><ellipse cx="58" cy="88" rx="30" ry="24" fill="#15191E"/><g class="lc-head-g"><path d="M30 44 34 18 50 34zM86 44 82 18 66 34z" fill="#15191E"/><path d="M35 38 37 26 45 34zM81 38 79 26 71 34z" fill="#E8A0A8"/><circle cx="58" cy="52" r="28" fill="#15191E"/><g class="lc-look"><g class="lc-eyes"><ellipse cx="47" cy="52" rx="6.5" ry="7.5" fill="#F6C945"/><ellipse cx="69" cy="52" rx="6.5" ry="7.5" fill="#F6C945"/><ellipse cx="47" cy="53" rx="2.2" ry="5" fill="#15191E"/><ellipse cx="69" cy="53" rx="2.2" ry="5" fill="#15191E"/></g></g><path d="M55 63h6l-3 3z" fill="#E8A0A8"/><ellipse class="lc-mouth" cx="58" cy="70" rx="4" ry="3.2" fill="#7A2E3A"/><path d="M40 64 26 62M40 68 27 70M76 64l14-2M76 68l13 2" stroke="#8A9199" stroke-width="1.6" stroke-linecap="round"/></g><g class="lc-paw"><ellipse cx="70" cy="96" rx="7" ry="10" fill="#15191E" stroke="#5B6470" stroke-width="1.4"/><path d="M67 90v4M71 89v5" stroke="#5B6470" stroke-width="1.1" stroke-linecap="round"/></g><ellipse class="lc-tongue" cx="59" cy="70" rx="3" ry="4" fill="#E8708A"/><g class="lc-treat"><path d="M49 8c4-5 12-5 16 0-4 5-12 5-16 0zM65 8l7-4v8z" fill="#E9A15B"/><circle cx="53" cy="7" r="1.1" fill="#15191E"/></g></svg>';
const QUICK=['取到 02 卡號','讀卡機沒反應','PIN 碼鎖住','停電要怎麼關機','上傳無法夾帶檔案','手機看不到約診'];
function mount(root,opt){opt=opt||{};const mode=opt.mode||'page';
 const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
 root.classList.add('lc-root','lc-mode-'+mode);
 root.innerHTML=(mode==='fab'?'<button type="button" class="lc-fab" aria-expanded="false" aria-controls="lc-panel" aria-label="開啟小黑貓助手">'+CAT+'<span class="lc-fab-tip" aria-hidden="true">需要幫忙嗎？</span></button>':'')+
 '<section class="lc-panel" id="lc-panel" aria-label="小黑貓助手"'+(mode==='fab'?' hidden':'')+'>'+
 '<div class="lc-head">'+(mode==='page'?CAT:'')+'<strong class="lc-title">小黑貓</strong>'+(mode==='fab'?'<button type="button" class="lc-close" aria-label="關閉助手">✕</button>':'')+'</div>'+
 '<div class="lc-log" role="log" aria-live="polite"></div>'+
 '<div class="lc-quick">'+QUICK.map(q=>'<button type="button" data-q="'+esc(q)+'">'+esc(q)+'</button>').join('')+'</div>'+
 '<form class="lc-form"><label class="lc-sr" for="lc-input-'+mode+'">輸入你的問題</label><input id="lc-input-'+mode+'" class="lc-input" autocomplete="off" enterkeyhint="send" placeholder="輸入問題或文件代碼…">'+
 '<button type="button" class="lc-pic" aria-label="在本機辨識已遮蔽個資的錯誤畫面"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="m21 17-5-5-8 7"/></svg></button><input type="file" accept="image/*" class="lc-file" hidden>'+(SR?'<button type="button" class="lc-mic" aria-label="用語音說"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg></button>':'')+
 '<button type="submit" class="lc-send">送出</button></form></section>';
 const $=s=>root.querySelector(s),log=$('.lc-log'),input=$('.lc-input'),panel=$('.lc-panel');let lastQuestion='';const policyHit=()=>typeof matchNhiProcedureCode==='function'?matchNhiProcedureCode(lastQuestion):null;const policyPage=d=>{const hit=d.id==='nhi-dentist-handbook-2026'&&policyHit();return hit&&hit.status==='found'?hit.pages[0]:1};
 function say(html,who){const el=document.createElement('div');el.className='lc-msg lc-'+(who||'bot');el.innerHTML=html;log.appendChild(el);log.scrollTop=log.scrollHeight;return el}
 function open(d){const url=urlOf(d)+(policyPage(d)>1?'&excerptPage='+policyPage(d):'');if(opt.onOpen){opt.onOpen(d,url,policyPage(d));return true}const w=window.open(url,'leyan-manual');if(w){try{w.focus()}catch{}return true}return false}
 function card(d){return '<a class="lc-doc" href="'+urlOf(d)+(policyPage(d)>1?'&excerptPage='+policyPage(d):'')+'" target="leyan-manual" data-id="'+d.id+'"><span><b>'+esc(d.title)+'</b><small>'+esc(d.description)+'</small></span></a>'+(d.id==='nhi-dentist-handbook-2026'&&policyPage(d)>1?'<small>對應摘錄第 '+policyPage(d)+' 頁；請核對原文與現行公告。</small>':'')+(OFFICIAL_URLS[d.id]?'<a class="lc-official" href="'+esc(OFFICIAL_URLS[d.id])+'" target="_blank" rel="noopener noreferrer">前往官方解鎖卡網站 ↗</a>':'')}
 function policyImage(hit){const src=BASE+'images/nhi-payment/'+hit.code+'.webp';return '<div class="lc-payment"><b>'+esc(hit.code)+' 支付標準原文截圖</b><a href="'+src+'" target="_blank" rel="noopener" aria-label="放大檢視 '+esc(hit.code)+' 原文截圖"><img src="'+src+'" alt="'+esc(hit.code)+' 的支付標準原文表格與註記" decoding="async"></a><small>摘自 2026 年牙科支付標準表第 '+hit.pages[0]+' 頁。左右滑動看完整表格，點圖可放大；實際申報請核對健保署現行公告。</small></div>'}
 function faqHtml(f){const g=FG.find(x=>x.id===f.group)||{color:'#15191E'},rel=f.doc&&pool.find(x=>x.id===f.doc);return '<div class="lc-faq" style="--c:'+g.color+'"><b>'+esc(f.title)+'</b>'+(f.text?'<p>'+esc(f.text)+'</p>':'')+(f.steps?'<ol>'+f.steps.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol>':'')+(f.img?'<a class="lc-img" href="'+BASE+'images/faq/'+f.img+'.png" target="_blank" rel="noopener"><img src="'+BASE+'images/faq/'+f.img+'.png" alt="'+esc(f.title)+' 圖卡"></a>':'')+'</div>'+(f.sourceUrl?'<p class="lc-alt"><a href="'+esc(f.sourceUrl)+'" target="_blank" rel="noopener noreferrer">'+esc(f.sourceLabel||'查看官方原文')+' ↗</a></p>':'')+(rel?'<p class="lc-alt">相關手冊：</p>'+card(rel):'')}
 function faqChoice(f){return '<button type="button" class="lc-choice" data-faq="'+esc(f.id)+'">常見問題：'+esc(f.title)+'</button>'}
 function docChoice(d){const hit=d.id==='nhi-dentist-handbook-2026'&&policyHit();const label=hit&&hit.status==='found'?`牙科支付標準：${hit.code}（摘錄第 ${hit.pages[0]} 頁）`:`操作手冊：${d.title}`;return '<button type="button" class="lc-choice" data-doc="'+esc(d.id)+'">'+esc(label)+'</button>'}
 function choices(faqs,docs){const fs=faqs.slice(0,2).map(x=>faqChoice(x.f)),ds=docs.slice(0,2).map(x=>docChoice(x.d));return fs.concat(ds).join('')}
 const indicatorRegions=[
  {name:'臺北',cities:['臺北市','新北市','基隆市','宜蘭縣','金門縣','連江縣']},
  {name:'北區',cities:['桃園市','新竹市','新竹縣','苗栗縣']},
  {name:'中區',cities:['臺中市','彰化縣','南投縣'],doc:'nhi-central-notes'},
  {name:'南區',cities:['雲林縣','嘉義市','嘉義縣','臺南市'],doc:'nhi-south-notes'},
  {name:'高屏',cities:['高雄市','屏東縣','澎湖縣'],doc:'nhi-kaoping-notes'},
  {name:'東區',cities:['花蓮縣','臺東縣']}
 ];
 // 依中區、南區及高屏區整理版的指標名稱，涵蓋常見縮寫與口語。
 const endoIncomplete=/未(?:完成|完)率/;
 const namedIndicator=q=>{
  const n=norm(q);
  return endoIncomplete.test(n) || /再補率|重補率|再洗牙率|再洗牙比率|根管再治療率|醫療耗用|耗用點數|耗用值|耗格數|費用成長率|點數成長率|平均就醫次數|月最高總點數|月點數上限|全國歸戶|管控額度|輔導積分|紅單抽審|初審核減率|口檢(?:比率|占率|佔率)|雲端藥歷查詢率|影像(?:醫令)?上傳率|rbrvs|(?:od|填補|根管|困難拔牙).{0,10}(?:占率|佔率|比率|點數比|平均面數|平均填補顆數|平均顆數)|平均(?:od|填補)顆數|(?:pacs|核定電子化|總表線上確認|即時查詢|感染管制|跨區支援|牙周病統合|91022c|到宅服務|新開業|星期日看診).{0,16}(?:加分|扣分|減分|積分|計分|權值|門檻|上限|抽審)|(?:指標|積分).{0,8}s\d{1,2}|(?:^|[^a-z0-9])s(?:[1-9]|[12]\d)(?![a-z0-9])/.test(n);
 };
 const incompletePages={'nhi-central-notes':9,'nhi-south-notes':6,'nhi-kaoping-notes':8};
 const regionalIndicatorQuestion=q=>{
  const n=norm(q);
  if(/處置|支付標準|給付|醫令/.test(n) && !/指標|合理量|合理門診點數/.test(n))return false;
  if(/(?:申報|抽審|送審|輔導積分)(?:的|相關)?(?:規範|規則|規定|須知|注意事項|原則|標準)|分區(?:申報|抽審)|輔導積分/.test(n))return true;
  return /指標|合理量|合理門診點數/.test(n) &&
    /超標|超過|逾限|爆量|影響|會怎樣|有關係|會不會|扣點|扣款|折付|核減|門檻|上限|標準|規範|多少/.test(n);
 };
 const cityKey='leyan-clinic-city';
 const cityOptions=indicatorRegions.flatMap(region=>region.cities);
 let clinicCity='';
 try {const saved=localStorage.getItem(cityKey);if(cityOptions.includes(saved))clinicCity=saved}catch{}
 const cityBar=document.createElement('div');
 cityBar.className='lc-city-bar';
 $('.lc-title').after(cityBar);
 const citySelect=document.createElement('select');
 citySelect.setAttribute('aria-label','診所所在縣市');
 citySelect.add(new Option('請選診所縣市',''));
 for(const city of cityOptions)citySelect.add(new Option(city,city));
 cityBar.append(citySelect);
 citySelect.title='選擇會記在此瀏覽器。統計只計縣市與問題分類。';
 function updateCity(){
  citySelect.value=clinicCity;
  for(const field of root.querySelectorAll('.lc-form input,.lc-form button,.lc-quick button'))field.disabled=!clinicCity;
 }
 citySelect.onchange=()=>{
  clinicCity=citySelect.value;
  try {if(clinicCity)localStorage.setItem(cityKey,clinicCity);else localStorage.removeItem(cityKey)}catch{}
  updateCity();
  if(clinicCity)input.focus();
 };
 updateCity();
 function countQuestion(city,category){
  fetch('https://leyan-help-stats.leyan-help.workers.dev/question',{
   method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},
   body:JSON.stringify({city,category}),keepalive:true,credentials:'omit'
  }).catch(()=>{});
 }
 function questionCategory(faq,doc){
  const problem=typeof PROBLEM_TYPES!=='undefined'&&PROBLEM_TYPES.find(type=>
   faq?type.groups.includes(faq.group):doc&&type.cats.includes(doc.category));
  return problem?problem.name.replace(/\s/g,''):'未分類';
 }
 function chooseIndicatorCity(city,question){
  const region=indicatorRegions.find(item=>item.cities.includes(city));
  if(!region){say(supportHtml());return}
  const doc=documents.find(item=>item.id===region.doc);
  const label=region.name+(region.name.endsWith('區')?'':'區');
  if(doc){
   const page=endoIncomplete.test(norm(question))?incompletePages[doc.id]:null;
   showIndicatorDocument(doc.id,label,page);
  }else{
   say(esc(city)+'屬於'+label+'。網站目前沒有這區的指標文件，可從健保署業務組查詢。<a class="lc-official" href="https://www.nhi.gov.tw/ch/np-2334-1.html" target="_blank" rel="noopener noreferrer">健保署各區服務據點 ↗</a><small>如需協助，可輸入「轉人工」。</small>');
  }
 }
 function showIndicatorDocument(id,label,page){
  const doc=documents.find(item=>item.id===id&&item.region);
  if(!doc)return;
  const pageLabel=page?'（根管未完成率：第 '+page+' 頁）':'';
  const url=doc.url+(page?'#page='+page:'');
  say('這邊提供'+label+'的申報規範給您參考。請核對文件適用期間。<a class="lc-official" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(doc.title)+pageLabel+' PDF ↗</a><a class="lc-official" href="'+esc(doc.source_page)+'" target="_blank" rel="noopener noreferrer">健保署公告 ↗</a><small>看完如果還有問題，可輸入「轉人工」。</small>');
 }
 function ask(q){q=q.trim();if(!q)return;if(!clinicCity){citySelect.focus();return}lastQuestion=q;say(esc(q),'user');input.value='';if(/^(?:(?:請|我要|我想|幫我|可以|怎麼|如何))*(?:人工客服|轉人工(?:客服)?|找真人|找客服|聯絡客服|需要人工(?:客服)?|官方line@?|line@|客服電話)(?:嗎|在哪裡?|是多少)?$/i.test(norm(q))){countQuestion(clinicCity,'人工客服');say(supportHtml());return}const policy=policyHit();if(namedIndicator(q)||(!policy&&regionalIndicatorQuestion(q))){countQuestion(clinicCity,'分區管控指標');chooseIndicatorCity(clinicCity,q);return}if(policy&&policy.status!=='found'){countQuestion(clinicCity,'牙科支付標準');say(policy.status==='ambiguous'?'這組牙科處置代碼有多個尾碼，請輸入完整代碼再查詢。':'在目前的支付標準表找不到「'+esc(policy.input)+'」。請核對完整代碼（含尾碼）後再查；個案申報請由人工客服協助確認。');return}const r=rank(q),fr=policy?[]:rankFaq(q);
  if(!fr.length&&!r.length&&humanRequest(q)){countQuestion(clinicCity,'人工客服');say(supportHtml());return}
  countQuestion(clinicCity,policy?'牙科支付標準':questionCategory(fr[0]?.f,r[0]?.d));
  if(!fr.length&&!r.length){say('我還不能確定是哪個問題。可以換個說法或輸入錯誤代碼；個案請找人工客服。'+supportHtml());return}
  say('我找到幾個可能的主題，請先確認妳要問的是哪一個；點選後才會顯示內容。'+choices(fr,r)+'<small class="lc-choice-hint">都不是？請換個說法，或直接輸入畫面上的錯誤代碼。</small>')}
 // ---- 小黑貓互動：閒置舔毛；對貓按右鍵（手機長按）→ 餵零食／玩逗貓棒，都在桌面上，不寫進對話 ----
 const motionOK=()=>!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
 let runnerEl=null;const catEl=()=>runnerEl?runnerEl.querySelector('.lc-cat'):root.querySelector('.lc-cat');
 let idleT=0,actT=0,acting='',lastLine=-1,lastAct=Date.now();
 const pick=a=>{let i;do{i=Math.floor(Math.random()*a.length)}while(a.length>1&&i===lastLine);lastLine=i;return a[i]};
 function endAct(){clearTimeout(actT);root.classList.remove('lc-licking','lc-feeding','lc-sleeping');acting=''}
 // 睡覺：閒置 45 秒以上就打瞌睡，冒出 Zzz；碰一下就醒
 function sleep(){const c=root.querySelector('.lc-cat');if(c&&!c.querySelector('.lc-zzz')){const NS='http://www.w3.org/2000/svg',g=document.createElementNS(NS,'g');g.setAttribute('class','lc-zzz');[[84,34,12],[94,24,15],[104,13,18]].forEach(([x,y,f],i)=>{const t=document.createElementNS(NS,'text');t.setAttribute('x',x);t.setAttribute('y',y);t.setAttribute('font-size',f);t.style.animationDelay=(i*.9)+'s';t.textContent='z';g.appendChild(t)});c.appendChild(g)}
  acting='sleep';root.classList.add('lc-sleeping')}
 function armIdle(){clearTimeout(idleT);idleT=setTimeout(()=>{if(!root.isConnected)return;if(acting||document.hidden){armIdle();return}
  if(Date.now()-lastAct>45000){sleep();return}
  if(!motionOK()){armIdle();return}
  acting='lick';root.classList.add('lc-licking');actT=setTimeout(()=>{endAct();armIdle()},2900)},10000+Math.random()*6000)}
 function wake(){lastAct=Date.now();if(acting==='sleep'){endAct();if(Math.random()<.5)petSay(Math.random()<.5?'喵…（伸懶腰）':'嗯？我醒了！',1800)}else if(acting==='lick')endAct();armIdle()}
 ['pointerdown','keydown','input'].forEach(ev=>root.addEventListener(ev,wake,true));
 // 貓旁邊的短話泡泡
 let sayEl=null,sayT=0;
 function placeSay(){if(!sayEl||!sayEl.classList.contains('on'))return;const c=catEl();if(!c)return;const r=c.getBoundingClientRect(),w=sayEl.offsetWidth,h=sayEl.offsetHeight;let l,t;
  if(runnerEl){l=r.left+r.width/2-w/2;t=r.top-h-6}else if(mode==='fab'){l=r.left-w-8;t=r.top+r.height/2-h/2;if(l<8){l=r.left+r.width/2-w/2;t=r.top-h-8}}else{l=r.left;t=r.bottom+6}
  sayEl.style.left=Math.max(8,Math.min(l,innerWidth-w-8))+'px';sayEl.style.top=Math.max(8,Math.min(t,innerHeight-h-8))+'px'}
 function petSay(text,ms){if(!sayEl){sayEl=document.createElement('div');sayEl.className='lc-pet-say';sayEl.setAttribute('role','status');document.body.appendChild(sayEl)}
  sayEl.textContent=text;sayEl.classList.add('on');placeSay();clearTimeout(sayT);sayT=setTimeout(()=>sayEl.classList.remove('on'),ms||2600)}
 // 餵零食：掉小魚、吃一口、搖尾巴、說一句話
 const TREAT_SAYS=['喵～好吃！謝謝你','咕嚕咕嚕…這個零食超讚','吃飽了就有力氣幫你找手冊','喵嗚～再來一口也可以喔','好滿足～我繼續值班囉'];
 function feed(){if(acting==='feed'||acting==='wand')return;endAct();acting='feed';const m=motionOK();if(m)root.classList.add('lc-feeding');
  setTimeout(()=>{if(acting==='feed')petSay(pick(TREAT_SAYS))},m?1300:0);
  actT=setTimeout(()=>{endAct();armIdle()},m?2800:600)}
 // 逗貓棒：全畫面遊戲。另一隻小黑貓在整個畫面追著逗貓棒（手機追手指）跑，湊近就撲
 const WAND_SAYS=['喵！抓到了～','嘿咻！','再甩一次～','這個我要咬！'];
 function startWand(){
  if(!motionOK()){petSay('你的裝置設定了「減少動態效果」，逗貓棒先休息喵',3200);return}
  if(acting==='wand')return;endAct();acting='wand';if(mode==='fab'&&root.close)root.close();
  const ov=document.createElement('div');ov.className='lc-wand-ov';
  ov.innerHTML='<svg aria-hidden="true"><line class="lc-w-rod" stroke="#6B4A2B" stroke-width="5" stroke-linecap="round"/><line class="lc-w-str" stroke="#8A9199" stroke-width="1.6"/><g class="lc-w-pom"><path d="M-4 8-12 20M0 9V24M4 8 12 20" stroke="#F6C945" stroke-width="3" stroke-linecap="round" fill="none"/><circle r="10" fill="#E9524A"/></g></svg><button type="button" class="lc-wand-end">收起逗貓棒 ✕</button>';
  document.body.appendChild(ov);root.classList.add('lc-playing');
  const rod=ov.querySelector('.lc-w-rod'),str=ov.querySelector('.lc-w-str'),pomG=ov.querySelector('.lc-w-pom'),endBtn=ov.querySelector('.lc-wand-end');
  const home=root.querySelector('.lc-cat').getBoundingClientRect(),SZ=76;
  const runner=document.createElement('div');runner.className='lc-runner';runner.innerHTML='<div class="lc-runner-in"></div>';runner.firstChild.appendChild(root.querySelector('.lc-cat').cloneNode(true));ov.appendChild(runner);runnerEl=runner;
  const st={x:innerWidth/2,y:innerHeight*.45},pom={x:st.x,y:st.y+30},cat={x:home.left+home.width/2,y:home.top+home.height/2};let raf=0,face=1,lastPounce=0,lastMove=Date.now(),pouncing=0;
  function pounce(){const n=Date.now();if(n-lastPounce<900)return;lastPounce=n;pouncing=n;runner.classList.remove('pounce');void runner.offsetWidth;runner.classList.add('pounce');setTimeout(()=>runner.classList.remove('pounce'),520);if(Math.random()<.45)petSay(pick(WAND_SAYS),1500)}
  function frame(){
   pom.x+=(st.x-pom.x)*.16;pom.y+=(st.y+30-pom.y)*.16;
   rod.setAttribute('x1',st.x);rod.setAttribute('y1',st.y);rod.setAttribute('x2',st.x+46);rod.setAttribute('y2',st.y-58);
   str.setAttribute('x1',st.x);str.setAttribute('y1',st.y);str.setAttribute('x2',pom.x);str.setAttribute('y2',pom.y-9);
   pomG.setAttribute('transform','translate('+pom.x.toFixed(1)+','+pom.y.toFixed(1)+')');
   // 貓追到小球下方一點的位置
   const tx=Math.max(SZ/2,Math.min(innerWidth-SZ/2,pom.x)),ty=Math.max(SZ/2,Math.min(innerHeight-SZ/2,pom.y+SZ*.55));
   const vx=tx-cat.x,vy=ty-cat.y,d=Math.hypot(vx,vy),sp=Math.min(d,Math.max(3,d*.09),11);
   if(d>2){cat.x+=vx/d*sp;cat.y+=vy/d*sp}
   if(Math.abs(vx)>6)face=vx>0?1:-1;
   runner.classList.toggle('run',d>14);
   runner.style.transform='translate('+(cat.x-SZ/2).toFixed(1)+'px,'+(cat.y-SZ/2).toFixed(1)+'px)';runner.firstChild.style.transform='scaleX('+face+')';
   const c=runner.querySelector('.lc-cat');c.style.setProperty('--ex',Math.max(-3,Math.min(3,(pom.x-cat.x)/60*face)).toFixed(2)+'px');c.style.setProperty('--ey',Math.max(-2,Math.min(2,(pom.y-cat.y)/80)).toFixed(2)+'px');
   const now=Date.now();if(now-lastMove<600&&Math.hypot(pom.x-cat.x,pom.y-cat.y)<SZ*.9)pounce();
   if(now-lastMove>90000){end();return}
   placeSay();raf=requestAnimationFrame(frame)}
  function onKey(e){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();end()}}
  function end(){cancelAnimationFrame(raf);document.removeEventListener('keydown',onKey,true);ov.remove();runnerEl=null;
   root.classList.remove('lc-run','lc-pounce','lc-playing');root.style.transform='';acting='';
   setTimeout(()=>petSay('好玩～謝謝你陪我玩',2200),500);armIdle()}
  ov.addEventListener('pointermove',e=>{st.x=e.clientX;st.y=e.clientY;lastMove=Date.now()});
  ov.addEventListener('pointerdown',e=>{if(e.target===endBtn)return;st.x=e.clientX;st.y=e.clientY;lastMove=Date.now();pounce()});
  endBtn.onclick=end;document.addEventListener('keydown',onKey,true);endBtn.focus({preventScroll:true});raf=requestAnimationFrame(frame)}
 // 右鍵（手機長按）選單
 let menu=null,lp=0,lpAt=0;
 function closeMenu(){if(!menu)return;menu.remove();menu=null;document.removeEventListener('pointerdown',onDocDown,true);document.removeEventListener('keydown',onMenuKey,true);removeEventListener('blur',closeMenu);removeEventListener('scroll',closeMenu,true);removeEventListener('resize',closeMenu)}
 function onDocDown(e){if(menu&&!menu.contains(e.target))closeMenu()}
 function onMenuKey(e){if(!menu)return;const it=[...menu.querySelectorAll('button')],i=it.indexOf(document.activeElement);
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeMenu()}
  else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();it[(i+(e.key==='ArrowDown'?1:-1)+it.length)%it.length].focus()}
  else if(e.key==='Tab')closeMenu()}
 function openMenu(x,y,touch){closeMenu();if(acting==='wand')return;
  menu=document.createElement('div');menu.className='lc-menu';menu.setAttribute('role','menu');menu.setAttribute('aria-label','小黑貓');
  const items=[['feed','🐟 餵零食'],['wand','🪶 玩逗貓棒']];if(mode==='fab')items.push(['chat','💬 開啟對話']);
  menu.innerHTML=items.map(i=>'<button type="button" role="menuitem" data-act="'+i[0]+'">'+i[1]+'</button>').join('');
  document.body.appendChild(menu);const w=menu.offsetWidth,h=menu.offsetHeight;
  menu.style.left=Math.max(8,Math.min(x,innerWidth-w-8))+'px';menu.style.top=Math.max(8,Math.min(touch?y-h-24:y,innerHeight-h-8))+'px';
  menu.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;closeMenu();if(b.dataset.act==='feed')feed();else if(b.dataset.act==='wand')startWand();else{const f=root.querySelector('.lc-fab');if(f)f.click()}});
  document.addEventListener('pointerdown',onDocDown,true);document.addEventListener('keydown',onMenuKey,true);addEventListener('blur',closeMenu);addEventListener('scroll',closeMenu,true);addEventListener('resize',closeMenu);
  menu.querySelector('button').focus()}
 const petHit=t=>t.closest&&t.closest('.lc-cat,.lc-fab');
 root.addEventListener('contextmenu',e=>{if(!petHit(e.target))return;e.preventDefault();clearTimeout(lp);
  let x=e.clientX,y=e.clientY;if(!x&&!y){const r=catEl().getBoundingClientRect();x=r.left+r.width/2;y=r.top+r.height/2}openMenu(x,y,false)});
 root.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'||!petHit(e.target))return;const x=e.clientX,y=e.clientY;clearTimeout(lp);lp=setTimeout(()=>{lpAt=Date.now();openMenu(x,y,true)},550);
  const stop=ev=>{if(ev.type==='pointermove'&&Math.hypot(ev.clientX-x,ev.clientY-y)<10)return;clearTimeout(lp);['pointermove','pointerup','pointercancel'].forEach(t=>root.removeEventListener(t,stop))};
  ['pointermove','pointerup','pointercancel'].forEach(t=>root.addEventListener(t,stop))});
 root.addEventListener('click',e=>{if(Date.now()-lpAt<800){e.stopPropagation();e.preventDefault()}},true);
 armIdle();
 root.addEventListener('click',e=>{
  const fb=e.target.closest('[data-faq]');if(fb){const f=FQ.find(x=>x.id===fb.dataset.faq);if(f)say(faqHtml(f));return}const db=e.target.closest('[data-doc]');if(db){const d=pool.find(x=>x.id===db.dataset.doc);if(d){const hit=d.id==='nhi-dentist-handbook-2026'&&policyHit();say(hit&&hit.status==='found'?policyImage(hit):'妳選的是這份手冊；點開即可查看內容：'+card(d))}return}const a=e.target.closest('.lc-doc');if(a&&opt.onOpen){e.preventDefault();const d=pool.find(x=>x.id===a.dataset.id);if(d)open(d);return}const q=e.target.closest('[data-q]');if(q)ask(q.dataset.q)});
 $('.lc-form').onsubmit=e=>{e.preventDefault();ask(input.value)};
 async function look(file){const city=clinicCity;if(!city){citySelect.focus();return}if(!file||!/^image\//.test(file.type))return;const url=URL.createObjectURL(file);say('<img class="lc-shot" src="'+url+'" alt="你傳的截圖">','user');
  const wait=say('我看一下畫面喔…'+(ocrWorker?'':'<br><small>第一次要下載辨識程式，大約 10～20 秒，之後就很快。圖片只在你的電腦上辨識，不會上傳。</small>'));
  let text='',how='';try{const r=await ocr(file);text=r.t;how=r.how}catch(e){countQuestion(city,'未分類');wait.innerHTML='喵…沒辦法辨識這張圖（可能是網路擋住了辨識程式）。可以直接打字告訴我畫面上的錯誤代碼或訊息。';return}
  if(how==='unclear'){countQuestion(city,'未分類');wait.innerHTML='我有看到錯誤視窗，但上面的數字看不清楚 😿<br>請直接<b>打出視窗上的錯誤代碼</b>（例如 5022），我再列出可能的主題讓你確認。';log.scrollTop=log.scrollHeight;return}
  const a=analyzeScreen(text);
  countQuestion(city,questionCategory(a.faqs[0]?.f,a.doc));
  if(!a.faqs.length&&!a.doc){wait.innerHTML='我看不出是哪個問題。可以直接輸入畫面上的錯誤代碼。'+supportHtml();return}
  const docs=a.doc?[{d:a.doc}]:[];
  wait.innerHTML=(how==='full'?'這張圖辨識得不太清楚，請特別核對下面的主題。':'我找到可能的主題，請先確認：')+choices(a.faqs,docs)+'<small class="lc-choice-hint">都不是？請直接輸入畫面上的錯誤代碼。</small>';log.scrollTop=log.scrollHeight}
 const fileIn=$('.lc-file');$('.lc-pic').onclick=()=>fileIn.click();fileIn.onchange=()=>{look(fileIn.files[0]);fileIn.value=''};
 root.addEventListener('paste',e=>{const it=[...(e.clipboardData||{}).items||[]].find(x=>x.type&&x.type.startsWith('image/'));if(it){e.preventDefault();look(it.getAsFile())}});
 panel.addEventListener('dragover',e=>{e.preventDefault();panel.classList.add('lc-drop')});panel.addEventListener('dragleave',()=>panel.classList.remove('lc-drop'));
 panel.addEventListener('drop',e=>{e.preventDefault();panel.classList.remove('lc-drop');const f=[...e.dataTransfer.files].find(x=>x.type.startsWith('image/'));if(f)look(f)});
 if(mode==='fab'){const fab=$('.lc-fab');const toggle=on=>{panel.hidden=!on;fab.setAttribute('aria-expanded',on);root.classList.toggle('lc-open',on);if(on)(clinicCity?input:citySelect).focus();else fab.focus()};fab.onclick=()=>toggle(panel.hidden);$('.lc-close').onclick=()=>toggle(false);root.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden)toggle(false)});root.close=()=>{if(!panel.hidden)toggle(false)}}
 if(SR){const mic=$('.lc-mic');let rec=null;mic.onclick=()=>{if(rec){rec.stop();return}rec=new SR();rec.lang='zh-TW';rec.interimResults=true;rec.maxAlternatives=1;let final='';mic.classList.add('on');mic.setAttribute('aria-label','停止語音');input.placeholder='請說話…';
  rec.onresult=ev=>{let t='';for(const r of ev.results){t+=r[0].transcript;if(r.isFinal)final=t}input.value=t};
  rec.onerror=ev=>{if(ev.error==='not-allowed')say('需要允許麥克風權限才能用語音喔。也可以直接打字。')};
  rec.onend=()=>{mic.classList.remove('on');mic.setAttribute('aria-label','用語音說');input.placeholder='輸入問題或文件代碼…';rec=null;if((final||input.value).trim())ask(final||input.value)};
  try{rec.start()}catch{rec=null;mic.classList.remove('on')}}}
 return root}
window.LeyanCat={mount,rank,rankFaq,analyzeScreen,_ocrPrep:{findDialog,prepCrop,popupCode}};
})();
