// 樂衍小黑貓：依文字或語音找出手冊並開啟。需先載入 manuals.js。
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
const lineOf=d=>LINES[(d.parent?documents.find(x=>x.id===d.parent):d).category]||{color:'#15191E'};
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
function popupCode(raw){
 const lines=String(raw).split(/\r?\n/);
 for(const line of lines){
  const m=line.match(/(?:^|[^\d])([0-9]{4})\s*[-－—]/);
  if(m&&KNOWN_CODES.has(m[1]))return m[1]
 }
 const codes=[...new Set((String(raw).match(/(^|\D)(\d{4})(?!\d)/g)||[]).map(x=>x.slice(-4)).filter(c=>KNOWN_CODES.has(c)))];
 return codes.length===1?codes[0]:''
}
async function ocr(file){const T=await loadOcr();if(!ocrWorker)ocrWorker=await T.createWorker(['chi_tra','eng']);
 const src=URL.createObjectURL(file);let img;
 try{img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src})}finally{URL.revokeObjectURL(src)}
 const scale=Math.min(3,Math.max(1,2000/img.width));const c=document.createElement('canvas');c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);const g=c.getContext('2d');g.imageSmoothingQuality='high';g.drawImage(img,0,0,c.width,c.height);
 // 常見系統彈窗位於畫面中央；先裁中間，避免背景病歷與列表蓋過錯誤碼。
 const center=document.createElement('canvas');center.width=Math.round(c.width*.7);center.height=Math.round(c.height*.42);
 center.getContext('2d').drawImage(c,c.width*.15,c.height*.28,c.width*.7,c.height*.42,0,0,center.width,center.height);
 const focused=(await ocrWorker.recognize(center)).data.text||'';
 const code=popupCode(focused);if(code)return code;
 const full=(await ocrWorker.recognize(c)).data.text||'';return full}
const prepared=pool.map(d=>({d,toks:[...new Set(d.keywords.split(/\s+/).map(norm).filter(t=>t.length>=2))],title:norm(d.title),bg:bigrams(norm(d.title+d.description+d.steps.join('')))}));
function rank(q){const n=norm(q);if(!n)return [];
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
const CAT='<svg class="lc-cat" viewBox="0 0 120 120" aria-hidden="true"><g class="lc-tail"><path d="M84 96c18-2 26-14 22-30-2-8-9-10-12-5" fill="none" stroke="#15191E" stroke-width="9" stroke-linecap="round"/></g><ellipse cx="58" cy="88" rx="30" ry="24" fill="#15191E"/><g class="lc-head-g"><path d="M30 44 34 18 50 34zM86 44 82 18 66 34z" fill="#15191E"/><path d="M35 38 37 26 45 34zM81 38 79 26 71 34z" fill="#E8A0A8"/><circle cx="58" cy="52" r="28" fill="#15191E"/><g class="lc-eyes"><ellipse cx="47" cy="52" rx="6.5" ry="7.5" fill="#F6C945"/><ellipse cx="69" cy="52" rx="6.5" ry="7.5" fill="#F6C945"/><ellipse cx="47" cy="53" rx="2.2" ry="5" fill="#15191E"/><ellipse cx="69" cy="53" rx="2.2" ry="5" fill="#15191E"/></g><path d="M55 63h6l-3 3z" fill="#E8A0A8"/><ellipse class="lc-mouth" cx="58" cy="70" rx="4" ry="3.2" fill="#7A2E3A"/><path d="M40 64 26 62M40 68 27 70M76 64l14-2M76 68l13 2" stroke="#8A9199" stroke-width="1.6" stroke-linecap="round"/></g><g class="lc-paw"><ellipse cx="70" cy="96" rx="7" ry="10" fill="#15191E" stroke="#5B6470" stroke-width="1.4"/><path d="M67 90v4M71 89v5" stroke="#5B6470" stroke-width="1.1" stroke-linecap="round"/></g><ellipse class="lc-tongue" cx="59" cy="70" rx="3" ry="4" fill="#E8708A"/><g class="lc-treat"><path d="M49 8c4-5 12-5 16 0-4 5-12 5-16 0zM65 8l7-4v8z" fill="#E9A15B"/><circle cx="53" cy="7" r="1.1" fill="#15191E"/></g></svg>';
const QUICK=['取到 02 卡號','讀卡機沒反應','PIN 碼鎖住','停電要怎麼關機','上傳無法夾帶檔案','手機看不到約診'];
function mount(root,opt){opt=opt||{};const mode=opt.mode||'page';
 const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
 root.classList.add('lc-root','lc-mode-'+mode);
 root.innerHTML=(mode==='fab'?'<button type="button" class="lc-fab" aria-expanded="false" aria-controls="lc-panel" aria-label="開啟小黑貓助手">'+CAT+'<span class="lc-fab-tip" aria-hidden="true">需要幫忙嗎？</span></button>':'')+
 '<section class="lc-panel" id="lc-panel" aria-label="小黑貓助手"'+(mode==='fab'?' hidden':'')+'>'+
 '<div class="lc-head">'+(mode==='page'?CAT:'')+'<div class="lc-bubble"><strong>喵～有什麼需要幫忙嗎？</strong><span>打字、用說的，或直接貼上錯誤畫面的截圖。</span></div>'+(mode==='fab'?'<button type="button" class="lc-close" aria-label="關閉助手">✕</button>':'')+'</div>'+
 '<div class="lc-log" role="log" aria-live="polite"></div>'+
 '<div class="lc-quick"><button type="button" class="lc-feedbtn" data-feed aria-label="餵小黑貓吃零食">🐟 餵零食</button>'+QUICK.map(q=>'<button type="button" data-q="'+esc(q)+'">'+esc(q)+'</button>').join('')+'</div>'+
 '<form class="lc-form"><label class="lc-sr" for="lc-input-'+mode+'">輸入你的問題</label><input id="lc-input-'+mode+'" class="lc-input" autocomplete="off" enterkeyhint="send" placeholder="輸入問題或站號…">'+
 '<button type="button" class="lc-pic" aria-label="傳截圖給小黑貓看"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="m21 17-5-5-8 7"/></svg></button><input type="file" accept="image/*" class="lc-file" hidden>'+(SR?'<button type="button" class="lc-mic" aria-label="用語音說"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg></button>':'')+
 '<button type="submit" class="lc-send">送出</button></form></section>';
 const $=s=>root.querySelector(s),log=$('.lc-log'),input=$('.lc-input'),panel=$('.lc-panel');
 function say(html,who){const el=document.createElement('div');el.className='lc-msg lc-'+(who||'bot');el.innerHTML=html;log.appendChild(el);log.scrollTop=log.scrollHeight;return el}
 function open(d){const url=urlOf(d);if(opt.onOpen){opt.onOpen(d,url);return true}const w=window.open(url,'leyan-manual');if(w){try{w.focus()}catch{}return true}return false}
 function card(d){const l=lineOf(d);return '<a class="lc-doc" href="'+urlOf(d)+'" target="leyan-manual" data-id="'+d.id+'"><span class="lc-code" style="background:'+l.color+'">'+codeOf(d)+'</span><span><b>'+esc(d.title)+'</b><small>'+esc(d.description)+'</small></span></a>'}
 function faqHtml(f){const g=FG.find(x=>x.id===f.group)||{color:'#15191E'},rel=f.doc&&pool.find(x=>x.id===f.doc);return '<div class="lc-faq" style="--c:'+g.color+'"><b>'+esc(f.title)+'</b>'+(f.text?'<p>'+esc(f.text)+'</p>':'')+(f.steps?'<ol>'+f.steps.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol>':'')+(f.img?'<a class="lc-img" href="'+BASE+'images/faq/'+f.img+'.png" target="_blank" rel="noopener"><img src="'+BASE+'images/faq/'+f.img+'.png" alt="'+esc(f.title)+' 圖卡"></a>':'')+'</div>'+(rel?'<p class="lc-alt">相關手冊：</p>'+card(rel):'')}
 function ask(q){q=q.trim();if(!q)return;say(esc(q),'user');input.value='';const r=rank(q),fr=rankFaq(q);
  if(fr.length&&(!r.length||(fr[0].score*1.2>=r[0].score&&r[0].score<100))){const more=fr.slice(1,3).filter(x=>x.score>=fr[0].score*0.7);say('喵～這個我知道：'+faqHtml(fr[0].f)+(more.length?'<p class="lc-alt">也可能是：</p>'+more.map(x=>'<button type="button" class="lc-faqbtn" data-faq="'+x.f.id+'">'+esc(x.f.title)+'</button>').join(''):''));return}
  if(!r.length){say('喵…我找不到相關的手冊。可以換個說法，或直接<a href="tel:0422518815,9">撥客服 04-2251-8815 分機 9</a>。');return}
  const top=r[0].d,alts=r.slice(1,3).filter(x=>x.score>=r[0].score*0.6).map(x=>x.d);
  const rf=fr.length&&fr[0].score>=r[0].score*0.5?fr[0].f:null;
  const m=say('找到了！幫你打開 <b>'+codeOf(top)+' '+esc(top.title)+'</b>'+card(top)+(alts.length?'<p class="lc-alt">不是這份？也可能是：</p>'+alts.map(card).join(''):'')+(rf?'<p class="lc-alt">相關排解：</p><button type="button" class="lc-faqbtn" data-faq="'+rf.id+'">'+esc(rf.title)+'</button>':''));
  setTimeout(()=>{if(!open(top))m.insertAdjacentHTML('beforeend','<p class="lc-alt">瀏覽器擋住了自動開啟，請點上面的手冊。</p>')},700)}
 // ---- 小黑貓互動：閒置時舔毛、餵零食 ----
 const motionOK=()=>!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
 let idleT=0,actT=0,acting='',lastTreat=-1;
 function endAct(){clearTimeout(actT);root.classList.remove('lc-licking','lc-feeding');acting=''}
 function armIdle(){clearTimeout(idleT);idleT=setTimeout(()=>{if(!root.isConnected)return;if(acting||document.hidden||!motionOK()){armIdle();return}
  acting='lick';root.classList.add('lc-licking');actT=setTimeout(()=>{endAct();armIdle()},2900)},10000+Math.random()*6000)}
 function wake(){if(acting==='lick')endAct();armIdle()}
 ['pointerdown','keydown','input'].forEach(ev=>root.addEventListener(ev,wake,true));
 const TREAT_SAYS=['喵～好吃！謝謝你','咕嚕咕嚕…這個零食超讚','吃飽了就有力氣幫你找手冊','喵嗚～再來一口也可以喔','好滿足～我繼續值班囉'];
 const feedBtn=$('.lc-feedbtn');
 function feed(){if(acting==='feed')return;endAct();acting='feed';feedBtn.disabled=true;
  let i;do{i=Math.floor(Math.random()*TREAT_SAYS.length)}while(i===lastTreat);lastTreat=i;
  if(motionOK())root.classList.add('lc-feeding');
  setTimeout(()=>say(esc(TREAT_SAYS[i])),motionOK()?1300:0);
  actT=setTimeout(()=>{endAct();feedBtn.disabled=false;armIdle()},motionOK()?2800:600)}
 armIdle();
 root.addEventListener('click',e=>{if(e.target.closest('[data-feed]')){feed();return}const fb=e.target.closest('.lc-faqbtn');if(fb){const f=FQ.find(x=>x.id===fb.dataset.faq);if(f)say(faqHtml(f));return}const a=e.target.closest('.lc-doc');if(a&&opt.onOpen){e.preventDefault();const d=pool.find(x=>x.id===a.dataset.id);if(d)open(d);return}const q=e.target.closest('[data-q]');if(q)ask(q.dataset.q)});
 $('.lc-form').onsubmit=e=>{e.preventDefault();ask(input.value)};
 async function look(file){if(!file||!/^image\//.test(file.type))return;const url=URL.createObjectURL(file);say('<img class="lc-shot" src="'+url+'" alt="你傳的截圖">','user');
  const wait=say('我看一下畫面喔…'+(ocrWorker?'':'<br><small>第一次要下載辨識程式，大約 10～20 秒，之後就很快。圖片只在你的電腦上辨識，不會上傳。</small>'));
  let text='';try{text=await ocr(file)}catch(e){wait.innerHTML='喵…沒辦法辨識這張圖（可能是網路擋住了辨識程式）。可以直接打字告訴我畫面上的錯誤代碼或訊息。';return}
  const a=analyzeScreen(text);
  if(!a.faqs.length&&!a.doc){wait.innerHTML='喵…我看不出是哪個問題。'+(a.lines.length?'我看到：<blockquote class="lc-quote">'+a.lines.map(esc).join('<br>')+'</blockquote>':'')+'可以打字告訴我錯誤代碼，或<a href="tel:0422518815,9">撥客服 04-2251-8815 分機 9</a>。';return}
  let h=(a.lines.length?'我在畫面上看到：<blockquote class="lc-quote">'+a.lines.map(esc).join('<br>')+'</blockquote>':'');
  if(a.faqs.length){h+='這是：'+faqHtml(a.faqs[0].f);if(a.faqs[1]&&a.faqs[1].score>=12)h+='<p class="lc-alt">畫面上也有：</p><button type="button" class="lc-faqbtn" data-faq="'+a.faqs[1].f.id+'">'+esc(a.faqs[1].f.title)+'</button>'}
  else h+='錯誤代碼 '+a.codes.join('、')+' 可以在這份手冊查到處理方式：'+card(a.doc);
  wait.innerHTML=h;log.scrollTop=log.scrollHeight}
 const fileIn=$('.lc-file');$('.lc-pic').onclick=()=>fileIn.click();fileIn.onchange=()=>{look(fileIn.files[0]);fileIn.value=''};
 root.addEventListener('paste',e=>{const it=[...(e.clipboardData||{}).items||[]].find(x=>x.type&&x.type.startsWith('image/'));if(it){e.preventDefault();look(it.getAsFile())}});
 panel.addEventListener('dragover',e=>{e.preventDefault();panel.classList.add('lc-drop')});panel.addEventListener('dragleave',()=>panel.classList.remove('lc-drop'));
 panel.addEventListener('drop',e=>{e.preventDefault();panel.classList.remove('lc-drop');const f=[...e.dataTransfer.files].find(x=>x.type.startsWith('image/'));if(f)look(f)});
 if(mode==='fab'){const fab=$('.lc-fab');const toggle=on=>{panel.hidden=!on;fab.setAttribute('aria-expanded',on);root.classList.toggle('lc-open',on);if(on)input.focus();else fab.focus()};fab.onclick=()=>toggle(panel.hidden);$('.lc-close').onclick=()=>toggle(false);root.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden)toggle(false)});root.close=()=>{if(!panel.hidden)toggle(false)}}
 if(SR){const mic=$('.lc-mic');let rec=null;mic.onclick=()=>{if(rec){rec.stop();return}rec=new SR();rec.lang='zh-TW';rec.interimResults=true;rec.maxAlternatives=1;let final='';mic.classList.add('on');mic.setAttribute('aria-label','停止語音');input.placeholder='請說話…';
  rec.onresult=ev=>{let t='';for(const r of ev.results){t+=r[0].transcript;if(r.isFinal)final=t}input.value=t};
  rec.onerror=ev=>{if(ev.error==='not-allowed')say('需要允許麥克風權限才能用語音喔。也可以直接打字。')};
  rec.onend=()=>{mic.classList.remove('on');mic.setAttribute('aria-label','用語音說');input.placeholder='輸入問題或站號…';rec=null;if((final||input.value).trim())ask(final||input.value)};
  try{rec.start()}catch{rec=null;mic.classList.remove('on')}}}
 return root}
window.LeyanCat={mount,rank,rankFaq,analyzeScreen};
})();
